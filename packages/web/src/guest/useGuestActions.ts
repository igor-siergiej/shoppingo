import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { type GuestItem, type GuestList, guestStore } from './guestStore';

// All guest-mode mutations live here so callers don't have to know about
// the underlying IndexedDB store. They all optimistically update the in-memory
// mirror (which the in-page subscriptions react to), then write through to IDB.

// fallow-ignore-next-line unused-type
export interface GuestAddListInput {
    title: string;
    listType?: GuestList['listType'];
}

export const useGuestListActions = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const createList = useCallback(
        async ({ title, listType }: GuestAddListInput): Promise<GuestList> => {
            const list = await guestStore.createList({ title, ...(listType && { listType }) });
            queryClient.invalidateQueries({ queryKey: ['lists', 'guest'] });
            navigate(`/guest/list/${list.id}`);
            return list;
        },
        [navigate, queryClient]
    );

    const deleteList = useCallback(
        async (listId: string) => {
            await guestStore.deleteList(listId);
            queryClient.invalidateQueries({ queryKey: ['lists', 'guest'] });
            queryClient.removeQueries({ queryKey: ['list', listId, 'guest'] });
        },
        [queryClient]
    );

    const renameList = useCallback(
        async (listId: string, newTitle: string) => {
            // guestStore doesn't expose renameList directly because the API uses
            // PUT /api/lists/:title with a body. Implement here via delete+recreate
            // so the order and ids stay stable for items.
            const existing = guestStore.peekLists().find((l) => l.id === listId);
            if (!existing) throw new Error('List not found');
            if (existing.title === newTitle) return;
            const items = guestStore.peekItems(listId);
            await guestStore.deleteList(listId);
            const recreated = await guestStore.createList({ title: newTitle, listType: existing.listType });
            for (const item of items) {
                await guestStore.addItem({
                    listId: recreated.id,
                    name: item.name,
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.unit !== undefined && { unit: item.unit }),
                });
            }
            queryClient.invalidateQueries({ queryKey: ['lists', 'guest'] });
            queryClient.removeQueries({ queryKey: ['list', listId, 'guest'] });
            queryClient.invalidateQueries({ queryKey: ['list', recreated.id, 'guest'] });
        },
        [queryClient]
    );

    return { createList, deleteList, renameList };
};

// fallow-ignore-next-line unused-type
export interface GuestAddItemInput {
    listId: string;
    name: string;
    quantity?: number;
    unit?: string;
}

export const useGuestItemActions = () => {
    const queryClient = useQueryClient();

    const addItem = useCallback(
        async ({ listId, name, quantity, unit }: GuestAddItemInput): Promise<GuestItem> => {
            const item = await guestStore.addItem({
                listId,
                name,
                ...(quantity !== undefined && { quantity }),
                ...(unit !== undefined && { unit }),
            });
            queryClient.invalidateQueries({ queryKey: ['list', listId, 'guest'] });
            queryClient.invalidateQueries({ queryKey: ['lists', 'guest'] });
            return item;
        },
        [queryClient]
    );

    const addItemsBulk = useCallback(
        async (
            listId: string,
            items: Array<{ name: string; quantity?: number; unit?: string }>
        ): Promise<{ added: number; skipped: number }> => {
            let added = 0;
            let skipped = 0;
            const existing = new Set(guestStore.peekItems(listId).map((it) => it.name.toLowerCase()));
            for (const item of items) {
                const trimmed = item.name.trim();
                if (!trimmed) {
                    skipped += 1;
                    continue;
                }
                if (existing.has(trimmed.toLowerCase())) {
                    skipped += 1;
                    continue;
                }
                await guestStore.addItem({
                    listId,
                    name: trimmed,
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.unit !== undefined && { unit: item.unit }),
                });
                existing.add(trimmed.toLowerCase());
                added += 1;
            }
            queryClient.invalidateQueries({ queryKey: ['list', listId, 'guest'] });
            return { added, skipped };
        },
        [queryClient]
    );

    const toggleItem = useCallback(
        async (listId: string, itemId: string, isSelected: boolean) => {
            await guestStore.toggleItem(itemId, isSelected);
            queryClient.invalidateQueries({ queryKey: ['list', listId, 'guest'] });
        },
        [queryClient]
    );

    const updateItemName = useCallback(
        async (listId: string, itemId: string, name: string) => {
            await guestStore.updateItemName(itemId, name);
            queryClient.invalidateQueries({ queryKey: ['list', listId, 'guest'] });
        },
        [queryClient]
    );

    const deleteItem = useCallback(
        async (listId: string, itemId: string) => {
            await guestStore.deleteItem(itemId);
            queryClient.invalidateQueries({ queryKey: ['list', listId, 'guest'] });
        },
        [queryClient]
    );

    const clearList = useCallback(
        async (listId: string) => {
            await guestStore.clearList(listId);
            queryClient.invalidateQueries({ queryKey: ['list', listId, 'guest'] });
        },
        [queryClient]
    );

    const clearSelected = useCallback(
        async (listId: string) => {
            await guestStore.clearSelected(listId);
            queryClient.invalidateQueries({ queryKey: ['list', listId, 'guest'] });
        },
        [queryClient]
    );

    return { addItem, addItemsBulk, toggleItem, updateItemName, deleteItem, clearList, clearSelected };
};
