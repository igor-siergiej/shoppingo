import { describe, expect, it, vi } from 'bun:test';

import { MediaWikiCookbookSource } from './index';

const json = (body: unknown, init: ResponseInit = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

const setup = (responses: Array<Response | Error>) => {
    const queue = [...responses];
    const calls: URL[] = [];
    const headers: Array<Record<string, string>> = [];
    const fetchImpl = vi.fn(async (input: URL | string, init?: RequestInit) => {
        calls.push(new URL(String(input)));
        headers.push(init?.headers as Record<string, string>);
        const next = queue.shift();
        if (next instanceof Error) throw next;
        if (!next) throw new Error('unexpected request');
        return next;
    });
    const sleep = vi.fn(async (_ms: number) => {});
    const source = new MediaWikiCookbookSource(undefined, { fetchImpl: fetchImpl as never, sleep, minIntervalMs: 250 });
    return { source, calls, headers, sleep };
};

const listPage = (pages: Array<[number, string, number]>, cont?: Record<string, string>) =>
    json({
        ...(cont && { continue: cont }),
        query: {
            pages: pages.map(([pageid, title, revid]) => ({ pageid, title, revisions: [{ revid }] })),
        },
    });

describe('MediaWikiCookbookSource', () => {
    it('lists recipe pages across continuation batches, de-duplicated, with their revisions', async () => {
        const { source, calls } = setup([
            listPage([[1, 'Cookbook:A', 10]], { geicontinue: '102|2', continue: 'gei||' }),
            listPage([
                [1, 'Cookbook:A', 10],
                [2, 'Cookbook:B', 20],
            ]),
        ]);

        const pages = await source.listRecipePages();

        expect(pages).toEqual([
            { pageId: 1, title: 'Cookbook:A', revisionId: 10 },
            { pageId: 2, title: 'Cookbook:B', revisionId: 20 },
        ]);
        expect(calls[0]?.searchParams.get('geititle')).toBe('Template:Recipe');
        expect(calls[0]?.searchParams.get('geinamespace')).toBe('102');
        // The second request must carry the continuation token from the first.
        expect(calls[1]?.searchParams.get('geicontinue')).toBe('102|2');
    });

    it('identifies itself, asks to be shed under replica lag and paces every request', async () => {
        const { source, calls, headers, sleep } = setup([listPage([])]);

        await source.listRecipePages();

        expect(headers[0]?.['User-Agent']).toContain('Shoppingo');
        expect(calls[0]?.searchParams.get('maxlag')).toBe('5');
        expect(sleep).toHaveBeenCalledWith(250);
    });

    it('backs off for Retry-After on 429 and on maxlag, then succeeds', async () => {
        const { source, sleep } = setup([
            new Response('slow down', { status: 429, headers: { 'retry-after': '7' } }),
            json(
                { error: { code: 'maxlag', info: 'Waiting for a database server' } },
                { headers: { 'retry-after': '3' } }
            ),
            listPage([[1, 'Cookbook:A', 10]]),
        ]);

        const pages = await source.listRecipePages();

        expect(pages).toHaveLength(1);
        expect(sleep).toHaveBeenCalledWith(7000);
        expect(sleep).toHaveBeenCalledWith(3000);
    });

    it('throws rather than returning a partial listing when the API keeps failing', async () => {
        const { source } = setup(Array.from({ length: 4 }, () => new Response('down', { status: 503 })));
        await expect(source.listRecipePages()).rejects.toThrow('gave up');
    });

    it('fetches content in batches of 50 and omits a batch that fails instead of throwing', async () => {
        const refs = Array.from({ length: 60 }, (_, i) => ({
            pageId: i + 1,
            title: `Cookbook:R${i + 1}`,
            revisionId: 1,
        }));
        const { source, calls } = setup([
            json({
                query: {
                    pages: refs.slice(0, 50).map((r) => ({
                        pageid: r.pageId,
                        title: r.title,
                        revisions: [{ revid: 5, slots: { main: { content: `text ${r.pageId}` } } }],
                    })),
                },
            }),
            new Response('boom', { status: 500 }),
            new Response('boom', { status: 500 }),
            new Response('boom', { status: 500 }),
            new Response('boom', { status: 500 }),
        ]);

        const pages = await source.fetchPages(refs);

        expect(pages).toHaveLength(50);
        expect(pages[0]).toEqual({ pageId: 1, title: 'Cookbook:R1', revisionId: 5, wikitext: 'text 1' });
        expect(calls[0]?.searchParams.get('pageids')?.split('|')).toHaveLength(50);
        expect(calls[1]?.searchParams.get('pageids')?.split('|')).toHaveLength(10);
    });
});
