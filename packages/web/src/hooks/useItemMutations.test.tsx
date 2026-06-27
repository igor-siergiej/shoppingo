import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({
    updateItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    updateItemName: vi.fn().mockResolvedValue(undefined),
    updateItemQuantity: vi.fn().mockResolvedValue(undefined),
}));

import { deleteItem, updateItem } from '../api';
import { useItemMutations } from './useItemMutations';

const wrap =
    (client: QueryClient) =>
    ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

describe('useItemMutations (id-addressed)', () => {
    it('toggle optimistically updates the item matched by id and calls api with id', async () => {
        const client = new QueryClient();
        client.setQueryData(['My List'], {
            listType: 'shopping',
            items: [{ id: 'x1', name: 'Milk', isSelected: false }],
        });
        const { result } = renderHook(() => useItemMutations('My List', 'x1'), { wrapper: wrap(client) });
        act(() => {
            result.current.toggleMutation.mutate(true);
        });
        await waitFor(() => {
            const data = client.getQueryData(['My List']) as { items: { id: string; isSelected: boolean }[] };
            expect(data.items[0].isSelected).toBe(true);
        });
        await waitFor(() => expect(updateItem).toHaveBeenCalledWith('x1', true, 'My List'));
    });

    it('delete removes the item matched by id', async () => {
        const client = new QueryClient();
        client.setQueryData(['My List'], {
            listType: 'shopping',
            items: [
                { id: 'x1', name: 'Milk' },
                { id: 'x2', name: 'Bread' },
            ],
        });
        const { result } = renderHook(() => useItemMutations('My List', 'x1'), { wrapper: wrap(client) });
        act(() => {
            result.current.deleteMutation.mutate(undefined);
        });
        await waitFor(() => {
            const data = client.getQueryData(['My List']) as { items: { id: string }[] };
            expect(data.items.map((i) => i.id)).toEqual(['x2']);
        });
        await waitFor(() => expect(deleteItem).toHaveBeenCalledWith('x1', 'My List'));
    });
});
