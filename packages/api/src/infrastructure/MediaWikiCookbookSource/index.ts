import type { Logger } from '@imapps/api-utils';

import type { WikibooksPage, WikibooksPageRef, WikibooksSource } from '../../domain/WikibooksIngest/types';

const API_URL = 'https://en.wikibooks.org/w/api.php';
/** Wikimedia asks API clients to identify themselves and a way to contact the operator. */
const DEFAULT_USER_AGENT = 'ShoppingoRecipeIngest/1.0 (https://shoppingo.imapps.uk; igorsiergiej@gmail.com)';
/** Every Cookbook recipe page transcludes this template; the Cookbook namespace is 102. */
const RECIPE_TEMPLATE = 'Template:Recipe';
const COOKBOOK_NAMESPACE = '102';
/** `prop=revisions` with content is capped at 50 pages per request. */
const CONTENT_BATCH_SIZE = 50;
const LIST_BATCH_SIZE = 500;
const MAX_ATTEMPTS = 4;
const MAX_LAG_SECONDS = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MIN_INTERVAL_MS = 500;
const DEFAULT_RETRY_SECONDS = 5;
const MAX_RETRY_SECONDS = 60;

type Params = Record<string, string>;

interface RevisionJson {
    revid?: number;
    slots?: { main?: { '*'?: string; content?: string } };
}

interface PageJson {
    pageid?: number;
    title?: string;
    missing?: unknown;
    revisions?: RevisionJson[];
}

interface ApiJson {
    error?: { code?: string; info?: string };
    continue?: Params;
    query?: { pages?: Record<string, PageJson> | PageJson[] };
}

export interface MediaWikiCookbookSourceOptions {
    userAgent?: string;
    minIntervalMs?: number;
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const asPages = (json: ApiJson): PageJson[] => {
    const pages = json.query?.pages;
    if (!pages) return [];
    return Array.isArray(pages) ? pages : Object.values(pages);
};

/**
 * The English Wikibooks Cookbook over the MediaWiki Action API. Requests are strictly serial with a pause between
 * them, send a descriptive User-Agent and `maxlag`, and back off on 429/5xx/maxlag, per Wikimedia API etiquette.
 */
export class MediaWikiCookbookSource implements WikibooksSource {
    private readonly userAgent: string;
    private readonly minIntervalMs: number;
    private readonly fetchImpl: typeof fetch;
    private readonly sleep: (ms: number) => Promise<void>;

    // Option defaults, one line each.
    // fallow-ignore-next-line complexity
    constructor(
        private readonly logger?: Logger,
        options: MediaWikiCookbookSourceOptions = {}
    ) {
        this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
        this.minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.sleep = options.sleep ?? defaultSleep;
    }

    // Paging loop plus one guarded field-by-field read per page.
    // fallow-ignore-next-line complexity
    async listRecipePages(): Promise<WikibooksPageRef[]> {
        const pages = new Map<number, WikibooksPageRef>();
        let cursor: Params = {};
        do {
            const json = await this.request({
                action: 'query',
                generator: 'embeddedin',
                geititle: RECIPE_TEMPLATE,
                geinamespace: COOKBOOK_NAMESPACE,
                geilimit: String(LIST_BATCH_SIZE),
                prop: 'revisions',
                rvprop: 'ids',
                ...cursor,
            });
            for (const page of asPages(json)) {
                const revisionId = page.revisions?.[0]?.revid;
                if (page.pageid !== undefined && page.title && revisionId !== undefined) {
                    pages.set(page.pageid, { pageId: page.pageid, title: page.title, revisionId });
                }
            }
            cursor = json.continue ?? {};
        } while (Object.keys(cursor).length > 0);
        return [...pages.values()];
    }

    // Batch loop with per-batch failure isolation and a guarded read per page.
    // fallow-ignore-next-line complexity
    async fetchPages(refs: WikibooksPageRef[]): Promise<WikibooksPage[]> {
        const fetched: WikibooksPage[] = [];
        for (let i = 0; i < refs.length; i += CONTENT_BATCH_SIZE) {
            const batch = refs.slice(i, i + CONTENT_BATCH_SIZE);
            try {
                const json = await this.request({
                    action: 'query',
                    prop: 'revisions',
                    rvprop: 'ids|content',
                    rvslots: 'main',
                    pageids: batch.map((ref) => ref.pageId).join('|'),
                });
                for (const page of asPages(json)) {
                    const revision = page.revisions?.[0];
                    const wikitext = revision?.slots?.main?.content ?? revision?.slots?.main?.['*'];
                    if (page.pageid !== undefined && page.title && revision?.revid !== undefined && wikitext) {
                        fetched.push({
                            pageId: page.pageid,
                            title: page.title,
                            revisionId: revision.revid,
                            wikitext,
                        });
                    }
                }
            } catch (error) {
                // One lost batch must not end the run: its pages are absent from the result and so retried next run.
                this.logger?.warn('Wikibooks content batch failed', {
                    pages: batch.length,
                    error: (error as Error).message,
                });
            }
        }
        return fetched;
    }

    // Retry loop: pacing, outcome check, bounded attempts.
    // fallow-ignore-next-line complexity
    private async request(params: Params): Promise<ApiJson> {
        const url = new URL(API_URL);
        const query = { format: 'json', formatversion: '2', maxlag: String(MAX_LAG_SECONDS), ...params };
        for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

        for (let attempt = 1; ; attempt += 1) {
            await this.sleep(this.minIntervalMs);
            const outcome = await this.send(url);
            if ('json' in outcome) return outcome.json;
            if (attempt >= MAX_ATTEMPTS)
                throw new Error(`Wikibooks API: ${outcome.reason} (gave up after ${attempt} attempts)`);
            await this.sleep(outcome.retryAfterSeconds * 1000);
        }
    }

    // One request: status classes, maxlag and error body, timeout; each is a distinct outcome.
    // fallow-ignore-next-line complexity
    private async send(url: URL): Promise<{ json: ApiJson } | { reason: string; retryAfterSeconds: number }> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await this.fetchImpl(url, {
                signal: controller.signal,
                headers: { 'User-Agent': this.userAgent, Accept: 'application/json', 'Accept-Encoding': 'gzip' },
            });
            const retryAfter = Math.min(
                Number(response.headers.get('retry-after')) || DEFAULT_RETRY_SECONDS,
                MAX_RETRY_SECONDS
            );
            if (response.status === 429 || response.status >= 500) {
                return { reason: `HTTP ${response.status}`, retryAfterSeconds: retryAfter };
            }
            if (!response.ok) throw new Error(`Wikibooks API: HTTP ${response.status}`);

            const json = (await response.json()) as ApiJson;
            if (json.error?.code === 'maxlag') return { reason: 'replica lag (maxlag)', retryAfterSeconds: retryAfter };
            if (json.error) throw new Error(`Wikibooks API error ${json.error.code}: ${json.error.info}`);
            return { json };
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                return { reason: 'request timed out', retryAfterSeconds: DEFAULT_RETRY_SECONDS };
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }
}
