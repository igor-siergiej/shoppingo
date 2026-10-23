import type { Item, ListType } from '@tandra/types';

export interface ItemCheckBoxListProps {
    items: Array<Item>;
    listTitle: string;
    listType: ListType;
    groupByAisle?: boolean;
    /** False renders a plain checklist and fetches no item images (guests can't generate them). */
    showImages?: boolean;
}
