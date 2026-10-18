import { type Item, ListType } from '@shoppingo/types';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

// Local-only store for guest sessions: lists and items are persisted in
// IndexedDB so a guest can browse the app, create lists, and add items
// without ever touching the API. On sign-up / log-in the contents are
// migrated to the server (see `migrateGuestToAccount.ts`) and cleared.

export interface GuestList {
    id: string;
    title: string;
    listType: ListType;
    createdAt: number;
}

export interface GuestItem {
    id: string;
    listId: string;
    name: string;
    isSelected: boolean;
    quantity?: number;
    unit?: string;
    createdAt: number;
    /** Monotonic counter for stable ordering when two items land in the same millisecond. */
    seq: number;
}

interface GuestDB extends DBSchema {
    lists: { key: string; value: GuestList };
    items: { key: string; value: GuestItem; indexes: { 'by-list': string } };
}

const DB_NAME = 'shoppingo-guest';
const LISTS_STORE = 'lists';
const ITEMS_STORE = 'items';

let dbPromise: Promise<IDBPDatabase<GuestDB>> | null = null;
const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<GuestDB>(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(LISTS_STORE, { keyPath: 'id' });
                const items = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
                items.createIndex('by-list', 'listId');
            },
        });
    }
    return dbPromise;
};

let listsMirror: GuestList[] = [];
const itemsByListMirror = new Map<string, GuestItem[]>();
const listeners = new Set<() => void>();
const notify = () => {
    for (const cb of listeners) cb();
};

const sortLists = (a: GuestList, b: GuestList) => a.createdAt - b.createdAt;
const sortItems = (a: GuestItem, b: GuestItem) => a.seq - b.seq;

// Monotonic counter so two items queued in the same millisecond still have a
// deterministic order across an IDB read-back. Resets only at module load.
let nextSeq = 0;

