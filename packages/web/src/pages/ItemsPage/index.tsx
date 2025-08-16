import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { addItem, clearList, clearSelected, getListQuery } from '../../api';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import { ItemsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar from '../../components/ToolBar';

const ItemsPage = () => {
    const { listName } = useParams();
    const navigate = useNavigate();

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listName),
    });

    if (!listName) {
        return <div>Need a valid list name</div>;
    }

    const errorPageContent = <div>Error fetching data.</div>;

    const pageContent = (
        <div className="flex flex-col">
            {data
                ? (
                        <ItemCheckBoxList
                            items={data}
                            refetch={refetch}
                            listName={listName}
                        >
                        </ItemCheckBoxList>
                    )
                : (
                        <p className="text-center pb-4 pt-4">
                            This list is empty...
                        </p>
                    )}
        </div>
    );

    const handleClearList = async () => {
        await clearList(listName);
        await refetch();
    };

    const handleClearSelected = async () => {
        await clearSelected(listName);
        await refetch();
    };

    const handleAddItem = async (itemName: string) => {
        await addItem(itemName, listName);
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
