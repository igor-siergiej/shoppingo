import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type GuestItem, type GuestList, guestStore } from './guestStore';

// queryKey conventions match the server hooks so a hand-off from guest to
// authenticated mode can drop in without changing consumers: ['lists', '<id>']
// for the list collection and ['list', '<ref>'] for a single list.
const GUEST_LISTS_KEY = ['lists', 'guest'] as const;
const guestItemsKey = (listId: string) => ['list', listId, 'guest'] as const;

const GUEST_LIST_STALE_MS = 30_000;

const useMirrorSnapshot = <T>(queryKey: readonly unknown[], read: () => T) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        // hydrate the mirror from IDB on first mount, then resubscribe so
        // every write triggers a refetch.
        let active = true;
        void guestStore.hydrate().then(() => {
            if (active) queryClient.invalidateQueries({ queryKey });
        });
        const unsub = guestStore.subscribe(() => queryClient.invalidateQueries({ queryKey }));
        return () => {
            active = false;
            unsub();
        };
    }, [queryClient, queryKey]);

    return read();
};

// fallow-ignore-next-line unused-type
export interface GuestListView {
    id: string;
    title: string;
    dateAdded: Date;
    items: Array<GuestItem>;
    users: [];
    listType: GuestList['listType'];
    ownerId: undefined;
    itemCount: number;
}

const toListView = (list: GuestList, items: GuestItem[]): GuestListView => ({
    id: list.id,
    title: list.title,
    dateAdded: new Date(list.createdAt),
    items: items.map((it) => ({
        ...it,
        dateAdded: new Date(it.createdAt),
    })),
    users: [],
    listType: list.listType,
    ownerId: undefined,
    itemCount: items.length,
});

export const useGuestLists = () =>
    useQuery<GuestListView[]>({
        queryKey: GUEST_LISTS_KEY,
        queryFn: () => {
            const lists = guestStore.peekLists();
            return lists.map((list) => toListView(list, guestStore.peekItems(list.id)));
        },
        staleTime: GUEST_LIST_STALE_MS,
    });

export const useGuestItems = (listId: string) =>
    useQuery<GuestListView | null>({
        queryKey: guestItemsKey(listId),
        queryFn: () => {
            const lists = guestStore.peekLists();
            const list = lists.find((l) => l.id === listId);
            if (!list) return null;
            return toListView(list, guestStore.peekItems(listId));
        },
        enabled: !!listId,
        staleTime: GUEST_LIST_STALE_MS,
    });

// fallow-ignore-next-line unused-export
export const useGuestMirrorSubscription = (listId?: string) => {
    const _queryClient = useQueryClient();
    const queryKey = listId ? guestItemsKey(listId) : GUEST_LISTS_KEY;

    useMirrorSnapshot(queryKey, () => {
        // The hook reads happen via the queries above; this exists purely to
        // wire the subscription so writes trigger refetches.
        return null;
    });
};
