import type { ListType, User } from '@shoppingo/types';
import { addItem, addList, updateItem } from '../api';
import { logger } from '../utils/logger';
import { guestStore } from './guestStore';

// Migration pushes every guest list to the server, then every item inside it.
// Title clashes with lists the user already owns get a numeric suffix and
// are retried; everything else surfaces as a per-list failure so the rest of
// the migration can still proceed. The guest store is cleared only when every
// list has either been uploaded or explicitly recorded as a failure.

export interface MigrateAdapter {
    addList: (title: string, listType: ListType) => Promise<unknown>;
    addItem: (input: {
        listTitle: string;
        id: string;
        name: string;
        quantity?: number;
        unit?: string;
    }) => Promise<unknown>;
    selectItem: (input: { listTitle: string; id: string }) => Promise<unknown>;
}

export interface MigrationFailure {
    listTitle: string;
    reason: string;
}

export interface MigrationResult {
    listsUploaded: number;
    itemsUploaded: number;
    listsRenamed: number;
    /** Total list-level failures. When non-zero the local store is kept so the user can retry. */
    listFailures: number;
    failures: Array<MigrationFailure>;
}

const MAX_RENAME_ATTEMPTS = 100;

const statusOf = (err: unknown): number | undefined => {
    if (!err || typeof err !== 'object' || !('status' in err)) return undefined;
    const status = (err as Record<string, unknown>).status;
    return typeof status === 'number' ? status : undefined;
};

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// fallow-ignore-next-line unused-export
export const createLiveMigrateAdapter = (user: User): MigrateAdapter => ({
    async addList(title, listType) {
        return await addList(title, user, undefined, listType);
    },
    async addItem({ listTitle, id, name, quantity, unit }) {
        return await addItem(name, listTitle, quantity, unit, id);
    },
    async selectItem({ listTitle, id }) {
        return await updateItem(id, true, listTitle);
    },
});

const uploadListWithRename = async (listTitle: string, listType: ListType, adapter: MigrateAdapter) => {
    let attempt = 0;
    let candidate = listTitle;
    // First try the original title; on a 409 the server says the user already
    // has a list of this name, so we append " (1)", " (2)", ... until either
    // it lands or we exhaust the bound.
    while (attempt < MAX_RENAME_ATTEMPTS) {
        try {
            await adapter.addList(candidate, listType);
            return { uploadedTitle: candidate, renamed: attempt > 0 };
        } catch (err) {
            if (statusOf(err) !== 409) throw err;
            attempt += 1;
            candidate = attempt === 1 ? `${listTitle} (1)` : `${listTitle} (${attempt})`;
        }
    }
    throw new Error(`Could not find a free title for "${listTitle}" after ${MAX_RENAME_ATTEMPTS} attempts`);
};

export interface MigrateOptions {
    /** Override for tests; defaults to the live IndexedDB store. */
    store?: typeof guestStore;
}

export const migrateGuestToAccount = async (
    user: User,
    adapter: MigrateAdapter = createLiveMigrateAdapter(user),
    options: MigrateOptions = {}
): Promise<MigrationResult> => {
    const store = options.store ?? guestStore;
    // The in-memory mirror is only filled once a guest page has rendered; a
    // guest who reloads straight onto /register would otherwise look empty.
    await store.hydrate();
    const snapshot = store.snapshot();
    const result: MigrationResult = {
        listsUploaded: 0,
        itemsUploaded: 0,
        listsRenamed: 0,
        listFailures: 0,
        failures: [],
    };

    if (snapshot.lists.length === 0) return result;

    logger.info('Migrating guest data to account', { listCount: snapshot.lists.length });

    for (const list of snapshot.lists) {
        let uploadedTitle: string;
        try {
            const uploaded = await uploadListWithRename(list.title, list.listType, adapter);
            uploadedTitle = uploaded.uploadedTitle;
            if (uploaded.renamed) {
                result.listsRenamed += 1;
                logger.info('Renamed guest list during migration', { from: list.title, to: uploadedTitle });
            }
            result.listsUploaded += 1;
        } catch (err) {
            const reason = messageOf(err);
            logger.error('Failed to migrate guest list', { listTitle: list.title, reason });
            result.listFailures += 1;
            result.failures.push({ listTitle: list.title, reason });
            continue;
        }

        const items = snapshot.itemsByList.get(list.id) ?? [];
        for (const item of items) {
            try {
                // Reusing the guest id keeps the upload idempotent on retry
                // and lets the ticked state follow the item.
                await adapter.addItem({
                    listTitle: uploadedTitle,
                    id: item.id,
                    name: item.name,
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.unit !== undefined && { unit: item.unit }),
                });
                if (item.isSelected) await adapter.selectItem({ listTitle: uploadedTitle, id: item.id });
                result.itemsUploaded += 1;
            } catch (err) {
                const reason = messageOf(err);
                logger.error('Failed to migrate guest item', {
                    listTitle: uploadedTitle,
                    itemName: item.name,
                    reason,
                });
                result.failures.push({ listTitle: uploadedTitle, reason: `item "${item.name}": ${reason}` });
            }
        }
    }

    // Item-level failures don't block: the list already lives on the server, so
    // the user isn't going to retry just for a single item. List-level failures
    // DO block — they leave guest data on the device so a retry can reattach it.
    if (result.listFailures === 0) {
        await store.clear();
        logger.info('Guest data migration complete', {
            listsUploaded: result.listsUploaded,
            itemsUploaded: result.itemsUploaded,
            listsRenamed: result.listsRenamed,
        });
    } else {
        logger.warn('Guest data migration finished with list failures; local store kept', {
            listFailures: result.listFailures,
        });
    }

    return result;
};
