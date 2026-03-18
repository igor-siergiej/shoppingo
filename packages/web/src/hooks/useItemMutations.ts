import type { Item, ListType } from '@shoppingo/types';
import type { UseMutationOptions } from 'react-query';
import { useMutation, useQueryClient } from 'react-query';
import { deleteItem, updateItem, updateItemDueDate, updateItemName, updateItemQuantity } from '../api';

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
            (items, isSelected) => items.map((i) => (i.name === itemName ? { ...i, isSelected } : i))
        ) as UseMutationOptions<unknown, unknown, boolean, OptimisticMutationContext>
    );

    const deleteMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            () => deleteItem(itemName, listTitle),
            (items) => items.filter((i) => i.name !== itemName)
        ) as UseMutationOptions<unknown, unknown, undefined, OptimisticMutationContext>
    );

    const updateNameMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            (newName: string) => updateItemName(listTitle, itemName, newName),
            (items, newName) => items.map((i) => (i.name === itemName ? { ...i, name: newName } : i))
        ) as UseMutationOptions<unknown, unknown, string, OptimisticMutationContext>
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
        ) as UseMutationOptions<unknown, unknown, { quantity?: number; unit?: string }, OptimisticMutationContext>
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
        ) as UseMutationOptions<unknown, unknown, Date | undefined, OptimisticMutationContext>
    );

    return {
        toggleMutation,
        deleteMutation,
        updateNameMutation,
        updateQuantityMutation,
        updateDueDateMutation,
    };
}
