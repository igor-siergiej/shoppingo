import Router from 'koa-router';

import { getImage } from '../interfaces/ImageHandlers';
import * as listHandlers from '../interfaces/ListHandlers';

const router = new Router();

router.get('/api/health', async (ctx) => {
    ctx.status = 200;
    ctx.body = { status: 'healthy', service: 'shoppingo-api', timestamp: new Date().toISOString() };
});

router.get('/api/lists/title/:title', listHandlers.getList);
router.get('/api/lists/user/:userId', listHandlers.getLists);
router.delete('/api/lists/:title', listHandlers.deleteList);
router.post('/api/lists/:title', listHandlers.updateList);
router.put('/api/lists', listHandlers.addList);
router.put('/api/lists/:title/items', listHandlers.addItem);
router.post('/api/lists/:title/items/:itemName', listHandlers.updateItem);
router.delete('/api/lists/:title/items/:itemName', listHandlers.deleteItem);
router.delete('/api/lists/:title/clear', listHandlers.clearList);
router.delete('/api/lists/:title/clearSelected', listHandlers.deleteSelected);
router.get('/api/image/:name', getImage);

export default router;
