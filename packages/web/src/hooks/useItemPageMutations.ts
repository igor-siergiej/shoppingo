import type { Item, ListType } from '@shoppingo/types';
import { useMutation, useQueryClient } from 'react-query';
import { addItem, clearList, clearSelected } from '../api';
import { logger } from '../utils/logger';

export const useItemPageMutations = (listTitle?: string) => {
    const queryClient = useQueryClient();

    const addItemMutation = useMutation({
        mutationFn: ({
            itemName,
            quantity,
            unit,
            dueDate,
        }: {
            itemName: string;
            quantity?: number;
            unit?: string;
            dueDate?: Date;
        }) => addItem(itemName, listTitle, quantity, unit, dueDate),
        onSuccess: (_, variables) => {
            logger.info('Item added', {
                listTitle,
                itemName: variables.itemName,
                quantity: variables.quantity,
                unit: variables.unit,
                dueDate: variables.dueDate,
            });
            void queryClient.invalidateQueries([listTitle]);
        },
        onError: (error, variables) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to add item', { listTitle, itemName: variables.itemName, error: errorMessage });
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
                old ? { ...old, items: old.items.filter((i) => !i.isSelected) } : old
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
