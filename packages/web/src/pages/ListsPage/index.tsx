import { useQuery } from 'react-query';
import { addList, getListsQuery } from '../../api';
import Appbar from '../../components/Appbar';
import NewItemForm from '../../components/NewItemForm';
import ListsList from '../../components/ListsList';
import { Layout } from '../../components/Layout';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

const ListsPage = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        ...getListsQuery(),
    });

    const pageContent = (
        <>
            <div className="flex flex-col">
                {data
                    ? (
                            <ListsList lists={data} refetch={refetch} />
                        )
                    : (
                            <p className="text-center pb-4 pt-4">
                                This list is empty...
                            </p>
                        )}
            </div>

            <NewItemForm
                handleAdd={async (listName) => {
                    await addList(listName);
                    await refetch();
                }}
            />
        </>
    );

    const errorPageContent = <div>Error has occured</div>;

    return (
        <>
            <Appbar />
            <Layout>
                {isError && errorPageContent}
                {isLoading && <LoadingSkeleton />}
                {!isLoading && !isError && pageContent}
            </Layout>
        </>
    );
};

export default ListsPage;
