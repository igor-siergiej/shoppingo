import type { ListType, User } from '@shoppingo/types';
import { useQueryClient } from 'react-query';
import { drainOutbox } from '../offline/drainer';
import { outboxStore } from '../offline/outboxStore';
import { logger } from '../utils/logger';

export const useCreateList = (user: User | undefined) => {
    const queryClient = useQueryClient();
    return async (title: string, listType: ListType, selectedUsers: string[]) => {
        if (!user) {
            logger.warn('Attempted to add list without user');
            return;
        }
        const id = crypto.randomUUID();
        queryClient.setQueryData(['lists', user.id], (old: unknown) => {
            const lists = (old as unknown[]) ?? [];
            return [
                ...lists,
                { id, title, dateAdded: new Date(), items: [], users: [user], listType, ownerId: user.id },
            ];
        });
        await outboxStore.enqueue({
            id: crypto.randomUUID(),
            entityType: 'list',
            op: 'list.create',
            targetId: id,
            scope: user.id,
            payload: { title, listType, selectedUsers, user, ownerId: user.id },
            createdAt: Date.now(),
        });
        void drainOutbox();
        logger.info('List create queued', { listTitle: title, listType });
    };
};
