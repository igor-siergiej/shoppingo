import { Item } from '@shoppingo/types';

export interface ItemCheckBoxListProps {
    items: Array<Item>;
    refetch: () => void;
    listName: string;
}
