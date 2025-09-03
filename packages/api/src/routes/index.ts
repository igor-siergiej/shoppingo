import Router from 'koa-router';

import addItem from './addItem';
import addList from './addList';
import clearList from './clearList';
import deleteSelected from './deleteChecked';
import deleteItem from './deleteItem';
import deleteList from './deleteList';
import getImage from './getImage';
import getList from './getList';
import getLists from './getLists';
import updateItem from './updateItem';
import updateList from './updateList';

const router = new Router();

router.get('/health', async (ctx) => {
    ctx.status = 200;
    ctx.body = { status: 'healthy', service: 'shoppingo-api', timestamp: new Date().toISOString() };
});

router.get('/api/lists/title/:title', getList);
router.get('/api/lists/user/:userId', getLists);
router.delete('/api/lists/:title', deleteList);
router.post('/api/lists/:title', updateList);
router.put('/api/lists', addList);
router.put('/api/lists/:title/items', addItem);
router.post('/api/lists/:title/items/:itemName', updateItem);
router.delete('/api/lists/:title/items/:itemName', deleteItem);
router.delete('/api/lists/:title/clear', clearList);
router.delete('/api/lists/:title/clearSelected', deleteSelected);
router.get('/api/image/:name', getImage);

export default router;
