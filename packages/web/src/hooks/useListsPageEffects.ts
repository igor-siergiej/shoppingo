import type { User } from '@shoppingo/types';
import { useEffect } from 'react';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';
import { logger } from '../utils/logger';

export const useListsPageEffects = (user: User | undefined, refetch: () => Promise<unknown>) => {
    const { registerRefresh } = usePullToRefreshContext();

    useEffect(() => {
        return registerRefresh(async () => {
            await refetch();
        });
    }, [registerRefresh, refetch]);

    useEffect(() => {
        if (!user?.id) return;
        logger.info('Lists page loaded', { userId: user.id, username: user.username });
    }, [user?.id, user?.username]);
};