export const guestStore = {
    /** Loads everything from IndexedDB into the in-memory mirror. Call once at startup. */
    async hydrate() {
        const db = await getDB();
        listsMirror = (await db.getAll(LISTS_STORE)).sort(sortLists);
        const items = await db.getAll(ITEMS_STORE);
        itemsByListMirror.clear();
        let maxSeq = 0;
        for (const item of items) {
            const bucket = itemsByListMirror.get(item.listId) ?? [];
            bucket.push(item);
            itemsByListMirror.set(item.listId, bucket);
            if (item.seq > maxSeq) maxSeq = item.seq;
        }
        for (const bucket of itemsByListMirror.values()) {
            bucket.sort(sortItems);
        }
        // Resume the in-memory counter past any persisted items so freshly-added
        // items don't tie with — and reorder — ones already in IDB.
        if (maxSeq > nextSeq) nextSeq = maxSeq;
        notify();
    },

    subscribe(cb: () => void): () => void {
        listeners.add(cb);
        return () => listeners.delete(cb);
    },

    /** Returns a fresh array — callers may sort or filter without mutating the mirror. */
    peekLists(): GuestList[] {
        return [...listsMirror];
    },

    peekItems(listId: string): GuestItem[] {
        return [...(itemsByListMirror.get(listId) ?? [])];
    },

    count(): number {
        return listsMirror.length;
    },

    itemCount(): number {
        let total = 0;
        for (const bucket of itemsByListMirror.values()) total += bucket.length;
        return total;
    },

    async createList(input: { title: string; listType?: ListType }): Promise<GuestList> {
        const trimmed = input.title.trim();
        if (!trimmed) throw new Error('List name is required');
        const exists = listsMirror.some((l) => l.title.toLowerCase() === trimmed.toLowerCase());
        if (exists) throw new Error('A list with that name already exists');
        const list: GuestList = {
            id: crypto.randomUUID(),
            title: trimmed,
            listType: input.listType ?? ListType.SHOPPING,
            createdAt: Date.now(),
        };
        const db = await getDB();
        await db.put(LISTS_STORE, list);
        listsMirror = [...listsMirror, list].sort(sortLists);
        notify();
        return list;
    },

    async deleteList(listId: string): Promise<void> {
        const db = await getDB();
        const tx = db.transaction([LISTS_STORE, ITEMS_STORE], 'readwrite');
        await tx.objectStore(LISTS_STORE).delete(listId);
        const index = tx.objectStore(ITEMS_STORE).index('by-list');
        let cursor = await index.openCursor(listId);
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
        listsMirror = listsMirror.filter((l) => l.id !== listId);
        itemsByListMirror.delete(listId);
        notify();
    },

    async addItem(input: { listId: string; name: string; quantity?: number; unit?: string }): Promise<GuestItem> {
        const name = input.name.trim();
        if (!name) throw new Error('Item name is required');
        const list = listsMirror.find((l) => l.id === input.listId);
        if (!list) throw new Error('List not found');
        const item: GuestItem = {
            id: crypto.randomUUID(),
            listId: input.listId,
            name,
            isSelected: false,
            ...(input.quantity !== undefined && { quantity: input.quantity }),
            ...(input.unit !== undefined && { unit: input.unit }),
            createdAt: Date.now(),
            seq: ++nextSeq,
        };
        const db = await getDB();
        await db.put(ITEMS_STORE, item);
        const bucket = itemsByListMirror.get(input.listId) ?? [];
        const next = [...bucket, item].sort(sortItems);
        itemsByListMirror.set(input.listId, next);
        notify();
        return item;
    },

    async toggleItem(itemId: string, isSelected: boolean): Promise<void> {
        const db = await getDB();
        const existing = await db.get(ITEMS_STORE, itemId);
        if (!existing) return;
        const next: GuestItem = { ...existing, isSelected };
        await db.put(ITEMS_STORE, next);
        const bucket = itemsByListMirror.get(existing.listId) ?? [];
        itemsByListMirror.set(
            existing.listId,
            bucket.map((it) => (it.id === itemId ? next : it))
        );
        notify();
    },

    async updateItemName(itemId: string, name: string): Promise<void> {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Item name is required');
        const db = await getDB();
        const existing = await db.get(ITEMS_STORE, itemId);
        if (!existing) return;
        const next: GuestItem = { ...existing, name: trimmed };
        await db.put(ITEMS_STORE, next);
        const bucket = itemsByListMirror.get(existing.listId) ?? [];
        itemsByListMirror.set(
            existing.listId,
            bucket.map((it) => (it.id === itemId ? next : it))
        );
        notify();
    },

    async deleteItem(itemId: string): Promise<void> {
        const db = await getDB();
        const existing = await db.get(ITEMS_STORE, itemId);
        if (!existing) return;
        await db.delete(ITEMS_STORE, itemId);
        const bucket = itemsByListMirror.get(existing.listId) ?? [];
        itemsByListMirror.set(
            existing.listId,
            bucket.filter((it) => it.id !== itemId)
        );
        notify();
    },

    async clearList(listId: string): Promise<void> {
        const db = await getDB();
        const tx = db.transaction(ITEMS_STORE, 'readwrite');
        const index = tx.store.index('by-list');
        let cursor = await index.openCursor(listId);
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
        itemsByListMirror.set(listId, []);
        notify();
    },

    async clearSelected(listId: string): Promise<void> {
        const db = await getDB();
        const tx = db.transaction(ITEMS_STORE, 'readwrite');
        const index = tx.store.index('by-list');
        let cursor = await index.openCursor(listId);
        while (cursor) {
            if (cursor.value.isSelected) await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
        const bucket = itemsByListMirror.get(listId) ?? [];
        itemsByListMirror.set(
            listId,
            bucket.filter((it) => !it.isSelected)
        );
        notify();
    },

    /** Drops every list and item — used after a successful migration to the account. */
    async clear(): Promise<void> {
        const db = await getDB();
        const tx = db.transaction([LISTS_STORE, ITEMS_STORE], 'readwrite');
        await tx.objectStore(LISTS_STORE).clear();
        await tx.objectStore(ITEMS_STORE).clear();
        await tx.done;
        listsMirror = [];
        itemsByListMirror.clear();
        notify();
    },

    /** Snapshots the current state so the migration can iterate without reacting to live writes. */
    snapshot(): { lists: GuestList[]; itemsByList: Map<string, GuestItem[]> } {
        const itemsByList = new Map<string, GuestItem[]>();
        for (const list of listsMirror) {
            itemsByList.set(list.id, [...(itemsByListMirror.get(list.id) ?? [])]);
        }
        return { lists: [...listsMirror], itemsByList };
    },

    async _resetForTests(): Promise<void> {
        const db = await getDB();
        const tx = db.transaction([LISTS_STORE, ITEMS_STORE], 'readwrite');
        await tx.objectStore(LISTS_STORE).clear();
        await tx.objectStore(ITEMS_STORE).clear();
        await tx.done;
        listsMirror = [];
        itemsByListMirror.clear();
        notify();
    },
};

// fallow-ignore-next-line unused-type
export type { Item };
