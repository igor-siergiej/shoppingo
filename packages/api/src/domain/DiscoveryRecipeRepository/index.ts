import type { DiscoveryRecipe, DiscoverySource } from '@shoppingo/types';

/** System of record for the shared recipe library (`discoveryRecipes`). Personal recipes never pass through here. */
export interface DiscoveryRecipeRepository {
    ensureIndexes(): Promise<void>;
    getById(id: string): Promise<DiscoveryRecipe | null>;
    upsert(recipe: DiscoveryRecipe): Promise<void>;
    deleteById(id: string): Promise<void>;
    /** Id and source revision of every recipe from `source`: what a refresh diffs against, without loading the recipes. */
    listRevisions(
        source: DiscoverySource
    ): Promise<Array<Pick<DiscoveryRecipe, 'id' | 'sourceRevision' | 'createdAt'>>>;
    /** Every library recipe, in stable order, in batches — feeds a full reindex without loading the library at once. */
    batches(size: number): AsyncGenerator<DiscoveryRecipe[]>;
}
