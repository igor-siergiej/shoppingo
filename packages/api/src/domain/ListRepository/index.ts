import { Item, List } from '@shoppingo/types';

export interface ListRepository {
    getByTitle(title: string): Promise<List | null>;
    findByUserId(userId: string): Promise<Array<List>>;
    insert(list: List): Promise<void>;
    deleteByTitle(title: string): Promise<void>;
    replaceByTitle(title: string, list: List): Promise<void>;
    pushItem(title: string, item: Item): Promise<void>;
}
