import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replayIntent } = vi.hoisted(() => ({ replayIntent: vi.fn() }));
vi.mock('./replay', () => ({ replayIntent }));

import { drainOutbox } from './drainer';
import { outboxStore } from './outboxStore';

const enq = (over = {}) =>
    outboxStore.enqueue({
        id: crypto.randomUUID(),
        entityType: 'item',
        op: 'item.toggle',
        targetId: 'x',
        scope: 'L',
        payload: { isSelected: true },
        createdAt: 0,
        ...over,
    });

describe('drainOutbox', () => {
    beforeEach(async () => {
        await outboxStore._resetForTests();
        replayIntent.mockReset();
    });

    it('replays in order and clears the queue on success', async () => {
        await enq({ targetId: 'a' });
        await enq({ targetId: 'b' });
        replayIntent.mockResolvedValue(undefined);
        await drainOutbox();
        expect(replayIntent.mock.calls.map((c) => c[0].targetId)).toEqual(['a', 'b']);
        expect(outboxStore.count()).toBe(0);
    });

    it('discards an intent that fails with 404', async () => {
        await enq();
        replayIntent.mockRejectedValue(Object.assign(new Error('gone'), { status: 404 }));
        await drainOutbox();
        expect(outboxStore.count()).toBe(0);
    });

    it('discards on 409 conflict', async () => {
        await enq();
        replayIntent.mockRejectedValue(Object.assign(new Error('conflict'), { status: 409 }));
        await drainOutbox();
        expect(outboxStore.count()).toBe(0);
    });

    it('stops and keeps the queue on a 5xx error (preserves order)', async () => {
        await enq({ targetId: 'a' });
        await enq({ targetId: 'b' });
        replayIntent.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }));
        await drainOutbox();
        expect(outboxStore.count()).toBe(2);
    });

    it('stops on a network error with no status', async () => {
        await enq();
        replayIntent.mockRejectedValue(new TypeError('Failed to fetch'));
        await drainOutbox();
        expect(outboxStore.count()).toBe(1);
    });
});
