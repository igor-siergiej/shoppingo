import type { Route } from '@playwright/test';
import { type Item, ListType } from '@shoppingo/types';
import { makeItem, makeList } from '../data/lists';
import type { MockState } from './index';

const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json' as const,
    body: JSON.stringify(body),
});

export async function handleListRoute(route: Route, path: string, method: string, state: MockState): Promise<boolean> {
    // GET /api/lists/user/:userId
    if (/^\/api\/lists\/user\/[^/]+$/.test(path) && method === 'GET') {
        await route.fulfill(json(state.lists));
        return true;
    }

    // GET /api/lists/title/:title
    const titleMatch = path.match(/^\/api\/lists\/title\/([^/]+)$/);
    if (titleMatch && method === 'GET') {
        const title = decodeURIComponent(titleMatch[1]);
        const list = state.lists.find((l) => l.title === title);
        if (!list) {
            await route.fulfill(json({ error: 'List not found' }, 404));
        } else {
            await route.fulfill(json(list));
        }
        return true;
    }

    // PUT /api/lists — create list
    if (path === '/api/lists' && method === 'PUT') {
        const body = JSON.parse(route.request().postData() ?? '{}');
        const newList = makeList({ title: body.title, listType: body.listType ?? ListType.SHOPPING });
        state.lists.push(newList);
        await route.fulfill(json(newList));
        return true;
    }

    // DELETE /api/lists/:title/clearSelected
    const clearSelectedMatch = path.match(/^\/api\/lists\/([^/]+)\/clearSelected$/);
    if (clearSelectedMatch && method === 'DELETE') {
        const title = decodeURIComponent(clearSelectedMatch[1]);
        const list = state.lists.find((l) => l.title === title);
        if (list) list.items = list.items.filter((i) => !i.isSelected);
        await route.fulfill(json(list ?? {}));
        return true;
    }

    // DELETE /api/lists/:title/clear
    const clearMatch = path.match(/^\/api\/lists\/([^/]+)\/clear$/);
    if (clearMatch && method === 'DELETE') {
        const title = decodeURIComponent(clearMatch[1]);
        const list = state.lists.find((l) => l.title === title);
        if (list) list.items = [];
        await route.fulfill(json(list ?? {}));
        return true;
    }

    // PUT /api/lists/:title/items/bulk
    const bulkMatch = path.match(/^\/api\/lists\/([^/]+)\/items\/bulk$/);
    if (bulkMatch && method === 'PUT') {
        const title = decodeURIComponent(bulkMatch[1]);
        const body = JSON.parse(route.request().postData() ?? '{}');
        const list = state.lists.find((l) => l.title === title);
        let added = 0;
        let skipped = 0;
        if (list && body.items) {
            for (const item of body.items as Array<{ itemName: string; quantity?: number; unit?: string }>) {
                const exists = list.items.some((i) => i.name === item.itemName);
                if (exists) {
                    skipped++;
                } else {
                    list.items.push(makeItem({ name: item.itemName, quantity: item.quantity, unit: item.unit }));
                    added++;
                }
            }
        }
        await route.fulfill(json({ added, skipped }));
        return true;
    }

    // DELETE /api/lists/:title/items/:itemName
    const deleteItemMatch = path.match(/^\/api\/lists\/([^/]+)\/items\/([^/]+)$/);
    if (deleteItemMatch && method === 'DELETE') {
        const title = decodeURIComponent(deleteItemMatch[1]);
        const itemName = decodeURIComponent(deleteItemMatch[2]);
        const list = state.lists.find((l) => l.title === title);
        if (list) list.items = list.items.filter((i) => i.name !== itemName);
        await route.fulfill(json(list ?? {}));
        return true;
    }

    // POST /api/lists/:title/items/:itemName — update item
    const updateItemMatch = path.match(/^\/api\/lists\/([^/]+)\/items\/([^/]+)$/);
    if (updateItemMatch && method === 'POST') {
        const title = decodeURIComponent(updateItemMatch[1]);
        const itemName = decodeURIComponent(updateItemMatch[2]);
        const body = JSON.parse(route.request().postData() ?? '{}') as Partial<Item> & { newItemName?: string };
        const list = state.lists.find((l) => l.title === title);
        let updatedItem: Item | undefined;
        if (list) {
            const idx = list.items.findIndex((i) => i.name === itemName);
            if (idx !== -1) {
                const item = list.items[idx];
                list.items[idx] = {
                    ...item,
                    ...(body.isSelected !== undefined && { isSelected: body.isSelected }),
                    ...(body.newItemName && { name: body.newItemName }),
                    ...(body.quantity !== undefined && { quantity: body.quantity }),
                    ...(body.unit !== undefined && { unit: body.unit }),
                    ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
                };
                updatedItem = list.items[idx];
            }
        }
        await route.fulfill(json(updatedItem ?? {}));
        return true;
    }

    // PUT /api/lists/:title/items — add item
    const addItemMatch = path.match(/^\/api\/lists\/([^/]+)\/items$/);
    if (addItemMatch && method === 'PUT') {
        const title = decodeURIComponent(addItemMatch[1]);
        const body = JSON.parse(route.request().postData() ?? '{}');
        const list = state.lists.find((l) => l.title === title);
        const newItem = makeItem({ name: body.itemName, quantity: body.quantity, unit: body.unit });
        if (list) list.items.push(newItem);
        await route.fulfill(json(newItem));
        return true;
    }

    // DELETE /api/lists/:title/users/:userId
    const removeUserMatch = path.match(/^\/api\/lists\/([^/]+)\/users\/([^/]+)$/);
    if (removeUserMatch && method === 'DELETE') {
        const title = decodeURIComponent(removeUserMatch[1]);
        const userId = removeUserMatch[2];
        const list = state.lists.find((l) => l.title === title);
        if (list) {
            list.users = list.users.filter((u) => {
                const fullUser = state.users.find((su) => su.id === userId);
                return u.username !== fullUser?.username;
            });
        }
        await route.fulfill(json(list ?? {}));
        return true;
    }

    // POST /api/lists/:title/users — add user
    const addUserMatch = path.match(/^\/api\/lists\/([^/]+)\/users$/);
    if (addUserMatch && method === 'POST') {
        const title = decodeURIComponent(addUserMatch[1]);
        const body = JSON.parse(route.request().postData() ?? '{}');
        const list = state.lists.find((l) => l.title === title);
        if (list && body.username) {
            const exists = list.users.some((u) => u.username === body.username);
            const found = state.users.find((u) => u.username === body.username);
            if (!exists) list.users.push({ id: found?.id ?? body.username, username: body.username });
        }
        await route.fulfill(json(list ?? {}));
        return true;
    }

    // POST /api/lists/:title — rename
    const renameMatch = path.match(/^\/api\/lists\/([^/]+)$/);
    if (renameMatch && method === 'POST') {
        const title = decodeURIComponent(renameMatch[1]);
        const body = JSON.parse(route.request().postData() ?? '{}');
        const list = state.lists.find((l) => l.title === title);
        if (list && body.newTitle) list.title = body.newTitle;
        await route.fulfill(json(list ?? {}));
        return true;
    }

    // DELETE /api/lists/:title
    const deleteListMatch = path.match(/^\/api\/lists\/([^/]+)$/);
    if (deleteListMatch && method === 'DELETE') {
        const title = decodeURIComponent(deleteListMatch[1]);
        const idx = state.lists.findIndex((l) => l.title === title);
        const removed = idx !== -1 ? state.lists.splice(idx, 1)[0] : undefined;
        await route.fulfill(json(removed ?? {}));
        return true;
    }

    return false;
}
