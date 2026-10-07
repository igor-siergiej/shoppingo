import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { createDiscoveryHandlers } from '../interfaces/DiscoveryHandlers';
import { generateFriendCode, getFriends, redeemFriendCode, removeFriend } from '../interfaces/FriendHandlers';
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
import { getVapidPublicKey, subscribe, unsubscribe } from '../interfaces/PushHandlers';
import { createRealtimeHandlers } from '../interfaces/RealtimeHandlers';
import {
    addUserToRecipe,
    createRecipe,
    deleteRecipe,
    generateRecipeImage,
    getRecipe,
    getRecipes,
    importRecipe,
    importRecipeImage,
    removeUserFromRecipe,
    revertRecipeImage,
    setCoverImageKey,
    suggestIngredientSubstitutes,
    updateRecipe,
    uploadRecipeImage,
} from '../interfaces/RecipeHandlers';
import { completeTodo, createTodo, deleteTodo, getTodos, updateTodo } from '../interfaces/TodoHandlers';
import { authenticate } from '../middleware/auth';
import { notifyListChanged } from '../middleware/notifyListChanged';

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
    const hub = dependencyContainer.resolve(DependencyToken.ListRealtimeHub);
    const listService = dependencyContainer.resolve(DependencyToken.ListService);
    const { issueListSocketTicket, connectListSocket } = createRealtimeHandlers({
        hub,
        tickets: dependencyContainer.resolve(DependencyToken.WsTicketStore),
        getList: (listTitle) => listService.getList(listTitle),
    });
    const changed = notifyListChanged(hub);
    const removedMember = notifyListChanged(hub, (c, listTitle) => hub.kick(listTitle, c.req.param('userId') ?? ''));

    router.delete('/api/lists/:title', authenticate, changed, deleteList);
    router.post('/api/lists/:title', authenticate, changed, updateList);
    router.put('/api/lists', authenticate, addList);
    router.put('/api/lists/:title/items/bulk', authenticate, changed, addItems);
    router.put('/api/lists/:title/items', authenticate, changed, addItem);
    router.post('/api/lists/:title/items/:itemId', authenticate, changed, updateItem);
    router.delete('/api/lists/:title/items/:itemId', authenticate, changed, deleteItem);
    router.delete('/api/lists/:title/clear', authenticate, changed, clearList);
    router.delete('/api/lists/:title/clearSelected', authenticate, changed, deleteSelected);
    router.post('/api/lists/:title/users', authenticate, changed, addUserToList);
    router.delete('/api/lists/:title/users/:userId', authenticate, removedMember, removeUserFromList);

    router.post('/api/lists/:title/socket-ticket', authenticate, issueListSocketTicket);
    router.get('/api/ws/lists/:title', connectListSocket);

    const conditionalImageAuth = async (c: Context<Vars>, next: Next) => {
        const name = c.req.param('name');
        if (name.startsWith('recipe-upload/')) {
            return authenticate(c, next);
        }
        return next();
    };

    router.get('/api/image/:name', conditionalImageAuth, getImage);

    router.get('/api/recipes', authenticate, getRecipes);
    router.post('/api/recipes/import', authenticate, importRecipe);
    router.post('/api/recipes/substitutes', authenticate, suggestIngredientSubstitutes);
    router.get('/api/recipes/import/image', authenticate, importRecipeImage);
    router.put('/api/recipes', authenticate, createRecipe);
    router.get('/api/recipes/:recipeId', authenticate, getRecipe);
    router.put('/api/recipes/:recipeId', authenticate, updateRecipe);
    router.delete('/api/recipes/:recipeId', authenticate, deleteRecipe);
    router.post('/api/recipes/:recipeId/users', authenticate, addUserToRecipe);
    router.delete('/api/recipes/:recipeId/users/:targetUserId', authenticate, removeUserFromRecipe);
    router.put('/api/recipes/:recipeId/image', authenticate, setCoverImageKey);
    router.post('/api/recipes/:recipeId/image/upload', authenticate, uploadRecipeImage);
    router.post('/api/recipes/:recipeId/image/generate', authenticate, generateRecipeImage);
    router.post('/api/recipes/:recipeId/image/revert', authenticate, revertRecipeImage);

    const discovery = createDiscoveryHandlers(
        dependencyContainer.resolve(DependencyToken.DiscoveryService),
        dependencyContainer.resolve(DependencyToken.Logger)
    );
    router.get('/api/discover/recipes', authenticate, discovery.searchRecipes);
    router.get('/api/discover/recipes/:id/similar', authenticate, discovery.getSimilarRecipes);
    router.get('/api/discover/recipes/:id', authenticate, discovery.getRecipe);

    router.get('/api/todos', authenticate, getTodos);
    router.put('/api/todos', authenticate, createTodo);
    router.post('/api/todos/:id', authenticate, updateTodo);
    router.delete('/api/todos/:id', authenticate, deleteTodo);
    router.post('/api/todos/:id/complete', authenticate, completeTodo);

    router.get('/api/labels', authenticate, getLabels);
    router.put('/api/labels', authenticate, createLabel);
    router.post('/api/labels/:id', authenticate, updateLabel);
    router.delete('/api/labels/:id', authenticate, deleteLabel);

    router.post('/api/friends/code', authenticate, generateFriendCode);
    router.post('/api/friends/redeem', authenticate, redeemFriendCode);
    router.get('/api/friends', authenticate, getFriends);
    router.delete('/api/friends/:friendId', authenticate, removeFriend);

    router.get('/api/push/vapid-public-key', getVapidPublicKey);
    router.post('/api/push/subscribe', authenticate, subscribe);
    router.delete('/api/push/subscribe', authenticate, unsubscribe);

    return router;
};
