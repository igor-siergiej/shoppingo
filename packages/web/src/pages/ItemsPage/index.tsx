import type { Item } from '@shoppingo/types';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { addItem, clearList, clearSelected, getListQuery } from '../../api';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import { ItemsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar, { type ToolBarRef } from '../../components/ToolBar';

const ItemsPage = () => {
    const { listTitle } = useParams();
    const navigate = useNavigate();
    const toolbarRef = useRef<ToolBarRef>(null);
    const queryClient = useQueryClient();

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listTitle),
    });

    // Mutation for adding items
    const addItemMutation = useMutation({
        mutationFn: (itemName: string) => addItem(itemName, listTitle),
        onMutate: async (itemName) => {
            await queryClient.cancelQueries([listTitle]);
            const previousItems = queryClient.getQueryData<Item[]>([listTitle]);

            // Optimistically add new item
            const newItem: Item = {
                name: itemName,
                isSelected: false,
                dateAdded: new Date().toISOString(),
            };
            queryClient.setQueryData<Item[]>([listTitle], (old) => (old ? [...old, newItem] : [newItem]));

            return { previousItems };
        },
        onError: (_err, _itemName, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData([listTitle], context.previousItems);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    // Mutation for clearing selected items
    const clearSelectedMutation = useMutation({
        mutationFn: () => clearSelected(listTitle),
        onMutate: async () => {
            await queryClient.cancelQueries([listTitle]);
            const previousItems = queryClient.getQueryData<Item[]>([listTitle]);

            // Optimistically remove selected items
            queryClient.setQueryData<Item[]>([listTitle], (old) => (old ? old.filter((i) => !i.isSelected) : []));

            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData([listTitle], context.previousItems);
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
            const previousItems = queryClient.getQueryData<Item[]>([listTitle]);

            // Optimistically clear all items
            queryClient.setQueryData<Item[]>([listTitle], []);

            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData([listTitle], context.previousItems);
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

    const isEmpty = Array.isArray(data) && data.length === 0;

    const pageContent = (
        <div className="flex flex-col">
            {data ? (
                isEmpty ? (
                    <Empty className="flex-none justify-start p-4">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ShoppingCart />
                            </EmptyMedia>
                            <EmptyTitle>No items yet</EmptyTitle>
                            <EmptyDescription>Start adding items to your shopping list</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button onClick={() => toolbarRef.current?.openDrawer()}>Add Item</Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <ItemCheckBoxList items={data} listTitle={listTitle} />
                )
            ) : null}
        </div>
    );

    const handleClearList = async () => {
        clearListMutation.mutate();
    };

    const handleClearSelected = async () => {
        clearSelectedMutation.mutate();
    };

    const handleAddItem = async (itemName: string) => {
        addItemMutation.mutate(itemName);
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
                ref={toolbarRef}
                handleAdd={handleAddItem}
                handleGoBack={handleGoBack}
                handleClearSelected={handleClearSelected}
                handleRemoveAll={handleClearList}
                placeholder="Enter item name..."
            />
        </>
    );
};

export default ItemsPage;
