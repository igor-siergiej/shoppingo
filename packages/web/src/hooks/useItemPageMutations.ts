import type { Item, ListType } from '@shoppingo/types';
import { useMutation, useQueryClient } from 'react-query';
import { clearList, clearSelected } from '../api';
import { drainOutbox } from '../offline/drainer';
import { outboxStore } from '../offline/outboxStore';
import { logger } from '../utils/logger';

export const useItemPageMutations = (listTitle?: string) => {
    const queryClient = useQueryClient();

    const addItemMutation = useMutation({
        // `id` is chosen by the caller so the optimistic cache entry and the queued intent share it;
        // otherwise the outbox cannot tell which rendered item is the one waiting to sync.
        mutationFn: async ({
            id,
            itemName,
            quantity,
            unit,
        }: {
            id: string;
            itemName: string;
            quantity?: number;
            unit?: string;
        }) => {
            await outboxStore.enqueue({
                id: crypto.randomUUID(),
                entityType: 'item',
                op: 'item.add',
                targetId: id,
                scope: listTitle ?? '',
                payload: {
                    name: itemName,
                    ...(quantity !== undefined && { quantity }),
                    ...(unit !== undefined && { unit }),
                },
                createdAt: Date.now(),
            });
            void drainOutbox();
            return id;
        },
        onMutate: async ({ id, itemName, quantity, unit }) => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);

            const optimisticItem: Item = {
                id,
                name: itemName,
                isSelected: false,
                dateAdded: new Date(),
                ...(quantity !== undefined && { quantity }),
                ...(unit !== undefined && { unit }),
            };
            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old ? { ...old, items: [...(old.items ?? []), optimisticItem] } : old
            );

            return { previousData };
        },
        onSuccess: (_, variables) => {
            logger.info('Item added', {
                listTitle,
                itemName: variables.itemName,
                quantity: variables.quantity,
                unit: variables.unit,
            });
            void queryClient.invalidateQueries([listTitle]);
        },
        onError: (error, variables, context) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to add item', { listTitle, itemName: variables.itemName, error: errorMessage });
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
            }
        },
    });

    const clearSelectedMutation = useMutation({
        mutationFn: () => clearSelected(listTitle),
        onMutate: async () => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);
            const selectedCount = previousData?.items?.filter((i) => i.isSelected).length || 0;

            logger.info('Clearing selected items', { listTitle, count: selectedCount });

            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old ? { ...old, items: (old.items ?? []).filter((i) => !i.isSelected) } : old
            );

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            logger.warn('Failed to clear selected items', { listTitle });
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    const clearListMutation = useMutation({
        mutationFn: () => clearList(listTitle),
        onMutate: async () => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);
            const itemCount = previousData?.items?.length || 0;

            logger.info('Clearing all items', { listTitle, count: itemCount });

            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old ? { ...old, items: [] } : old
            );

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            logger.warn('Failed to clear all items', { listTitle });
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    return {
        addItemMutation,
        clearSelectedMutation,
        clearListMutation,
    };
};
