import type { Item, ListType } from '@shoppingo/types';
import { useMutation, useQueryClient } from 'react-query';
import {
    deleteItem,
    updateItem,
    updateItemDueDate,
    updateItemName,
    updateItemQuantity,
} from '../api';

interface OptimisticMutationContext {
    previousData: { listType: ListType; items: Item[] } | undefined;
}

function createOptimisticMutation<TVariables>(
    queryClient: React.QueryClient,
    listTitle: string,
    mutationFn: (vars: TVariables) => Promise<unknown>,
    applyOptimisticUpdate: (items: Item[], vars: TVariables) => Item[]
) {
    return {
        mutationFn,
        onMutate: async (variables: TVariables) => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);

            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old
                    ? {
                          ...old,
                          items: applyOptimisticUpdate(old.items, variables),
                      }
                    : undefined
            );

            return { previousData };
        },
        onError: (_err: unknown, _variables: TVariables, context?: OptimisticMutationContext) => {
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    };
}

export function useItemMutations(listTitle: string, itemName: string) {
    const queryClient = useQueryClient();

    const toggleMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            (isSelected: boolean) => updateItem(itemName, isSelected, listTitle),
            (items, isSelected) =>
                items.map((i) => (i.name === itemName ? { ...i, isSelected } : i))
        ) as any
    );

    const deleteMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            () => deleteItem(itemName, listTitle),
            (items) => items.filter((i) => i.name !== itemName)
        ) as any
    );

    const updateNameMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            (newName: string) => updateItemName(listTitle, itemName, newName),
            (items, newName) =>
                items.map((i) => (i.name === itemName ? { ...i, name: newName } : i))
        ) as any
    );

    const updateQuantityMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            ({ quantity, unit }: { quantity?: number; unit?: string }) =>
                updateItemQuantity(listTitle, itemName, quantity, unit),
            (items, { quantity, unit }) =>
                items.map((i) =>
                    i.name === itemName
                        ? {
                              ...i,
                              ...(quantity !== undefined && { quantity }),
                              ...(unit !== undefined && { unit }),
                          }
                        : i
                )
        ) as any
    );

    const updateDueDateMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            (dueDate?: Date) => updateItemDueDate(listTitle, itemName, dueDate),
            (items, dueDate) =>
                items.map((i) =>
                    i.name === itemName
                        ? {
                              ...i,
                              ...(dueDate !== undefined && { dueDate }),
                          }
                        : i
                )
        ) as any
    );

    return {
        toggleMutation,
        deleteMutation,
        updateNameMutation,
        updateQuantityMutation,
        updateDueDateMutation,
    };
}
