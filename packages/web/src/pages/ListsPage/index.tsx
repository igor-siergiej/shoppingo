import { useQuery } from 'react-query';

import { addList, getListsQuery } from '../../api';
import Appbar from '../../components/Appbar';
import { Layout } from '../../components/Layout';
import ListsList from '../../components/ListsList';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar from '../../components/ToolBar';

const ListsPage = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        ...getListsQuery(),
    });

    const pageContent = (
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
    );

    const handleAddList = async (listName: string) => {
        await addList(listName);
        await refetch();
    };

    const errorPageContent = <div>Error has occured</div>;

    return (
        <>
            <Appbar />
            <Layout>
                {isError && errorPageContent}
                {isLoading && <ListsSkeleton />}
                {!isLoading && !isError && pageContent}
            </Layout>

            <ToolBar
                handleAdd={handleAddList}
                placeholder="Enter list name..."
            />
        </>
    );
};

export default ListsPage;
