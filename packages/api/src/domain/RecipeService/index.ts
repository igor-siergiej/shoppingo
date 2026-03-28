import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Ingredient, Recipe, User } from '@shoppingo/types';
import { AuthorizationService } from '../AuthorizationService';
import type { RecipeImageService } from '../RecipeImageService';
import type { RecipeRepository } from '../RecipeRepository';

export class RecipeService {
    private readonly authorizationService: AuthorizationService;

    constructor(
        private recipeRepository: RecipeRepository,
        private idGenerator: IdGenerator,
        private logger?: Logger,
        authorizationService?: AuthorizationService,
        private recipeImageService?: RecipeImageService
    ) {
        this.authorizationService = authorizationService ?? new AuthorizationService();
    }

    async createRecipe(
        title: string,
        ingredients: Ingredient[],
        ownerId: string,
        owner: User,
        link?: string,
        instructions?: string[]
    ): Promise<Recipe> {
        try {
            const recipe: Recipe = {
                id: this.idGenerator.generate(),
                title,
                ingredients: ingredients.map((ing) => ({
                    ...ing,
                    id: this.idGenerator.generate(),
                })),
                ownerId,
                users: [owner],
                dateAdded: new Date(),
                ...(link !== undefined && { link }),
                ...(instructions !== undefined && { instructions }),
            };
            const created = await this.recipeRepository.insert(recipe);
            this.logger?.info('Recipe created', {
                recipeId: created.id,
                recipeTitle: title,
                owner: owner.username,
                ingredientCount: created.ingredients.length,
            });
            void this.enrichRecipeImage(created.id, title, ingredients);
            return created;
        } catch (error) {
            this.logger?.error('Failed to create recipe', {
                recipeTitle: title,
                owner: owner.username,
                error,
            });
            throw error;
        }
    }

    async getRecipe(recipeId: string): Promise<Recipe> {
        const recipe = await this.recipeRepository.getById(recipeId);
        if (!recipe) {
            const error = new Error('Recipe not found');
            Object.assign(error, { status: 404 });
            throw error;
        }
        return recipe;
    }

    async getRecipesByUserId(userId: string): Promise<Recipe[]> {
        return this.recipeRepository.findByUserId(userId);
    }

    async updateRecipe(
        recipeId: string,
        title: string,
        ingredients: Ingredient[],
        ownerId: string,
        link?: string,
        instructions?: string[]
    ): Promise<Recipe> {
        try {
            const recipe = await this.getRecipe(recipeId);
            if (!this.authorizationService.isListOwner(recipe, ownerId)) {
                const error = new Error('Only recipe owner can update');
                Object.assign(error, { status: 403 });
                throw error;
            }
            recipe.title = title;
            recipe.ingredients = ingredients.map((ing) => ({
                ...ing,
                id: ing.id || this.idGenerator.generate(),
            }));
            recipe.link = link;
            recipe.instructions = instructions;
            const updated = await this.recipeRepository.update(recipeId, recipe);
            this.logger?.info('Recipe updated', {
                recipeId,
                recipeTitle: title,
                ingredientCount: updated.ingredients.length,
            });
            return updated;
        } catch (error) {
            this.logger?.error('Failed to update recipe', {
                recipeId,
                recipeTitle: title,
                error,
            });
            throw error;
        }
    }

    async deleteRecipe(recipeId: string, userId: string): Promise<void> {
        try {
            const recipe = await this.getRecipe(recipeId);
            if (!this.authorizationService.isListOwner(recipe, userId)) {
                const error = new Error('Only recipe owner can delete');
                Object.assign(error, { status: 403 });
                throw error;
            }
            await this.recipeRepository.deleteById(recipeId);
            this.logger?.info('Recipe deleted', {
                recipeId,
                recipeTitle: recipe.title,
            });
        } catch (error) {
            this.logger?.error('Failed to delete recipe', {
                recipeId,
                error,
            });
            throw error;
        }
    }

    async addUserToRecipe(recipeId: string, user: User, ownerId: string): Promise<Recipe> {
        try {
            const recipe = await this.getRecipe(recipeId);
            if (!this.authorizationService.canManageUsers(recipe, ownerId)) {
                const error = new Error('Only recipe owner can add users');
                Object.assign(error, { status: 403 });
                throw error;
            }
            if (recipe.users.some((u) => u.id === user.id)) {
                const error = new Error('User is already in this recipe');
                Object.assign(error, { status: 400 });
                throw error;
            }
            const updated = await this.recipeRepository.addUser(recipeId, user);
            this.logger?.info('User added to recipe', {
                recipeId,
                addedUser: user.username,
                addedBy: ownerId,
            });
            return updated;
        } catch (error) {
            this.logger?.error('Failed to add user to recipe', {
                recipeId,
                user: (error as { user?: User })?.user?.username,
                error,
            });
            throw error;
        }
    }

    async removeUserFromRecipe(recipeId: string, userId: string, ownerId: string): Promise<Recipe> {
        try {
            const recipe = await this.getRecipe(recipeId);
            if (!this.authorizationService.canManageUsers(recipe, ownerId)) {
                const error = new Error('Only recipe owner can remove users');
                Object.assign(error, { status: 403 });
                throw error;
            }
            if (userId === recipe.ownerId) {
                const error = new Error('Cannot remove recipe owner');
                Object.assign(error, { status: 400 });
                throw error;
            }
            if (recipe.users.length === 1) {
                const error = new Error('Cannot remove last user');
                Object.assign(error, { status: 400 });
                throw error;
            }
            const updated = await this.recipeRepository.removeUser(recipeId, userId);
            this.logger?.info('User removed from recipe', {
                recipeId,
                removedUserId: userId,
                removedBy: ownerId,
            });
            return updated;
        } catch (error) {
            this.logger?.error('Failed to remove user from recipe', {
                recipeId,
                userId,
                error,
            });
            throw error;
        }
    }

    private async enrichRecipeImage(recipeId: string, title: string, ingredients: Ingredient[]): Promise<void> {
        if (!this.recipeImageService) return;
        try {
            const key = await this.recipeImageService.generateRecipeImage(recipeId, title, ingredients);
            await this.recipeRepository.setCoverImageKey(recipeId, key);
            this.logger?.info('Recipe image enrichment complete', { recipeId, key });
        } catch (error) {
            this.logger?.error('Recipe image enrichment failed', { recipeId, error });
        }
    }

    async setCoverImageKey(recipeId: string, coverImageKey: string, userId: string): Promise<Recipe> {
        try {
            const recipe = await this.getRecipe(recipeId);
            if (!this.authorizationService.isListOwner(recipe, userId)) {
                const error = new Error('Only recipe owner can update image');
                Object.assign(error, { status: 403 });
                throw error;
            }
            recipe.coverImageKey = coverImageKey;
            const updated = await this.recipeRepository.update(recipeId, recipe);
            this.logger?.info('Recipe cover image updated', {
                recipeId,
                coverImageKey,
            });
            return updated;
        } catch (error) {
            this.logger?.error('Failed to update recipe cover image', {
                recipeId,
                error,
            });
            throw error;
        }
    }
}
