import { List } from '@shoppingo/types';

export interface ListsListProps {
    lists: Array<List>;
    refetch: () => void;
}
