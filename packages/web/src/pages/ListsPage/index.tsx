import { useUser } from '@imapps/web-utils';
import type { List, ListType } from '@shoppingo/types';
import { ListPlus, Users } from 'lucide-react';
import { useQuery } from 'react-query';
import { getListsQuery } from '../../api';
import { ListSection } from '../../components/ListSection';
import ListsList from '../../components/ListsList';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import { RetryErrorState } from '../../components/RetryErrorState';
import ToolBar from '../../components/ToolBar';
import { useCreateList } from '../../hooks/useCreateList';
import { useListsPageEffects } from '../../hooks/useListsPageEffects';
import { logger } from '../../utils/logger';

const isSoleOwner = (list: List, username: string | undefined): boolean =>
    list.users.length === 1 && list.users[0].username === username;

const partitionLists = (
    lists: List[] | undefined,
    username: string | undefined
): { yourLists: List[]; sharedLists: List[] } => {
    const all = lists || [];
    return {
        yourLists: all.filter((list) => isSoleOwner(list, username)),
        sharedLists: all.filter((list) => !isSoleOwner(list, username)),
    };
};

// fallow-ignore-next-line complexity
const ListsPage = () => {
    const { user } = useUser();
    const userId = user?.id;
    const username = user?.username;
    const { data, isLoading, isError, refetch } = useQuery({
        ...getListsQuery(userId || ''),
        enabled: Boolean(userId),
    });
    const createList = useCreateList(user);

    useListsPageEffects(user, refetch);

    if (!userId) {
        logger.warn('Lists page accessed without user');
        return <div>User not available</div>;
    }

    const { yourLists, sharedLists } = partitionLists(data, username);

    const pageContent = (
        <div className="flex flex-col space-y-6">
            <ListSection
                title="Your Lists"
                hasItems={yourLists.length > 0}
                emptyIcon={<ListPlus />}
                emptyTitle="No lists yet"
                emptyDescription="Create your first list to get started"
            >
                <ListsList lists={yourLists} refetch={refetch} currentUserId={userId} />
            </ListSection>

            <ListSection
                title="Shared Lists"
                hasItems={sharedLists.length > 0}
                emptyIcon={<Users />}
                emptyTitle="No shared lists"
                emptyDescription="Shared lists will appear here when someone shares one with you"
            >
                <ListsList lists={sharedLists} refetch={refetch} currentUserId={userId} />
            </ListSection>
        </div>
    );

    const handleAddList = async (listTitle: string, listType: ListType, selectedUsers: string[]) => {
        try {
            await createList(listTitle, listType, selectedUsers);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to create list', { listTitle, error: errorMessage });
            throw error;
        }
    };

    const showContent = !isLoading && !isError;

    return (
        <>
            {isError && <RetryErrorState message="Unable to load your lists" onRetry={() => void refetch()} />}
            {isLoading && <ListsSkeleton />}
            {showContent && pageContent}

            <ToolBar onAddList={handleAddList} placeholder="Enter list name..." />
        </>
    );
};

export default ListsPage;
