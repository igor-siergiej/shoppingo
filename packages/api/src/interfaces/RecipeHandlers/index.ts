import { APIError } from '@imapps/api-utils/hono';
import type { Ingredient, Recipe } from '@shoppingo/types';
import type { Context } from 'hono';
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { RecipeImportService } from '../../domain/RecipeImportService';
import type { RecipeService } from '../../domain/RecipeService';
import { withImageExtension } from '../../infrastructure/objectKey';
import type { HonoVars } from '../handlerUtils';

interface HttpError {
    status?: number;
    [key: string]: unknown;
}

const getRecipeService = (): RecipeService => dependencyContainer.resolve(DependencyToken.RecipeService);
const getRecipeImportService = (): RecipeImportService =>
    dependencyContainer.resolve(DependencyToken.RecipeImportService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);
const getBucketStore = () => dependencyContainer.resolve(DependencyToken.ImageStore);

const getAuthenticatedUser = (c: Context<HonoVars>): { id: string; username: string } | null => {
    const user = c.get('user');
    return user?.id ? user : null;
};

/** Normalise an unknown error, log it, and rethrow as an APIError. */
const failWithApiError = (error: unknown, logMessage: string, fields: Record<string, unknown>): never => {
    const e = (error ?? {}) as { message?: string; status?: number };
    const message = e.message || 'Internal Server Error';
    const status = e.status ?? 500;
    getLogger().error(logMessage, { ...fields, error: message, status });
    throw new APIError(message, status);
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
    const { title, ingredients, link, instructions, selectedUsers, id } = await c.req.json<{
        title: string;
        ingredients: Ingredient[];
        link?: string;
        instructions?: string[];
        selectedUsers?: string[];
        id?: string;
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
            selectedUsers,
            id
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

export const importRecipe = async (c: Context<HonoVars>): Promise<Response> => {
    const { url } = await c.req.json<{ url?: string }>();
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized recipe import attempt', { ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!url || typeof url !== 'string' || url.trim() === '') {
        return c.json({ error: 'url is required and must be a non-empty string' }, 400);
    }

    try {
        const draft = await getRecipeImportService().importFromUrl(url.trim());

        logger.info('API: Recipe imported from URL', {
            userId: authenticatedUser.id,
            link: draft.link,
            ingredientCount: draft.ingredients.length,
            instructionCount: draft.instructions.length,
        });

        return c.json(draft, 200);
    } catch (error: unknown) {
        return failWithApiError(error, 'API: Failed to import recipe from URL', {
            userId: authenticatedUser.id,
            url,
        });
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
    const { friendId } = await c.req.json<{ friendId: string }>();
    const logger = getLogger();
    const authenticatedUser = getAuthenticatedUser(c);

    if (!authenticatedUser) {
        logger.warn('Unauthorized user addition attempt', { recipeId, ip: c.req.header('x-forwarded-for') });
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!friendId || typeof friendId !== 'string' || friendId.trim() === '') {
        return c.json({ error: 'friendId is required' }, 400);
    }

    try {
        const hasAccess = await verifyRecipeAccess(recipeId, authenticatedUser);
        if (!hasAccess) {
            logger.warn('Unauthorized user addition attempt', { authenticatedUserId: authenticatedUser.id, recipeId });
            return c.json({ error: 'Forbidden' }, 403);
        }

        const recipe = await getRecipeService().addUserToRecipe(recipeId, friendId.trim(), authenticatedUser.id);

        logger.info('API: User added to recipe', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            recipeId,
            addedUser: friendId,
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
            addedUser: friendId,
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
        // Versioned key so each upload is a distinct, immutable URL (avoids stale browser cache).
        // Extension derived from the uploaded file's type so the stored object is correctly identified.
        const imageKey = withImageExtension(
            `recipe-upload/${authenticatedUser.id}/${recipeId}/${Date.now()}`,
            mimeType
        );

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

// Shared scaffolding for image actions that only need auth + access check around a single service call.
const handleRecipeImageAction = async (
    c: Context<HonoVars>,
    failVerb: string,
    successLog: string,
    action: (recipeId: string, user: { id: string; username: string }) => Promise<Recipe>
): Promise<Response> => {
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

        const recipe = await action(recipeId, authenticatedUser);

        logger.info(`API: ${successLog}`, { userId: authenticatedUser.id, recipeId });

        return c.json(recipe, 200);
    } catch (error: unknown) {
        return failWithApiError(error, `API: Failed to ${failVerb}`, { userId: authenticatedUser.id, recipeId });
    }
};

export const revertRecipeImage = (c: Context<HonoVars>): Promise<Response> =>
    handleRecipeImageAction(c, 'revert recipe image', 'Recipe cover reverted to AI image', (recipeId, user) =>
        getRecipeService().revertToAiImage(recipeId, user.id)
    );

export const generateRecipeImage = (c: Context<HonoVars>): Promise<Response> =>
    handleRecipeImageAction(c, 'generate recipe image', 'Recipe image generated', (recipeId, user) =>
        getRecipeService().regenerateImage(recipeId, user.id)
    );
