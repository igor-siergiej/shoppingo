import type { ListResponse } from '@tandra/types';

export interface ListsListProps {
    lists: Array<ListResponse>;
    refetch: () => void;
    currentUserId: string;
}
