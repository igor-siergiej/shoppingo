import type { Logger } from '@imapps/api-utils';
import type { DiscoveryEstimatedField, DiscoveryRecipe, DiscoverySource } from '@shoppingo/types';

import type { IdGenerator } from '../IdGenerator';
import type { IngredientStructurer } from '../IngredientStructurer/types';
import {
    attributionFor,
    cleanCategory,
    mapDifficulty,
    pageUrl,
    parseServings,
    parseTimes,
    recipeIdFor,
    recipeTitle,
    WIKIBOOKS_LICENCE,
} from './mapping';
import type {
    IngestSummary,
    RecipeEstimate,
    RecipeEstimator,
    RecipeTagger,
    WikibooksPage,
    WikibooksPageRef,
    WikibooksSource,
} from './types';
import { parseWikibooksPage } from './wikitext';

/** The slice of `DiscoveryService` the ingest needs: the shared write path plus the refresh diff. */
export interface DiscoveryWriter {
    save(recipe: DiscoveryRecipe): Promise<void>;
    remove(id: string): Promise<void>;
    listRevisions(
        source: DiscoverySource
    ): Promise<Array<Pick<DiscoveryRecipe, 'id' | 'sourceRevision' | 'createdAt'>>>;
}

export interface IngestOptions {
    /** Process at most this many new or changed pages (a trial run); unchanged pages never count. */
    limit?: number;
}

/** Pages are fetched, enriched and saved in chunks so an interrupted run keeps what it finished. */
const CHUNK_SIZE = 50;
const ENRICH_CONCURRENCY = 4;
/** A refresh that would delete more than this share of the library is a broken listing, not a real change. */
const MAX_REMOVAL_SHARE = 0.2;

type PageOutcome = 'created' | 'updated' | 'skipped';

const unique = (values: string[]): string[] => [
    ...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)),
];

const runPool = async <T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> => {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const item = items[next];
            next += 1;
            await work(item as T);
        }
    };
    await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
};

/**
 * Builds the Wikibooks half of the discovery library. Everything is keyed by the wiki page id and stamped with the
 * revision it was built from, so running it again only reprocesses pages that changed and is otherwise a no-op.
 */
export class WikibooksIngestService {
    constructor(
        private readonly source: WikibooksSource,
        private readonly discovery: DiscoveryWriter,
        private readonly structurer: IngredientStructurer,
        private readonly tagger: RecipeTagger,
        private readonly estimator: RecipeEstimator,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger
    ) {}

    // Invoked by the ingest script via the DI container; fallow can't trace that indirection.
    // fallow-ignore-next-line unused-class-member
    async run(options: IngestOptions = {}): Promise<IngestSummary> {
        // A listing that throws aborts here, before anything is written or removed.
        const refs = await this.source.listRecipePages();
        const stored = new Map((await this.discovery.listRevisions('wikibooks')).map((row) => [row.id, row]));

        const changed = refs.filter((ref) => stored.get(recipeIdFor(ref.pageId))?.sourceRevision !== ref.revisionId);
        const todo = options.limit === undefined ? changed : changed.slice(0, options.limit);

        const summary: IngestSummary = {
            listed: refs.length,
            unchanged: refs.length - changed.length,
            created: 0,
            updated: 0,
            removed: 0,
            skipped: 0,
            failed: 0,
            removalsBlocked: 0,
        };
        // Ids that must survive pruning: every listed page not being (re)processed now. Pages that fail below are
        // added too, so a bad fetch never deletes the copy we already have.
        const todoIds = new Set(todo.map((ref) => recipeIdFor(ref.pageId)));
        const keep = new Set(refs.map((ref) => recipeIdFor(ref.pageId)).filter((id) => !todoIds.has(id)));

        for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
            await this.processChunk(todo.slice(i, i + CHUNK_SIZE), stored, summary, keep);
        }

