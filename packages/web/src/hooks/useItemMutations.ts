import type { Item, ListType } from '@shoppingo/types';
import type { UseMutationOptions } from 'react-query';
import { useMutation, useQueryClient } from 'react-query';
import { drainOutbox } from '../offline/drainer';
import type { ItemOp } from '../offline/outboxStore';
import { outboxStore } from '../offline/outboxStore';

interface OptimisticMutationContext {
    previousData: { listType: ListType; items: Item[] } | undefined;
}

const enqueueItem = async (op: ItemOp, listTitle: string, targetId: string, payload: Record<string, unknown>) => {
    await outboxStore.enqueue({
        id: crypto.randomUUID(),
        entityType: 'item',
        op,
        targetId,
        scope: listTitle,
        payload,
        createdAt: Date.now(),
    });
    void drainOutbox();
};

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

export function useItemMutations(listTitle: string, itemId: string) {
    const queryClient = useQueryClient();

    const toggleMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            (isSelected: boolean) => enqueueItem('item.toggle', listTitle, itemId, { isSelected }),
            (items, isSelected) => items.map((i) => (i.id === itemId ? { ...i, isSelected } : i))
        ) as UseMutationOptions<unknown, unknown, boolean, OptimisticMutationContext>
    );

    const deleteMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            () => enqueueItem('item.delete', listTitle, itemId, {}),
            (items) => items.filter((i) => i.id !== itemId)
        ) as UseMutationOptions<unknown, unknown, undefined, OptimisticMutationContext>
    );

    const updateNameMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            (newName: string) => enqueueItem('item.rename', listTitle, itemId, { newItemName: newName }),
            (items, newName) => items.map((i) => (i.id === itemId ? { ...i, name: newName } : i))
        ) as UseMutationOptions<unknown, unknown, string, OptimisticMutationContext>
    );

    const updateQuantityMutation = useMutation(
        createOptimisticMutation(
            queryClient,
            listTitle,
            ({ quantity, unit }: { quantity?: number; unit?: string }) =>
                enqueueItem('item.quantity', listTitle, itemId, {
                    ...(quantity !== undefined && { quantity }),
                    ...(unit !== undefined && { unit }),
                }),
            (items, { quantity, unit }) =>
                items.map((i) =>
                    i.id === itemId
                        ? {
                              ...i,
                              ...(quantity !== undefined && { quantity }),
                              ...(unit !== undefined && { unit }),
                          }
                        : i
                )
        ) as UseMutationOptions<unknown, unknown, { quantity?: number; unit?: string }, OptimisticMutationContext>
    );

    return {
        toggleMutation,
        deleteMutation,
        updateNameMutation,
        updateQuantityMutation,
    };
}
