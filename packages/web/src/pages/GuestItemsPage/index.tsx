import type { ListType } from '@shoppingo/types';
import { ShoppingBasket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import ToolBar from '../../components/ToolBar';
import { Button } from '../../components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshContext';
import { useGuestItemActions, useGuestListActions } from '../../guest/useGuestActions';
import { useGuestItems } from '../../guest/useGuestQueries';
import { useConfirmation } from '../../hooks/useConfirmation';
import { logger } from '../../utils/logger';
import { GuestModeBanner } from '../GuestModeBanner';
import { GuestItemRow } from './GuestItemRow';

const GuestItemsPage = () => {
    const { listId } = useParams<{ listId: string }>();
    const navigate = useNavigate();
    const [currentListType] = useState<ListType>('shopping' as ListType);
    const { confirm, isOpen, config, handleConfirm, handleCancel } = useConfirmation();
    const { registerRefresh } = usePullToRefreshContext();
    const { data, refetch } = useGuestItems(listId ?? '');
    const { addItem, clearList, clearSelected } = useGuestItemActions();
    const { deleteList } = useGuestListActions();

    useEffect(() => {
        return registerRefresh(async () => {
            await refetch();
        });
    }, [registerRefresh, refetch]);

    useEffect(() => {
        if (listId) {
            logger.info('Guest items page loaded', { listId });
        }
    }, [listId]);

    if (!listId) {
        return <div className="p-4">Need a valid list</div>;
    }

    if (!data) {
        return (
            <div className="p-4 space-y-3">
                <p className="text-muted-foreground">This list isn't on this device anymore.</p>
                <Button onClick={() => navigate('/')}>Back to lists</Button>
            </div>
        );
    }

    const items = data.items;
    const selectedCount = items.filter((it) => it.isSelected).length;

    const handleAddItem = async (itemName: string, quantity?: number, unit?: string) => {
        await addItem({
            listId,
            name: itemName,
            ...(quantity !== undefined && { quantity }),
            ...(unit !== undefined && { unit }),
        });
    };

    const handleClearSelected = () => {
        confirm({
            title: 'Clear selected items?',
            description: `Remove the ${selectedCount} ticked items from "${data.title}". This can't be undone.`,
            actionLabel: 'Clear selected',
            onConfirm: async () => {
                await clearSelected(listId);
            },
        });
    };

    const handleRemoveAll = () => {
        confirm({
            title: 'Clear the list?',
            description: `Remove every item from "${data.title}". This can't be undone.`,
            actionLabel: 'Clear all',
            onConfirm: async () => {
                await clearList(listId);
            },
        });
    };

    const handleDeleteList = () => {
        confirm({
            title: 'Delete list?',
            description: `"${data.title}" lives only on this device. Deleting removes it for good.`,
            actionLabel: 'Delete list',
            onConfirm: async () => {
                await deleteList(listId);
                navigate('/');
            },
        });
    };

    const isEmpty = items.length === 0;

    return (
        <>
            <GuestModeBanner />

            <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <div>
                    <h1 className="text-xl font-semibold">{data.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        {items.length === 0
                            ? 'No items yet'
                            : `${items.length} item${items.length === 1 ? '' : 's'}, ${selectedCount} ticked`}
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleDeleteList} aria-label="Delete list">
                    Delete list
                </Button>
            </div>

            {isEmpty ? (
                <Empty className="flex-none justify-start p-4">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShoppingBasket />
                        </EmptyMedia>
                        <EmptyTitle>Empty list</EmptyTitle>
                        <EmptyDescription>Add the first thing you need and tick it off as you shop.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div>
                    {items.map((item) => (
                        <GuestItemRow key={item.id} item={item} listId={listId} />
                    ))}
                </div>
            )}

            <ToolBar
                onAddItem={handleAddItem}
                handleClearSelected={handleClearSelected}
                handleRemoveAll={handleRemoveAll}
                currentListType={currentListType}
                placeholder="Enter item name..."
                disableClearSelected={selectedCount === 0}
                disableClearAll={isEmpty}
            />

            <ConfirmationDialog
                open={isOpen}
                title={config?.title}
                description={config?.description}
                cancelLabel={config?.cancelLabel}
                actionLabel={config?.actionLabel}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
            />
        </>
    );
};

export default GuestItemsPage;
