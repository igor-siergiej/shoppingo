import type { DiscoveryRecipe } from '@shoppingo/types';

/** System of record for the shared recipe library (`discoveryRecipes`). Personal recipes never pass through here. */
export interface DiscoveryRecipeRepository {
    ensureIndexes(): Promise<void>;
    getById(id: string): Promise<DiscoveryRecipe | null>;
    upsert(recipe: DiscoveryRecipe): Promise<void>;
    deleteById(id: string): Promise<void>;
    /** Every library recipe, in stable order, in batches — feeds a full reindex without loading the library at once. */
    batches(size: number): AsyncGenerator<DiscoveryRecipe[]>;
}