        await this.prune(stored, keep, summary);
        this.logger?.info('Wikibooks ingest finished', { ...summary });
        return summary;
    }

    private async processChunk(
        chunk: WikibooksPageRef[],
        stored: Map<string, { createdAt: Date }>,
        summary: IngestSummary,
        keep: Set<string>
    ): Promise<void> {
        const pages = await this.source.fetchPages(chunk);
        const fetched = new Set(pages.map((page) => page.pageId));
        for (const ref of chunk) {
            if (!fetched.has(ref.pageId)) {
                summary.failed += 1;
                keep.add(recipeIdFor(ref.pageId));
            }
        }

        await runPool(pages, ENRICH_CONCURRENCY, async (page) => {
            const id = recipeIdFor(page.pageId);
            try {
                const outcome = await this.ingestPage(page, stored.get(id)?.createdAt);
                if (outcome === 'skipped') {
                    summary.skipped += 1;
                } else {
                    summary[outcome] += 1;
                    keep.add(id);
                }
            } catch (error) {
                summary.failed += 1;
                keep.add(id);
                this.logger?.warn('Wikibooks recipe failed, will retry next run', {
                    title: page.title,
                    error: (error as Error).message,
                });
            }
        });
    }

    private async ingestPage(page: WikibooksPage, createdAt: Date | undefined): Promise<PageOutcome> {
        const recipe = await this.buildRecipe(page, createdAt);
        if (!recipe) return 'skipped';
        await this.discovery.save(recipe);
        return createdAt ? 'updated' : 'created';
    }

    /** Deletes library recipes whose page is gone or no longer a recipe, unless that would gut the library. */
    private async prune(stored: Map<string, unknown>, keep: Set<string>, summary: IngestSummary): Promise<void> {
        const stale = [...stored.keys()].filter((id) => !keep.has(id));
        if (stale.length === 0) return;
        if (stale.length > stored.size * MAX_REMOVAL_SHARE) {
            summary.removalsBlocked = stale.length;
            this.logger?.error('Refusing to remove an implausible share of the library; check the Wikibooks listing', {
                stale: stale.length,
                stored: stored.size,
            });
            return;
        }
        for (const id of stale) {
            await this.discovery.remove(id);
            summary.removed += 1;
        }
    }

    // Maps every source field, then fills only what the source left out.
    // fallow-ignore-next-line complexity
    private async buildRecipe(page: WikibooksPage, createdAt: Date | undefined): Promise<DiscoveryRecipe | null> {
        const parsed = parseWikibooksPage(page.wikitext);
        if (!parsed) return null;

        const { infobox } = parsed;
        const title = recipeTitle(page.title);
        const structured = await this.structurer.structure(parsed.ingredientLines);
        const ingredients = structured.map((ingredient) => ({ ...ingredient, id: this.idGenerator.generate() }));

        const { prepTime, cookTime } = parseTimes(infobox.time);
        let servings = parseServings(infobox.servings ?? infobox.serves);
        let difficulty = mapDifficulty(infobox.difficulty ?? infobox.rating);
        let prep = prepTime;
        let cook = cookTime;

        // A single total lands in cookTime, so prepTime is only estimated when no time at all was given.
        const wanted: DiscoveryEstimatedField[] = [];
        if (prep === undefined && cook === undefined) wanted.push('prepTime', 'cookTime');
        else if (cook === undefined) wanted.push('cookTime');
        if (servings === undefined) wanted.push('servings');
        if (difficulty === undefined) wanted.push('difficulty');

        const [generatedTags, estimate] = await Promise.all([
            this.tagger.generateTags(title, ingredients, parsed.instructions),
            wanted.length > 0
                ? this.estimator.estimate({ title, ingredients, instructions: parsed.instructions }, wanted)
                : Promise.resolve<RecipeEstimate>({}),
        ]);

        const tags = unique([cleanCategory(infobox.category) ?? '', ...generatedTags]);
        if (tags.length === 0) throw new Error('no tags from the page category or the tagger');

        const estimated: DiscoveryEstimatedField[] = [];
        const take = <T>(field: DiscoveryEstimatedField, value: T | undefined): T | undefined => {
            if (value === undefined || !wanted.includes(field)) return undefined;
            estimated.push(field);
            return value;
        };
        prep = prep ?? take('prepTime', estimate.prepTime);
        cook = cook ?? take('cookTime', estimate.cookTime);
        servings = servings ?? take('servings', estimate.servings);
        difficulty = difficulty ?? take('difficulty', estimate.difficulty);

        const now = new Date();
        return {
            id: recipeIdFor(page.pageId),
            title,
            ingredients,
            instructions: parsed.instructions,
            tags,
            ...(prep !== undefined && { prepTime: prep }),
            ...(cook !== undefined && { cookTime: cook }),
            ...(servings !== undefined && { servings }),
            ...(difficulty !== undefined && { difficulty }),
            source: 'wikibooks',
            sourceUrl: pageUrl(page.title),
            licence: WIKIBOOKS_LICENCE,
            attribution: attributionFor(page.title),
            ...(estimated.length > 0 && { estimated }),
            sourceRevision: page.revisionId,
            createdAt: createdAt ?? now,
            updatedAt: now,
        };
    }
}
