import { useQuery } from 'react-query';

import { addList, getListsQuery } from '../../api';
import ListsList from '../../components/ListsList';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar from '../../components/ToolBar';
import { useUser } from '../../context/UserContext';

const ListsPage = () => {
    const { user } = useUser();
    const { data, isLoading, isError, refetch } = useQuery({
        ...getListsQuery(user?.id || ''),
        enabled: !!user?.id,
    });

    if (!user?.id) {
        return <div>User not available</div>;
    }

    // Separate lists into "Your Lists" and "Shared Lists"
    const yourLists = data?.filter(list =>
        list.users.length === 1
        && list.users[0].username === user.username
    ) || [];

    const sharedLists = data?.filter(list =>
        !(list.users.length === 1 && list.users[0].username === user.username)
    ) || [];

    const pageContent = (
        <div className="flex flex-col space-y-6">
            {/* Your Lists Section */}
            <div>
                <h2 className="text-lg font-semibold mb-3 text-foreground">Your Lists</h2>
                {yourLists.length > 0
                    ? (
                            <ListsList lists={yourLists} refetch={refetch} />
                        )
                    : (
                            <p className="text-center pb-4 pt-4 text-muted-foreground">
                                You haven't created any lists yet...
                            </p>
                        )}
            </div>

            {/* Shared Lists Section */}
            <div>
                <h2 className="text-lg font-semibold mb-3 text-foreground">Shared Lists</h2>
                {sharedLists.length > 0
                    ? (
                            <ListsList lists={sharedLists} refetch={refetch} />
                        )
                    : (
                            <p className="text-center pb-4 pt-4 text-muted-foreground">
                                No shared lists available...
                            </p>
                        )}
            </div>
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
