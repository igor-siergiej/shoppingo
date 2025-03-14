import { Item } from 'types';

export interface ItemCheckBoxListProps {
    items: Array<Item>;
    refetch: () => void;
    listName: string;
}
