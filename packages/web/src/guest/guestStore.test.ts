import 'fake-indexeddb/auto';
import { ListType } from '@shoppingo/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { guestStore } from './guestStore';

describe('guestStore', () => {
    beforeEach(async () => {
        await guestStore._resetForTests();
    });

    it('createList persists and is reflected in peekLists and count', async () => {
        const created = await guestStore.createList({ title: 'My List' });
        expect(created.title).toBe('My List');
        expect(created.listType).toBe(ListType.SHOPPING);
        expect(guestStore.peekLists()).toHaveLength(1);
        expect(guestStore.count()).toBe(1);
    });

    it('createList rejects duplicate titles (case-insensitive)', async () => {
        await guestStore.createList({ title: 'My List' });
        await expect(guestStore.createList({ title: 'my list' })).rejects.toThrow(/already exists/);
    });

    it('createList rejects blank titles', async () => {
        await expect(guestStore.createList({ title: '   ' })).rejects.toThrow(/required/);
    });

    it('deleteList removes the list and all its items', async () => {
        const list = await guestStore.createList({ title: 'A' });
        await guestStore.addItem({ listId: list.id, name: 'Apples' });
        await guestStore.addItem({ listId: list.id, name: 'Pears' });
        expect(guestStore.itemCount()).toBe(2);

        await guestStore.deleteList(list.id);

        expect(guestStore.count()).toBe(0);
        expect(guestStore.itemCount()).toBe(0);
        expect(guestStore.peekItems(list.id)).toHaveLength(0);
    });

    it('addItem + peekItems round-trips through IndexedDB after hydrate', async () => {
        const list = await guestStore.createList({ title: 'A' });
        await guestStore.addItem({ listId: list.id, name: 'Apples', quantity: 2, unit: 'kg' });
        await guestStore.addItem({ listId: list.id, name: 'Pears' });

        await guestStore.hydrate();

        const items = guestStore.peekItems(list.id);
        expect(items).toHaveLength(2);
        expect(items.map((i) => i.name)).toEqual(['Apples', 'Pears']);
        expect(items[0].quantity).toBe(2);
        expect(items[0].unit).toBe('kg');
    });

    it('toggleItem flips isSelected', async () => {
        const list = await guestStore.createList({ title: 'A' });
        const item = await guestStore.addItem({ listId: list.id, name: 'Apples' });

        await guestStore.toggleItem(item.id, true);

        expect(guestStore.peekItems(list.id)[0].isSelected).toBe(true);

        await guestStore.toggleItem(item.id, false);

        expect(guestStore.peekItems(list.id)[0].isSelected).toBe(false);
    });

    it('updateItemName rejects blank names and trims valid ones', async () => {
        const list = await guestStore.createList({ title: 'A' });
        const item = await guestStore.addItem({ listId: list.id, name: 'Apples' });

        await expect(guestStore.updateItemName(item.id, '   ')).rejects.toThrow(/required/);
        await guestStore.updateItemName(item.id, '  Pears  ');
        expect(guestStore.peekItems(list.id)[0].name).toBe('Pears');
    });

    it('clearList keeps the list but drops its items', async () => {
        const list = await guestStore.createList({ title: 'A' });
        await guestStore.addItem({ listId: list.id, name: 'Apples' });
        await guestStore.addItem({ listId: list.id, name: 'Pears' });

        await guestStore.clearList(list.id);

        expect(guestStore.count()).toBe(1);
        expect(guestStore.peekItems(list.id)).toHaveLength(0);
    });

    it('clearSelected keeps unselected items, drops selected ones', async () => {
        const list = await guestStore.createList({ title: 'A' });
        const a = await guestStore.addItem({ listId: list.id, name: 'Apples' });
        await guestStore.addItem({ listId: list.id, name: 'Pears' });
        await guestStore.toggleItem(a.id, true);

        await guestStore.clearSelected(list.id);

        const remaining = guestStore.peekItems(list.id);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].name).toBe('Pears');
    });

    it('clear empties everything', async () => {
        const list = await guestStore.createList({ title: 'A' });
        await guestStore.addItem({ listId: list.id, name: 'Apples' });

        await guestStore.clear();

        expect(guestStore.count()).toBe(0);
        expect(guestStore.itemCount()).toBe(0);
        expect(guestStore.peekItems(list.id)).toHaveLength(0);
    });

    it('subscribe fires on writes', async () => {
        let calls = 0;
        const unsub = guestStore.subscribe(() => {
            calls += 1;
        });

        const list = await guestStore.createList({ title: 'A' });
        await guestStore.addItem({ listId: list.id, name: 'Apples' });
        await guestStore.deleteItem((guestStore.peekItems(list.id)[0] ?? { id: '' }).id);
        unsub();

        expect(calls).toBeGreaterThanOrEqual(3);
    });

    it('snapshot returns a deep copy that survives later mutations', async () => {
        const list = await guestStore.createList({ title: 'A' });
        await guestStore.addItem({ listId: list.id, name: 'Apples' });

        const snap = guestStore.snapshot();

        await guestStore.deleteList(list.id);

        expect(snap.lists).toHaveLength(1);
        expect(snap.itemsByList.get(list.id)).toHaveLength(1);
    });
});
