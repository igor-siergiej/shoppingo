import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { addItem, clearList, clearSelected, getListQuery } from '../../api';
import Appbar from '../../components/Appbar';
import ItemCheckBoxList from '../../components/ItemCheckBoxList';
import NewItemForm from '../../components/NewItemForm';
import { Layout } from '../../components/Layout';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

const ItemsPage = () => {
    const { listName } = useParams();
    const navigate = useNavigate();

    if (!listName) {
        return <div>Need a valid list name</div>;
    }

    const { data, isLoading, isError, refetch } = useQuery({
        ...getListQuery(listName),
    });

    const errorPageContent = <div>Error fetching data.</div>;

    const pageContent = (
        <>
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

            <NewItemForm
                handleAdd={async (itemName) => {
                    await addItem(itemName, listName);
                    await refetch();
                }}
            />
        </>
    );

    const handleClearList = async () => {
        await clearList(listName);
        await refetch();
    };

    const handleClearSelected = async () => {
        await clearSelected(listName);
        await refetch();
    };

    return (
        <>
            <Appbar
                handleClearSelected={handleClearSelected}
                handleRemoveAll={handleClearList}
                handleGoToListsScreen={() => {
                    navigate('/');
                }}
            />
            <Layout>
                {isLoading && <LoadingSkeleton />}
                {isError && errorPageContent}
                {!isLoading && !isError && data && pageContent}
            </Layout>
        </>
    );
};

export default ItemsPage;
