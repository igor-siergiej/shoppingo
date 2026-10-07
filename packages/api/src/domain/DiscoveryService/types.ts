import type {
    DiscoveryRecipe,
    DiscoveryRecipeSummary,
    DiscoverySearchQuery,
    DiscoverySearchResult,
} from '@shoppingo/types';

/** A search query after validation: defaults applied, every list present, paging bounded. */
export type NormalizedDiscoveryQuery = Required<
    Pick<DiscoverySearchQuery, 'tags' | 'ingredients' | 'difficulty' | 'source'>
> &
    Pick<DiscoverySearchQuery, 'q' | 'minTime' | 'maxTime'> & { page: number; pageSize: number };

/**
 * Derived, rebuildable search index over the library. Holds nothing that is not in Mongo; implementations
 * throw an error with `status: 503` when the engine cannot be reached.
 */
export interface DiscoveryIndex {
    /** Idempotent: creates the index with its mapping when it does not exist yet. */
    ensureIndex(): Promise<void>;
    index(recipe: DiscoveryRecipe): Promise<void>;
    remove(id: string): Promise<void>;
    search(query: NormalizedDiscoveryQuery): Promise<DiscoverySearchResult>;
    similar(id: string, limit: number): Promise<DiscoveryRecipeSummary[]>;
    /** Builds a fresh index from the batches, swaps it in atomically and drops the old one. Returns the document count. */
    rebuild(batches: AsyncIterable<DiscoveryRecipe[]>): Promise<number>;
}
