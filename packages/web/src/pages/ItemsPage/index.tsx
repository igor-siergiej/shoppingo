import { AlertTriangle } from 'lucide-react';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { addItem, clearList, clearSelected, getListQuery } from '../../api';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import { ItemsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar from '../../components/ToolBar';

const ItemsPage = () => {
    const { listTitle } = useParams();
    const navigate = useNavigate();

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listTitle),
    });

    if (!listTitle) {
        return <div>Need a valid list title</div>;
    }

    const errorPageContent = (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex items-center gap-3 text-destructive mb-3">
                <AlertTriangle className="h-6 w-6" />
                <span className="font-semibold">Unable to load items</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm">
                Please check your connection and try again.
            </p>
            <Button variant="default" onClick={() => { void refetch(); }}>
                Retry
            </Button>
        </div>
    );

    const isEmpty = Array.isArray(data) && data.length === 0;

    const pageContent = (
        <div className="flex flex-col">
            {data
                ? (
                        isEmpty
                            ? (
                                    <div className="fixed bottom-28 left-6 z-50 flex items-center gap-3 select-none">
                                        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md shadow">
                                            Press the green button to add items
                                        </div>
                                    </div>
                                )
                            : (
                                    <ItemCheckBoxList
                                        items={data}
                                        refetch={refetch}
                                        listTitle={listTitle}
                                    />
                                )
                    )
                : null}
        </div>
    );

    const handleClearList = async () => {
        await clearList(listTitle);
        await refetch();
    };

    const handleClearSelected = async () => {
        await clearSelected(listTitle);
        await refetch();
    };

    const handleAddItem = async (itemName: string) => {
        await addItem(itemName, listTitle);
        await refetch();
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
