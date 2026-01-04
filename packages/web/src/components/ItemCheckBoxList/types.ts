import type { Item, ListType } from '@shoppingo/types';

export interface ItemCheckBoxListProps {
    items: Array<Item>;
    listTitle: string;
    listType: ListType;
}
