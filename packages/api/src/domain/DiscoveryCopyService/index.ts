import type { Recipe, User } from '@shoppingo/types';

import type { DiscoveryService } from '../DiscoveryService';
import type { RecipeService } from '../RecipeService';

/**
 * Turns a library recipe into one of the caller's own recipes. The copy goes through `RecipeService.createRecipe`, so
 * ownership, tagging and `users` scoping are exactly those of any recipe the user creates; the library document is only
 * read. The copy keeps the source page as `link` and the licence `attribution`, which CC BY-SA requires.
 *
 * The library's `coverImageKey` is deliberately NOT carried over: a key owned by the library can be deleted by an
 * unpublish or refresh, so a personal recipe must never point at it. The copy starts without a cover and gets the
 * normal generated one.
 */
export class DiscoveryCopyService {
    constructor(
        private readonly discovery: Pick<DiscoveryService, 'getRecipe'>,
        private readonly recipes: Pick<RecipeService, 'createRecipe' | 'getRecipesByUserId'>
    ) {}

    async copyToPersonal(libraryId: string, owner: User): Promise<Recipe> {
        const library = await this.discovery.getRecipe(libraryId);

        // The page link is what ties a copy to its source, so the same page twice is a duplicate, not a second recipe.
        const mine = await this.recipes.getRecipesByUserId(owner.id);
        if (mine.some((recipe) => recipe.link === library.sourceUrl)) {
            throw Object.assign(new Error('This recipe is already in your recipes'), { status: 409 });
        }

        return this.recipes.createRecipe(
            library.title,
            library.ingredients,
            owner.id,
            owner,
            library.sourceUrl,
            library.instructions,
            // An explicit empty list: the default would share the copy with every friend.
            [],
            undefined,
            library.tags,
            library.prepTime,
            library.cookTime,
            library.servings,
            library.difficulty,
            library.attribution
        );
    }
}
