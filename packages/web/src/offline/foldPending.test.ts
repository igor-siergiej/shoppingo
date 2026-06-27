import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { foldPendingItems } from './foldPending';
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
