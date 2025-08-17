import { ListResponse } from '@shoppingo/types';

export interface ListsListProps {
    lists: Array<ListResponse>;
    refetch: () => void;
}
