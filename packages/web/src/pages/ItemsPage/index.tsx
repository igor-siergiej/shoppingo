import type { ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getListQuery } from '../../api';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import { ItemsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar from '../../components/ToolBar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useItemPageMutations } from '../../hooks/useItemPageMutations';
import { logger } from '../../utils/logger';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

const ItemsPage = () => {
    const { listTitle } = useParams();
    const navigate = useNavigate();
    const [currentListType, setCurrentListType] = useState<ListType>(ListTypeEnum.SHOPPING);
    const { confirm, isOpen, config: confirmConfig, handleConfirm, handleCancel } = useConfirmation();

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listTitle),
    });

    const listType = data?.listType || ListTypeEnum.SHOPPING;
    const items = data?.items || [];
    const users = data?.users || [];
    const ownerId = data?.ownerId;
    const selectedItemsCount = items.filter((item) => item.isSelected).length;

    const { addItemMutation, clearSelectedMutation, clearListMutation } = useItemPageMutations(listTitle);

    useEffect(() => {
        setCurrentListType(listType);
    }, [listType]);

    useEffect(() => {
        if (listTitle) {
            logger.info('Items page loaded', { listTitle, itemCount: items.length, listType });
        }
    }, [listTitle, items.length, listType]);

    if (!listTitle) {
        return <div>Need a valid list title</div>;
    }

    const isEmpty = items.length === 0;

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
            {isError && <ErrorState onRetry={() => void refetch()} />}
            {!isLoading && !isError && data && (
                <div className="flex flex-col">
                    {isEmpty ? (
                        <EmptyState listType={currentListType} />
                    ) : (
                        <ItemCheckBoxList items={items} listTitle={listTitle} listType={listType} />
                    )}
                </div>
            )}

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
