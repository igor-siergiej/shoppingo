import type { ListType } from '@shoppingo/types';
import { ListPlus } from 'lucide-react';
import { useEffect } from 'react';
import ToolBar from '../../components/ToolBar';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshContext';
import { useGuestListActions } from '../../guest/useGuestActions';
import { useGuestLists } from '../../guest/useGuestQueries';
import { logger } from '../../utils/logger';
import { GuestModeBanner } from '../GuestModeBanner';
import { GuestListsList } from './GuestListsList';

const GuestListsPage = () => {
    const { data, refetch } = useGuestLists();
    const { registerRefresh } = usePullToRefreshContext();
    const { createList } = useGuestListActions();

    useEffect(() => {
        return registerRefresh(async () => {
            await refetch();
        });
    }, [registerRefresh, refetch]);

    useEffect(() => {
        logger.info('Guest lists page loaded');
    }, []);

    const handleAddList = async (listTitle: string, _listType: ListType, _selectedUsers: string[]) => {
        try {
            await createList({ title: listTitle });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to create guest list', { listTitle, error: errorMessage });
            throw error;
        }
    };

    const lists = data ?? [];

    return (
        <>
            <GuestModeBanner />

            <div className="flex flex-col space-y-6">
                {lists.length > 0 ? (
                    <GuestListsList lists={lists} />
                ) : (
                    <Empty className="flex-none justify-start p-4">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ListPlus />
                            </EmptyMedia>
                            <EmptyTitle>No lists yet</EmptyTitle>
                            <EmptyDescription>
                                Create your first list below. Sign up at any time to keep your lists on every device.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>

            <ToolBar onAddList={handleAddList} placeholder="Enter list name..." />
        </>
    );
};

export default GuestListsPage;
