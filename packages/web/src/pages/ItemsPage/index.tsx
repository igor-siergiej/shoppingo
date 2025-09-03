import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';

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

    const errorPageContent = <div>Error fetching data.</div>;

    const pageContent = (
        <div className="flex flex-col">
            {data
                ? (
                        <ItemCheckBoxList
                            items={data}
                            refetch={refetch}
                            listTitle={listTitle}
                        />
                    )
                : (
                        <p className="text-center pb-4 pt-4">
                            This list is empty...
                        </p>
                    )}
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
