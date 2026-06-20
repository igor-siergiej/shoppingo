import { APIError } from '@imapps/api-utils/hono';
import type { Ingredient } from '@shoppingo/types';
import type { Context } from 'hono';
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { RecipeService } from '../../domain/RecipeService';
import type { HonoVars } from '../handlerUtils';

interface HttpError {
    status?: number;
    [key: string]: unknown;
}

const getRecipeService = (): RecipeService => dependencyContainer.resolve(DependencyToken.RecipeService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);
const getBucketStore = () => dependencyContainer.resolve(DependencyToken.ImageStore);

const getAuthenticatedUser = (c: Context<HonoVars>): { id: string; username: string } | null => {
    const user = c.get('user');
    return user?.id ? user : null;
};

const verifyRecipeAccess = async (
    recipeId: string,
    authenticatedUser: { id: string; username: string }
): Promise<boolean> => {
    try {
        const recipe = await getRecipeService().getRecipe(recipeId);
        return recipe.users?.some((u: { id: string; username: string }) => u.id === authenticatedUser.id) || false;
    } catch {
        return false;
    }
};

export const getRecipes = async (c: Context<HonoVars>): Promise<Response> => {
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipes access attempt', { ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const recipes = await getRecipeService().getRecipesByUserId(authenticatedUser.id);
        logger.info('API: Recipes retrieved', { userId: authenticatedUser.id, recipeCount: recipes.length });
        return c.json(recipes, 200);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        logger.error('API: Failed to retrieve recipes', { userId: authenticatedUser.id, error: err.message });
        throw new APIError(err.message ?? 'Internal Server Error', err.status ?? 500);
    }
};

export const getRecipe = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe access attempt', { recipeId, ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized recipe access attempt', { authenticatedUserId: authenticatedUser.id, recipeId });
            return c.json({ error: 'Forbidden' }, 403);
        }

        const recipe = await getRecipeService().getRecipe(recipeId);
        logger.info('API: Recipe retrieved', { userId: authenticatedUser.id, recipeId });
        return c.json(recipe, 200);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        logger.error('API: Failed to retrieve recipe', { userId: authenticatedUser.id, recipeId, error: err.message });
        throw new APIError(err.message ?? 'Internal Server Error', err.status ?? 500);
    }
};

export const createRecipe = async (c: Context<HonoVars>): Promise<Response> => {
    const { title, ingredients, link, instructions, selectedUsers } = await c.req.json<{
        title: string;
        ingredients: Ingredient[];
        link?: string;
        instructions?: string[];
        selectedUsers?: string[];
    }>();
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe creation attempt', { ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
        return c.json({ error: 'Title is required and must be a non-empty string' }, 400);
    }

    if (!ingredients || !Array.isArray(ingredients)) {
        return c.json({ error: 'Ingredients is required and must be an array' }, 400);
    }

    try {
        const recipe = await getRecipeService().createRecipe(
            title,
            ingredients,
            authenticatedUser.id,
            authenticatedUser,
            link,
            instructions,
            selectedUsers
        );

        logger.info('API: Recipe created', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeTitle: title,
            ingredientCount: ingredients.length,
        });

        return c.json(recipe, 201);
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
        throw new APIError(errorMessage, status);
    }
};

export const updateRecipe = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const { title, ingredients, link, instructions } = await c.req.json<{
        title: string;
        ingredients: Ingredient[];
        link?: string;
        instructions?: string[];
    }>();
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe update attempt', { recipeId, ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized recipe update attempt', { authenticatedUserId: authenticatedUser.id, recipeId });
            return c.json({ error: 'Forbidden' }, 403);
        }

        const recipe = await getRecipeService().updateRecipe(
            recipeId,
            title,
            ingredients,
            authenticatedUser.id,
            link,
            instructions
        );

        logger.info('API: Recipe updated', { userId: authenticatedUser.id, recipeId, recipeTitle: title });

        return c.json(recipe, 200);
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
        throw new APIError(errorMessage, status);
    }
};

export const deleteRecipe = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe deletion attempt', { recipeId, ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized recipe deletion attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            return c.json({ error: 'Forbidden' }, 403);
        }

        await getRecipeService().deleteRecipe(recipeId, authenticatedUser.id);
        logger.info('API: Recipe deleted', { userId: authenticatedUser.id, recipeId });
        return new Response(null, { status: 204 });
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
        throw new APIError(errorMessage, status);
    }
};

