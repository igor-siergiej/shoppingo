import type { Item, ListType, User } from '@shoppingo/types';
import { applyItemIntent, type ItemView } from './intents';
import { outboxStore } from './outboxStore';

export interface ListItemsData {
    listType: ListType;
    items: Item[];
    users: Array<{ id: string; username: string }> | User[];
    ownerId?: string;
}

export const foldPendingItems = (listTitle: string, data: ListItemsData): ListItemsData => {
    const pending = outboxStore.peekAll().filter((i) => i.entityType === 'item' && i.scope === listTitle);
    if (pending.length === 0) return data;
    const items = pending.reduce<ItemView[]>(
        (acc, intent) => applyItemIntent(acc, intent),
        data.items as unknown as ItemView[]
    );
    return { ...data, items: items as unknown as Item[] };
};
