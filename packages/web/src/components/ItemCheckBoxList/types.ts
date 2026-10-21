import type { Item, ListType } from '@tandra/types';

export interface ItemCheckBoxListProps {
    items: Array<Item>;
    listTitle: string;
    listType: ListType;
    groupByAisle?: boolean;
}
