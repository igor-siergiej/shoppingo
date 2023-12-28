import { List } from '../../types';

export interface ListsListProps {
    lists: List[];
    refetch: () => void;
}
