import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Ingredient, Recipe, User } from '@shoppingo/types';
import { AuthorizationService } from '../AuthorizationService';
import type { FriendService } from '../FriendService';
import type { RecipeImageService } from '../RecipeImageService';
import type { RecipeRepository } from '../RecipeRepository';

interface AuthClient {
    getUsersByUsernames(usernames: Array<string>): Promise<Array<User>>;
}

export class RecipeService {
    private readonly authorizationService: AuthorizationService;

    constructor(
        private recipeRepository: RecipeRepository,
        private idGenerator: IdGenerator,
        private logger?: Logger,
        authorizationService?: AuthorizationService,
        private recipeImageService?: RecipeImageService,
        private readonly _auth?: AuthClient,
        private readonly friendService?: FriendService
    ) {
        this.authorizationService = authorizationService ?? new AuthorizationService();
    }

    /** Seeds shared members: owner plus all current friends by default, or an explicit friend subset (403 on non-friends). */
    private async resolveSharedUsers(
        title: string,
        owner: User,
        selectedFriendIds?: Array<string>
    ): Promise<Array<User>> {
        if (!this.friendService) {
            return [owner];
        }

        const friends = await this.friendService.listFriends(owner.id);

        if (selectedFriendIds === undefined) {
            this.logger?.info('Recipe auto-shared with friends', {
                recipeTitle: title,
                owner: owner.username,
                sharedWithCount: friends.length,
            });

            return [owner, ...friends];
        }

        const allowedFriendIds = new Set(friends.map((f) => f.id));

        for (const friendId of selectedFriendIds) {
            if (!allowedFriendIds.has(friendId)) {
                throw Object.assign(new Error('Can only share with friends'), { status: 403 });
            }
        }

        const sharedWith = friends.filter((f) => selectedFriendIds.includes(f.id));

        this.logger?.info('Recipe shared with selected friends', {
            recipeTitle: title,
            owner: owner.username,
            sharedWithCount: sharedWith.length,
        });

        return [owner, ...sharedWith];
    }

    async createRecipe(
        title: string,
        ingredients: Ingredient[],
        ownerId: string,
        owner: User,
        link?: string,
        instructions?: string[],
        selectedUsers?: string[],
        id?: string
    ): Promise<Recipe> {
        try {
            if (id) {
                const existing = await this.recipeRepository.getById(id);
                if (existing && existing.ownerId === ownerId) {
                    return existing; // idempotent replay
                }
            }
            const users = await this.resolveSharedUsers(title, owner, selectedUsers);
            const recipe: Recipe = {
                id: id ?? this.idGenerator.generate(),
                title,
                ingredients: ingredients.map((ing) => ({
                    ...ing,
                    id: this.idGenerator.generate(),
                })),
                ownerId,
                users,
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

    /**
     * Add a friend to an existing recipe
     * Only the recipe owner can add users, and only friends of the owner can be added
     */
    async addUserToRecipe(recipeId: string, friendId: string, requestingUserId: string): Promise<Recipe> {
        const recipe = await this.getRecipe(recipeId);

        // Authorization: only owner can add users
        if (!this.authorizationService.canManageUsers(recipe, requestingUserId)) {
            throw Object.assign(new Error('Only recipe owner can add users'), { status: 403 });
        }

        // Validate friendship by id
        if (!this.friendService || !(await this.friendService.areFriends(requestingUserId, friendId))) {
            throw Object.assign(new Error('Can only share with friends'), { status: 403 });
        }

        // Check if user is already in the recipe
        if (recipe.users.some((u) => u.id === friendId)) {
            throw Object.assign(new Error('User is already in this recipe'), { status: 400 });
        }

        const [friend] = (await this.friendService.listFriends(requestingUserId)).filter((f) => f.id === friendId);

        const updated = await this.recipeRepository.addUser(recipeId, friend);
        this.logger?.info('User added to recipe', {
            recipeId,
            addedUser: friend.username,
            addedBy: requestingUserId,
        });
        return updated;
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

    async regenerateImage(recipeId: string, userId: string): Promise<Recipe> {
        if (!this.recipeImageService) {
            const error = new Error('Image service not configured');
            Object.assign(error, { status: 503 });
            throw error;
        }
        const recipe = await this.getRecipe(recipeId);
        if (!this.authorizationService.isListOwner(recipe, userId)) {
            const error = new Error('Only recipe owner can regenerate image');
            Object.assign(error, { status: 403 });
            throw error;
        }
        // Generate at most once per recipe. If an AI image already exists, this is a no-op
        // (no paid API call); reverting the cover to it is handled by revertToAiImage.
        if (recipe.aiImageKey) {
            return recipe;
        }
        const key = await this.recipeImageService.generateRecipeImage(recipeId, recipe.title, recipe.ingredients);
        recipe.aiImageKey = key;
        recipe.coverImageKey = key;
        return this.recipeRepository.update(recipeId, recipe);
    }

    /** Point the cover back at the already-generated AI image. No generation, no API cost. */
    async revertToAiImage(recipeId: string, userId: string): Promise<Recipe> {
        const recipe = await this.getRecipe(recipeId);
        if (!this.authorizationService.isListOwner(recipe, userId)) {
            const error = new Error('Only recipe owner can update image');
            Object.assign(error, { status: 403 });
            throw error;
        }
        // Backfill: legacy recipes stored the AI image under coverImageKey with no aiImageKey.
        const aiKey =
            recipe.aiImageKey ?? (recipe.coverImageKey?.startsWith('recipe-image/') ? recipe.coverImageKey : undefined);
        if (!aiKey) {
            const error = new Error('No AI image available to revert to');
            Object.assign(error, { status: 400 });
            throw error;
        }
        recipe.aiImageKey = aiKey;
        recipe.coverImageKey = aiKey;
        return this.recipeRepository.update(recipeId, recipe);
    }

    async setCoverImageKey(recipeId: string, coverImageKey: string, userId: string): Promise<Recipe> {
        try {
            const recipe = await this.getRecipe(recipeId);
            if (!this.authorizationService.isListOwner(recipe, userId)) {
                const error = new Error('Only recipe owner can update image');
                Object.assign(error, { status: 403 });
                throw error;
            }
            // Preserve a legacy AI image key (stored only in coverImageKey) before it is overwritten,
            // so the cover can later be reverted to it for free.
            if (!recipe.aiImageKey && recipe.coverImageKey?.startsWith('recipe-image/')) {
                recipe.aiImageKey = recipe.coverImageKey;
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
