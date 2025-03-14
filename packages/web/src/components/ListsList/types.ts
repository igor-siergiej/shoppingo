import { List } from 'types';

export interface ListsListProps {
    lists: Array<List>;
    refetch: () => void;
}
