import { describe, expect, it } from 'vitest';
import { applyItemIntent, applyListIntent } from './intents';
import type { OutboxIntent } from './outboxStore';

const base = (op: OutboxIntent['op'], targetId: string, payload = {}): OutboxIntent => ({
    seq: 1,
    id: 'i',
    entityType: 'item',
    op,
    targetId,
    scope: 'L',
    payload,
    createdAt: 0,
});

const items = [{ id: 'a', name: 'Milk', isSelected: false }];

describe('applyItemIntent', () => {
    it('toggle sets isSelected by id', () => {
        expect(applyItemIntent(items, base('item.toggle', 'a', { isSelected: true }))[0].isSelected).toBe(true);
    });
    it('delete removes by id', () => {
        expect(applyItemIntent(items, base('item.delete', 'a'))).toHaveLength(0);
    });
    it('rename changes name by id', () => {
        expect(applyItemIntent(items, base('item.rename', 'a', { newItemName: 'Oat Milk' }))[0].name).toBe('Oat Milk');
    });
    it('quantity merges fields by id', () => {
        const r = applyItemIntent(items, base('item.quantity', 'a', { quantity: 2, unit: 'L' }))[0];
        expect(r.quantity).toBe(2);
        expect(r.unit).toBe('L');
    });
    it('add appends a new item when absent', () => {
        const r = applyItemIntent(items, base('item.add', 'b', { name: 'Bread' }));
        expect(r.map((i) => i.id)).toEqual(['a', 'b']);
    });
    it('add is idempotent when id already present', () => {
        const r = applyItemIntent(items, base('item.add', 'a', { name: 'Milk' }));
        expect(r).toHaveLength(1);
    });
});

const listBase = (targetId: string, payload = {}): OutboxIntent => ({
    seq: 1,
    id: 'i',
    entityType: 'list',
    op: 'list.create',
    targetId,
    scope: 'user-1',
    payload,
    createdAt: 0,
});

describe('applyListIntent', () => {
    it('list.create appends a new list', () => {
        const r = applyListIntent([], listBase('L1', { title: 'Groceries', listType: 'shopping', ownerId: 'user-1' }));
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({
            id: 'L1',
            title: 'Groceries',
            items: [],
            listType: 'shopping',
            ownerId: 'user-1',
        });
    });
    it('list.create is idempotent when id already present', () => {
        const existing = [{ id: 'L1', title: 'Groceries', items: [], users: [], listType: 'shopping' }];
        expect(applyListIntent(existing, listBase('L1', { title: 'Groceries' }))).toHaveLength(1);
    });
});
