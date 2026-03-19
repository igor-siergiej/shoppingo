import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { RecipeService } from '../../domain/RecipeService';
import type { Ingredient } from '@shoppingo/types';

interface HttpError {
    status?: number;
    [key: string]: unknown;
}

const getRecipeService = (): RecipeService => dependencyContainer.resolve(DependencyToken.RecipeService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

// Helper to extract authenticated user from context
const getAuthenticatedUser = (ctx: Context): { id: string; username: string } | null => {
    const user = ctx.state.user as { id: string; username: string } | undefined;
    return user && user.id ? user : null;
};

// Helper to verify user has access to a recipe
const verifyRecipeAccess = async (
    recipeId: string,
    authenticatedUser: { id: string; username: string },
    _ctx: Context
): Promise<boolean> => {
    try {
        const recipe = await getRecipeService().getRecipe(recipeId);
        return recipe.users?.some((u: { id: string; username: string }) => u.id === authenticatedUser.id) || false;
    } catch {
        return false;
    }
};

export const getRecipes = async (ctx: Context): Promise<void> => {
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipes access attempt', {
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        const recipes = await getRecipeService().getRecipesByUserId(authenticatedUser.id);

        logger.info('API: Recipes retrieved', {
            userId: authenticatedUser.id,
            recipeCount: recipes.length,
        });

        ctx.status = 200;
        ctx.body = recipes;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to retrieve recipes', {
            userId: authenticatedUser.id,
            error: err.message,
        });

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const getRecipe = async (ctx: Context): Promise<void> => {
    const { recipeId } = ctx.params as { recipeId: string };
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe access attempt', {
            recipeId,
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Verify user has access to this recipe
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized recipe access attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const recipe = await getRecipeService().getRecipe(recipeId);

        logger.info('API: Recipe retrieved', {
            userId: authenticatedUser.id,
            recipeId,
        });

        ctx.status = 200;
        ctx.body = recipe;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to retrieve recipe', {
            userId: authenticatedUser.id,
            recipeId,
            error: err.message,
        });

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const createRecipe = async (ctx: Context): Promise<void> => {
    const { title, ingredients } = ctx.request.body as {
        title: string;
        ingredients: Ingredient[];
    };
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe creation attempt', {
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'Title is required and must be a non-empty string' };
        return;
    }

    if (!ingredients || !Array.isArray(ingredients)) {
        ctx.status = 400;
        ctx.body = { error: 'Ingredients is required and must be an array' };
        return;
    }

    try {
        const recipe = await getRecipeService().createRecipe(title, ingredients, authenticatedUser.id, authenticatedUser);

        logger.info('API: Recipe created', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeTitle: title,
            ingredientCount: ingredients.length,
        });

        ctx.status = 201;
        ctx.body = recipe;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to create recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeTitle: title,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};

export const updateRecipe = async (ctx: Context): Promise<void> => {
    const { recipeId } = ctx.params as { recipeId: string };
    const { title, ingredients } = ctx.request.body as {
        title: string;
        ingredients: Ingredient[];
    };
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe update attempt', {
            recipeId,
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Verify user has access to this recipe
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized recipe update attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const recipe = await getRecipeService().updateRecipe(recipeId, title, ingredients, authenticatedUser.id);

        logger.info('API: Recipe updated', {
            userId: authenticatedUser.id,
            recipeId,
            recipeTitle: title,
        });

        ctx.status = 200;
        ctx.body = recipe;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to update recipe', {
            userId: authenticatedUser.id,
            recipeId,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};

export const deleteRecipe = async (ctx: Context): Promise<void> => {
    const { recipeId } = ctx.params as { recipeId: string };
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe deletion attempt', {
            recipeId,
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Verify user has access to this recipe
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized recipe deletion attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        await getRecipeService().deleteRecipe(recipeId, authenticatedUser.id);

        logger.info('API: Recipe deleted', {
            userId: authenticatedUser.id,
            recipeId,
        });

        ctx.status = 204;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to delete recipe', {
            userId: authenticatedUser.id,
            recipeId,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};

export const addUserToRecipe = async (ctx: Context): Promise<void> => {
    const { recipeId } = ctx.params as { recipeId: string };
    const { user } = ctx.request.body as { user: { id: string; username: string } };
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized user addition attempt', {
            recipeId,
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    if (!user || typeof user !== 'object' || !user.id || !user.username) {
        ctx.status = 400;
        ctx.body = { error: 'User object with id and username is required' };
        return;
    }

    try {
        // Verify user has access to this recipe
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized user addition attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const recipe = await getRecipeService().addUserToRecipe(recipeId, user, authenticatedUser.id);

        logger.info('API: User added to recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeId,
            addedUserId: user.id,
            addedUsername: user.username,
        });

        ctx.status = 200;
        ctx.body = recipe;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to add user to recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeId,
            addedUserId: user?.id,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};

export const removeUserFromRecipe = async (ctx: Context): Promise<void> => {
    const { recipeId, targetUserId } = ctx.params as { recipeId: string; targetUserId: string };
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized user removal attempt', {
            recipeId,
            targetUserId,
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Verify user has access to this recipe
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized user removal attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
                targetUserId,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const recipe = await getRecipeService().removeUserFromRecipe(recipeId, targetUserId, authenticatedUser.id);

        logger.info('API: User removed from recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeId,
            removedUserId: targetUserId,
        });

        ctx.status = 200;
        ctx.body = recipe;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to remove user from recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeId,
            removedUserId: targetUserId,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};

export const setCoverImageKey = async (ctx: Context): Promise<void> => {
    const { recipeId } = ctx.params as { recipeId: string };
    const { coverImageKey } = ctx.request.body as { coverImageKey: string };
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
        logger.warn('Unauthorized cover image update attempt', {
            recipeId,
            ip: ctx.ip,
        });
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    if (!coverImageKey || typeof coverImageKey !== 'string' || coverImageKey.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'coverImageKey is required and must be a non-empty string' };
        return;
    }

    try {
        // Verify user has access to this recipe
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized cover image update attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const recipe = await getRecipeService().setCoverImageKey(recipeId, coverImageKey, authenticatedUser.id);

        logger.info('API: Recipe cover image updated', {
            userId: authenticatedUser.id,
            recipeId,
            coverImageKey,
        });

        ctx.status = 200;
        ctx.body = recipe;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to set recipe cover image', {
            userId: authenticatedUser.id,
            recipeId,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};
