import type { Item, List } from '@shoppingo/types';

export interface ListRepository {
    ensureIndexes(): Promise<void>;
    getByTitle(title: string): Promise<List | null>;
    getAll(): Promise<Array<List>>;
    findByUserId(userId: string): Promise<Array<List>>;
    insert(list: List): Promise<void>;
    deleteByTitle(title: string): Promise<void>;
    /**
     * Replaces the list stored under `title` only if its `revision` still equals `list.revision` (the value read
     * with it). Returns the new revision, or null when the list changed or vanished in the meantime.
     */
    replaceIfUnchanged(title: string, list: List): Promise<number | null>;
    pushItem(title: string, item: Item): Promise<void>;
    removeMemberFromAll(memberId: string, ownerId: string): Promise<void>;
}
