import { useUser } from '@imapps/web-utils';
import { AlertTriangle, ListPlus, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useQuery } from 'react-query';

import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { addList, getListsQuery } from '../../api';
import ListsList from '../../components/ListsList';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import ToolBar, { type ToolBarRef } from '../../components/ToolBar';
import { logger } from '../../utils/logger';

const ListsPage = () => {
    const { user } = useUser();
    const toolbarRef = useRef<ToolBarRef>(null);
    const { data, isLoading, isError, refetch } = useQuery({
        ...getListsQuery(user?.id || ''),
        enabled: !!user?.id,
    });

    useEffect(() => {
        if (user?.id) {
            logger.info('Lists page loaded', { userId: user.id, username: user.username });
        }
    }, [user?.id, user?.username]);

    if (!user?.id) {
        logger.warn('Lists page accessed without user');
        return <div>User not available</div>;
    }

    // Separate lists into "Your Lists" and "Shared Lists"
    const yourLists = data?.filter((list) => list.users.length === 1 && list.users[0].username === user.username) || [];

    const sharedLists =
        data?.filter((list) => !(list.users.length === 1 && list.users[0].username === user.username)) || [];

    const pageContent = (
        <div className="flex flex-col space-y-6">
            {/* Your Lists Section */}
            <div>
                <h2 className="text-lg font-semibold mb-3 text-foreground">Your Lists</h2>
                {yourLists.length > 0 ? (
                    <ListsList lists={yourLists} refetch={refetch} />
                ) : (
                    <Empty className="flex-none justify-start p-4">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ListPlus />
                            </EmptyMedia>
                            <EmptyTitle>No lists yet</EmptyTitle>
                            <EmptyDescription>Create your first list to get started</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button onClick={() => toolbarRef.current?.openDrawer()}>Create List</Button>
                        </EmptyContent>
                    </Empty>
                )}
            </div>

            {/* Shared Lists Section */}
            <div>
                <h2 className="text-lg font-semibold mb-3 text-foreground">Shared Lists</h2>
                {sharedLists.length > 0 ? (
                    <ListsList lists={sharedLists} refetch={refetch} />
                ) : (
                    <Empty className="flex-none justify-start p-4">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Users />
                            </EmptyMedia>
                            <EmptyTitle>No shared lists</EmptyTitle>
                            <EmptyDescription>
                                Shared lists will appear here when someone shares one with you
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </div>
    );

    const handleAddList = async (listTitle: string, selectedUsers?: Array<string>) => {
        if (!user) {
            logger.warn('Attempted to add list without user');

            return;
        }

        logger.info('Creating list', { listTitle, sharedWith: selectedUsers?.length || 0 });

        try {
            await addList(listTitle, user, selectedUsers);
            logger.info('List created successfully', { listTitle, sharedWith: selectedUsers?.length || 0 });
            await refetch();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to create list', { listTitle, error: errorMessage });
        }
    };

    const errorPageContent = (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex items-center gap-3 text-destructive mb-3">
                <AlertTriangle className="h-6 w-6" />
                <span className="font-semibold">Unable to load your lists</span>
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

    return (
        <>
            {isError && errorPageContent}
            {isLoading && <ListsSkeleton />}
            {!isLoading && !isError && pageContent}

            <ToolBar ref={toolbarRef} handleAdd={handleAddList} placeholder="Enter list name..." />
        </>
    );
};

export default ListsPage;
