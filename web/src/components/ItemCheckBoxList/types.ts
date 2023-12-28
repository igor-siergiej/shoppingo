import { Item } from '../../types';

export interface ItemCheckBoxListProps {
    items: Item[];
    refetch: () => void;
    listName: string;
}
