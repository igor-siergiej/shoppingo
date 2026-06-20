import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { getImage } from '../interfaces/ImageHandlers';
import { createLabel, deleteLabel, getLabels, updateLabel } from '../interfaces/LabelHandlers';
import {
    addItem,
    addItems,
    addList,
    addUserToList,
    clearList,
    deleteItem,
    deleteList,
    deleteSelected,
    getList,
    getLists,
    removeUserFromList,
    updateItem,
    updateList,
} from '../interfaces/ListHandlers';
import { receiveLogs } from '../interfaces/LogHandlers';
import {
    addUserToRecipe,
    createRecipe,
    deleteRecipe,
    generateRecipeImage,
    getRecipe,
    getRecipes,
    removeUserFromRecipe,
    setCoverImageKey,
    updateRecipe,
    uploadRecipeImage,
} from '../interfaces/RecipeHandlers';
import { completeTodo, createTodo, deleteTodo, getTodos, updateTodo } from '../interfaces/TodoHandlers';
import { authenticate } from '../middleware/auth';

type Vars = { Variables: { user: { id: string; username: string } } };

export const createRoutes = (): Hono<Vars> => {
    const router = new Hono<Vars>();

    router.get('/api/health', (c) =>
        c.json(
            {
                status: 'healthy',
                service: 'shoppingo-api',
                timestamp: new Date().toISOString(),
            },
            200
        )
    );

    router.post('/api/logs', receiveLogs);

    router.get('/api/lists/title/:title', authenticate, getList);
    router.get('/api/lists/user/:userId', authenticate, getLists);
    router.delete('/api/lists/:title', authenticate, deleteList);
    router.post('/api/lists/:title', authenticate, updateList);
    router.put('/api/lists', authenticate, addList);
    router.put('/api/lists/:title/items/bulk', authenticate, addItems);
    router.put('/api/lists/:title/items', authenticate, addItem);
    router.post('/api/lists/:title/items/:itemName', authenticate, updateItem);
    router.delete('/api/lists/:title/items/:itemName', authenticate, deleteItem);
    router.delete('/api/lists/:title/clear', authenticate, clearList);
    router.delete('/api/lists/:title/clearSelected', authenticate, deleteSelected);
    router.post('/api/lists/:title/users', authenticate, addUserToList);
    router.delete('/api/lists/:title/users/:userId', authenticate, removeUserFromList);

    const conditionalImageAuth = async (c: Context<Vars>, next: Next) => {
        const name = c.req.param('name');
        if (name.startsWith('recipe-upload/')) {
            return authenticate(c, next);
        }
        return next();
    };

    router.get('/api/image/:name', conditionalImageAuth, getImage);

    router.get('/api/recipes', authenticate, getRecipes);
    router.put('/api/recipes', authenticate, createRecipe);
    router.get('/api/recipes/:recipeId', authenticate, getRecipe);
    router.put('/api/recipes/:recipeId', authenticate, updateRecipe);
    router.delete('/api/recipes/:recipeId', authenticate, deleteRecipe);
    router.post('/api/recipes/:recipeId/users', authenticate, addUserToRecipe);
    router.delete('/api/recipes/:recipeId/users/:targetUserId', authenticate, removeUserFromRecipe);
    router.put('/api/recipes/:recipeId/image', authenticate, setCoverImageKey);
    router.post('/api/recipes/:recipeId/image/upload', authenticate, uploadRecipeImage);
    router.post('/api/recipes/:recipeId/image/generate', authenticate, generateRecipeImage);

    router.get('/api/todos', authenticate, getTodos);
    router.put('/api/todos', authenticate, createTodo);
    router.post('/api/todos/:id', authenticate, updateTodo);
    router.delete('/api/todos/:id', authenticate, deleteTodo);
    router.post('/api/todos/:id/complete', authenticate, completeTodo);

    router.get('/api/labels', authenticate, getLabels);
    router.put('/api/labels', authenticate, createLabel);
    router.post('/api/labels/:id', authenticate, updateLabel);
    router.delete('/api/labels/:id', authenticate, deleteLabel);

    return router;
};
