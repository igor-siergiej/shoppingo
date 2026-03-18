import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { AlertTriangle, ListTodo, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useConfirmation } from '@/hooks/useConfirmation';
import { addItem, clearList, clearSelected, getListQuery } from '../../api';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import { ItemsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar from '../../components/ToolBar';
import { logger } from '../../utils/logger';

const ItemsPage = () => {
    const { listTitle } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [currentListType, setCurrentListType] = useState<ListType>(ListTypeEnum.SHOPPING);
    const { confirm, isOpen, config: confirmConfig, handleConfirm, handleCancel } = useConfirmation();

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listTitle),
    });

    // Extract listType and items from API response
    const listType = data?.listType || ListTypeEnum.SHOPPING;
    const items = data?.items || [];
    const users = data?.users || [];
    const ownerId = data?.ownerId;
    const selectedItemsCount = items.filter((item) => item.isSelected).length;

    useEffect(() => {
        setCurrentListType(listType);
    }, [listType]);

    useEffect(() => {
        if (listTitle) {
            logger.info('Items page loaded', { listTitle, itemCount: items.length, listType });
        }
    }, [listTitle, items.length, listType]);

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
            // Refetch after successful add
            void queryClient.invalidateQueries([listTitle]);
        },
        onError: (error, variables) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to add item', { listTitle, itemName: variables.itemName, error: errorMessage });
        },
    });

    // Mutation for clearing selected items
    const clearSelectedMutation = useMutation({
        mutationFn: () => clearSelected(listTitle),
        onMutate: async () => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);
            const selectedCount = previousData?.items?.filter((i) => i.isSelected).length || 0;

            logger.info('Clearing selected items', { listTitle, count: selectedCount });

            // Optimistically remove selected items
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

    // Mutation for clearing all items
    const clearListMutation = useMutation({
        mutationFn: () => clearList(listTitle),
        onMutate: async () => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);
            const itemCount = previousData?.items?.length || 0;

            logger.info('Clearing all items', { listTitle, count: itemCount });

            // Optimistically clear all items
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

    // Early return after all hooks are defined
    if (!listTitle) {
        return <div>Need a valid list title</div>;
    }

    const errorPageContent = (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex items-center gap-3 text-destructive mb-3">
                <AlertTriangle className="h-6 w-6" />
                <span className="font-semibold">Unable to load items</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm">Please check your connection and try again.</p>
            <Button
                variant="default"
                onClick={() => {
                    void refetch();
                }}
            >
                Retry
            </Button>
        </div>
    );

    const isEmpty = items.length === 0;

    const emptyStateConfig = {
        [ListTypeEnum.SHOPPING]: {
            icon: ShoppingCart,
            title: 'No items yet',
            description: 'Start adding items to your shopping list',
            buttonLabel: 'Add Item',
        },
        [ListTypeEnum.TODO]: {
            icon: ListTodo,
            title: 'No tasks yet',
            description: 'Start adding tasks to your to-do list',
            buttonLabel: 'Add Task',
        },
    };

    const config = emptyStateConfig[currentListType];

    const pageContent = (
        <div className="flex flex-col">
            {data ? (
                isEmpty ? (
                    <Empty className="flex-none justify-start p-4">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">{config && <config.icon />}</EmptyMedia>
                            <EmptyTitle>{config?.title}</EmptyTitle>
                            <EmptyDescription>{config?.description}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <ItemCheckBoxList items={items} listTitle={listTitle} listType={listType} />
                )
            ) : null}
        </div>
    );

    const handleClearList = () => {
        if (items.length === 0) return;

        confirm({
            title: 'Clear All Items?',
            description: `Are you sure you want to delete all ${items.length} items from this list? This action cannot be undone.`,
            actionLabel: 'Clear All Items',
            onConfirm: () => {
                clearListMutation.mutate();
            },
        });
    };

    const handleClearSelected = () => {
        if (selectedItemsCount === 0) return;

        confirm({
            title: 'Clear Selected Items?',
            description: `Are you sure you want to delete ${selectedItemsCount} selected item${selectedItemsCount === 1 ? '' : 's'}? This action cannot be undone.`,
            actionLabel: 'Clear Selected',
            onConfirm: () => {
                clearSelectedMutation.mutate();
            },
        });
    };

    const handleAddItem = async (itemName: string, quantity?: number, unit?: string, dueDate?: Date) => {
        return new Promise((resolve, reject) => {
            addItemMutation.mutate(
                { itemName, quantity, unit, dueDate },
                {
                    onSuccess: resolve,
                    onError: reject,
                }
            );
        });
    };

    const handleGoBack = () => {
        navigate('/');
    };

    return (
        <>
            {isLoading && <ItemsSkeleton />}
            {isError && errorPageContent}
            {!isLoading && !isError && data && pageContent}

            <ToolBar
                onAddItem={handleAddItem}
                handleGoBack={handleGoBack}
                handleClearSelected={handleClearSelected}
                handleRemoveAll={handleClearList}
                placeholder="Enter item name..."
                currentListType={currentListType}
                currentList={
                    listTitle && users.length > 0
                        ? {
                              title: listTitle,
                              users,
                              ownerId,
                          }
                        : undefined
                }
                refetchList={refetch}
                disableClearSelected={selectedItemsCount === 0}
                disableClearAll={items.length === 0}
            />

            <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmConfig?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>
                            {confirmConfig?.cancelLabel || 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                            {confirmConfig?.actionLabel || 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ItemsPage;
