import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../offline/drainer', () => ({ drainOutbox: vi.fn().mockResolvedValue(undefined) }));

import { outboxStore } from '../offline/outboxStore';
import { useRecipeMutations } from './useRecipeMutations';

const user = { id: 'user-1', username: 'me' };
const wrap =
    (client: QueryClient) =>
    ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

describe('useRecipeMutations', () => {
    beforeEach(async () => {
        await outboxStore._resetForTests();
    });

    it('createRecipe enqueues a recipe.create intent and optimistically adds it', async () => {
        const client = new QueryClient();
        client.setQueryData(['recipes', 'user-1'], []);
        const { result } = renderHook(() => useRecipeMutations(user), { wrapper: wrap(client) });
        await act(async () => {
            await result.current.createRecipe('Pasta', [], []);
        });
        await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
        expect(outboxStore.peekAll()[0]).toMatchObject({ op: 'recipe.create', entityType: 'recipe', scope: 'user-1' });
        const cached = client.getQueryData(['recipes', 'user-1']) as Array<{ title: string }>;
        expect(cached.map((r) => r.title)).toContain('Pasta');
    });

    it('deleteRecipe enqueues a recipe.delete intent', async () => {
        const client = new QueryClient();
        client.setQueryData(
            ['recipes', 'user-1'],
            [{ id: 'R1', title: 'Pasta', ingredients: [], ownerId: 'user-1', users: [], dateAdded: new Date() }]
        );
        const { result } = renderHook(() => useRecipeMutations(user), { wrapper: wrap(client) });
        await act(async () => {
            await result.current.deleteRecipe('R1');
        });
        await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
        expect(outboxStore.peekAll()[0]).toMatchObject({ op: 'recipe.delete', targetId: 'R1' });
    });

    it('updateRecipe enqueues a recipe.update intent and patches list + detail caches', async () => {
        const existingRecipe = {
            id: 'R2',
            title: 'Old Title',
            ingredients: [],
            ownerId: 'user-1',
            users: [user],
            dateAdded: new Date(),
        };
        const client = new QueryClient();
        client.setQueryData(['recipes', 'user-1'], [existingRecipe]);
        client.setQueryData(['recipe', 'R2'], existingRecipe);
        const { result } = renderHook(() => useRecipeMutations(user), { wrapper: wrap(client) });
        await act(async () => {
            await result.current.updateRecipe('R2', 'New Title', []);
        });
        await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
        expect(outboxStore.peekAll()[0]).toMatchObject({ op: 'recipe.update', targetId: 'R2' });
        const list = client.getQueryData(['recipes', 'user-1']) as Array<{ id: string; title: string }>;
        expect(list.find((r) => r.id === 'R2')?.title).toBe('New Title');
        const detail = client.getQueryData(['recipe', 'R2']) as { title: string };
        expect(detail.title).toBe('New Title');
    });
});
