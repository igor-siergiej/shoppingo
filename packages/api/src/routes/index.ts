import type { Context, Next } from 'koa';
import Router from 'koa-router';
import { getImage } from '../interfaces/ImageHandlers';
import * as listHandlers from '../interfaces/ListHandlers';
import { receiveLogs } from '../interfaces/LogHandlers';
import * as recipeHandlers from '../interfaces/RecipeHandlers';
import { authenticate } from '../middleware/auth';

const router = new Router();

// Public endpoint - health checks
router.get('/api/health', async (ctx) => {
    ctx.status = 200;
    ctx.body = {
        status: 'healthy',
        service: 'shoppingo-api',
        timestamp: new Date().toISOString(),
    };
});

// Logs endpoint - public to allow logging even when unauthenticated (e.g., during failed login)
router.post('/api/logs', receiveLogs);

router.get('/api/lists/title/:title', authenticate, listHandlers.getList);
router.get('/api/lists/user/:userId', authenticate, listHandlers.getLists);
router.delete('/api/lists/:title', authenticate, listHandlers.deleteList);
router.post('/api/lists/:title', authenticate, listHandlers.updateList);
router.put('/api/lists', authenticate, listHandlers.addList);
router.put('/api/lists/:title/items/bulk', authenticate, listHandlers.addItems);
router.put('/api/lists/:title/items', authenticate, listHandlers.addItem);
router.post('/api/lists/:title/items/:itemName', authenticate, listHandlers.updateItem);
router.delete('/api/lists/:title/items/:itemName', authenticate, listHandlers.deleteItem);
router.delete('/api/lists/:title/clear', authenticate, listHandlers.clearList);
router.delete('/api/lists/:title/clearSelected', authenticate, listHandlers.deleteSelected);
router.post('/api/lists/:title/users', authenticate, listHandlers.addUserToList);
router.delete('/api/lists/:title/users/:userId', authenticate, listHandlers.removeUserFromList);

// Conditional auth for images: stored images need auth, AI images don't
const conditionalImageAuth = async (ctx: Context, next: Next) => {
    const { name } = ctx.params as { name: string };
    // Only require auth for stored images (contain /)
    if (name.includes('/')) {
        return authenticate(ctx, next);
    }
    return next();
};

router.get('/api/image/:name', conditionalImageAuth, getImage);

// Recipes
router.get('/api/recipes', authenticate, (ctx) => recipeHandlers.getRecipes(ctx));
router.put('/api/recipes', authenticate, (ctx) => recipeHandlers.createRecipe(ctx));
router.get('/api/recipes/:recipeId', authenticate, (ctx) => recipeHandlers.getRecipe(ctx));
router.put('/api/recipes/:recipeId', authenticate, (ctx) => recipeHandlers.updateRecipe(ctx));
router.delete('/api/recipes/:recipeId', authenticate, (ctx) => recipeHandlers.deleteRecipe(ctx));
router.post('/api/recipes/:recipeId/users', authenticate, (ctx) => recipeHandlers.addUserToRecipe(ctx));
router.delete('/api/recipes/:recipeId/users/:targetUserId', authenticate, (ctx) =>
    recipeHandlers.removeUserFromRecipe(ctx)
);
router.put('/api/recipes/:recipeId/image', authenticate, (ctx) => recipeHandlers.setCoverImageKey(ctx));
router.post('/api/recipes/:recipeId/image/upload', authenticate, (ctx) => recipeHandlers.uploadRecipeImage(ctx));

export default router;
