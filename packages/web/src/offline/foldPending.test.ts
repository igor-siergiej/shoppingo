import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { foldPendingItems, foldPendingLists } from './foldPending';
import { outboxStore } from './outboxStore';

describe('foldPendingItems', () => {
    beforeEach(async () => {
        await outboxStore._resetForTests();
    });

    it('applies pending intents for the given list over server data', async () => {
        await outboxStore.enqueue({
            id: '1',
            entityType: 'item',
            op: 'item.toggle',
            targetId: 'a',
            scope: 'L',
            payload: { isSelected: true },
            createdAt: 0,
        });
        await outboxStore.enqueue({
            id: '2',
            entityType: 'item',
            op: 'item.add',
            targetId: 'b',
            scope: 'L',
            payload: { name: 'Bread' },
            createdAt: 0,
        });
        const server = { listType: 'shopping', items: [{ id: 'a', name: 'Milk', isSelected: false }], users: [] };
        const folded = foldPendingItems('L', server as never);
        expect(folded.items.find((i) => i.id === 'a')?.isSelected).toBe(true);
        expect(folded.items.map((i) => i.id)).toEqual(['a', 'b']);
    });

    it('ignores intents scoped to other lists', async () => {
        await outboxStore.enqueue({
            id: '1',
            entityType: 'item',
            op: 'item.delete',
            targetId: 'a',
            scope: 'OTHER',
            payload: {},
            createdAt: 0,
        });
        const server = { listType: 'shopping', items: [{ id: 'a', name: 'Milk', isSelected: false }], users: [] };
        expect(foldPendingItems('L', server as never).items).toHaveLength(1);
    });
});

describe('foldPendingLists', () => {
    beforeEach(async () => {
        await outboxStore._resetForTests();
    });

    it('appends pending list.create for the given user', async () => {
        await outboxStore.enqueue({
            id: '1',
            entityType: 'list',
            op: 'list.create',
            targetId: 'L1',
            scope: 'user-1',
            payload: { title: 'Groceries', listType: 'shopping', ownerId: 'user-1' },
            createdAt: 0,
        });
        const server = [
            { id: 'S1', title: 'Existing', dateAdded: new Date(), items: [], users: [], listType: 'shopping' },
        ];
        const folded = foldPendingLists('user-1', server as never);
        expect(folded.map((l) => l.id)).toEqual(['S1', 'L1']);
    });

    it('ignores list.create scoped to a different user', async () => {
        await outboxStore.enqueue({
            id: '1',
            entityType: 'list',
            op: 'list.create',
            targetId: 'L1',
            scope: 'user-2',
            payload: { title: 'X' },
            createdAt: 0,
        });
        const server = [
            { id: 'S1', title: 'Existing', dateAdded: new Date(), items: [], users: [], listType: 'shopping' },
        ];
        expect(foldPendingLists('user-1', server as never)).toHaveLength(1);
    });
});
