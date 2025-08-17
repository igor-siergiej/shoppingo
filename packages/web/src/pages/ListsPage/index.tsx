import { useQuery } from 'react-query';

import { addList, getListsQuery } from '../../api';
import ListsList from '../../components/ListsList';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar from '../../components/ToolBar';
import { useUser } from '../../context/UserContext';

const ListsPage = () => {
    const { user } = useUser();
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

    const handleAddList = async (listTitle: string) => {
        if (!user) {
            console.error('No user logged in');
            return;
        }
        try {
            await addList(listTitle, user);
            await refetch();
        } catch (error) {
            console.error('Error adding list:', error);
        }
    };

    const errorPageContent = <div>Error has occured</div>;

    return (
        <>
            {isError && errorPageContent}
            {isLoading && <ListsSkeleton />}
            {!isLoading && !isError && pageContent}

            <ToolBar
                handleAdd={handleAddList}
                placeholder="Enter list name..."
            />
        </>
    );
};

export default ListsPage;