export const addUserToRecipe = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const { user } = await c.req.json<{ user: { id: string; username: string } }>();
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized user addition attempt', { recipeId, ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!user || typeof user !== 'object' || !user.id || !user.username) {
        return c.json({ error: 'User object with id and username is required' }, 400);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized user addition attempt', { authenticatedUserId: authenticatedUser.id, recipeId });
            return c.json({ error: 'Forbidden' }, 403);
        }

        const recipe = await getRecipeService().addUserToRecipe(recipeId, user, authenticatedUser.id);

        logger.info('API: User added to recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeId,
            addedUserId: user.id,
            addedUsername: user.username,
        });

        return c.json(recipe, 200);
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
        throw new APIError(errorMessage, status);
    }
};

export const removeUserFromRecipe = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const targetUserId = c.req.param('targetUserId');
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized user removal attempt', {
            recipeId,
            targetUserId,
            ip: c.req.header('x-forwarded-for'),
        });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized user removal attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
                targetUserId,
            });
            return c.json({ error: 'Forbidden' }, 403);
        }

        const recipe = await getRecipeService().removeUserFromRecipe(recipeId, targetUserId, authenticatedUser.id);

        logger.info('API: User removed from recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeId,
            removedUserId: targetUserId,
        });

        return c.json(recipe, 200);
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
        throw new APIError(errorMessage, status);
    }
};

export const setCoverImageKey = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const { imageKey } = await c.req.json<{ imageKey: string }>();
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized cover image update attempt', { recipeId, ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!imageKey || typeof imageKey !== 'string' || imageKey.trim() === '') {
        return c.json({ error: 'imageKey is required and must be a non-empty string' }, 400);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized cover image update attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            return c.json({ error: 'Forbidden' }, 403);
        }

        const recipe = await getRecipeService().setCoverImageKey(recipeId, imageKey, authenticatedUser.id);

        logger.info('API: Recipe cover image updated', { userId: authenticatedUser.id, recipeId, imageKey });

        return c.json(recipe, 200);
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
        throw new APIError(errorMessage, status);
    }
};

export const uploadRecipeImage = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe image upload attempt', { recipeId, ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized recipe image upload attempt', {
                authenticatedUserId: authenticatedUser.id,
                recipeId,
            });
            return c.json({ error: 'Forbidden' }, 403);
        }

        const body = await c.req.parseBody();
        const imageFile = body.image;

        if (!imageFile) {
            return c.json({ error: 'No image file provided' }, 400);
        }

        if (!(imageFile instanceof File)) {
            return c.json({ error: 'No image file provided' }, 400);
        }

        const mimeType = imageFile.type;
        if (!mimeType?.startsWith('image/')) {
            return c.json({ error: 'File must be an image' }, 400);
        }

        const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
        const imageKey = `recipe-upload/${authenticatedUser.id}/${recipeId}`;

        const bucketStore = getBucketStore();
        await bucketStore.putObject(imageKey, fileBuffer, { contentType: mimeType });

        const recipe = await getRecipeService().setCoverImageKey(recipeId, imageKey, authenticatedUser.id);

        logger.info('API: Recipe image uploaded', { userId: authenticatedUser.id, recipeId, imageKey });

        return c.json({ imageKey, recipe }, 200);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';
        logger.error('API: Failed to upload recipe image', {
            userId: authenticatedUser.id,
            recipeId,
            error: errorMessage,
            status,
        });
        throw new APIError(errorMessage, status);
    }
};

export const generateRecipeImage = async (c: Context<HonoVars>): Promise<Response> => {
    const recipeId = c.req.param('recipeId');
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const recipe = await getRecipeService().regenerateImage(recipeId, authenticatedUser.id);

        logger.info('API: Recipe image generated', { userId: authenticatedUser.id, recipeId });

        return c.json(recipe, 200);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';
        logger.error('API: Failed to generate recipe image', {
            userId: authenticatedUser.id,
            recipeId,
            error: errorMessage,
            status,
        });
        throw new APIError(errorMessage, status);
    }
};
