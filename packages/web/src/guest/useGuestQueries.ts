import { useQuery } from '@tanstack/react-query';
import { type GuestItem, type GuestList, guestStore } from './guestStore';

// queryKey conventions match the server hooks so a hand-off from guest to
// authenticated mode can drop in without changing consumers: ['lists', '<id>']
// for the list collection and ['list', '<ref>'] for a single list.
// Writes in useGuestActions invalidate these keys; every fetch re-reads
// IndexedDB so a reload (empty in-memory mirror) still shows the guest's data.
const GUEST_LISTS_KEY = ['lists', 'guest'] as const;
const guestItemsKey = (listId: string) => ['list', listId, 'guest'] as const;

const GUEST_LIST_STALE_MS = 30_000;

interface GuestListView {
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
        queryFn: async () => {
            await guestStore.hydrate();
            const lists = guestStore.peekLists();
            return lists.map((list) => toListView(list, guestStore.peekItems(list.id)));
        },
        staleTime: GUEST_LIST_STALE_MS,
    });

export const useGuestItems = (listId: string) =>
    useQuery<GuestListView | null>({
        queryKey: guestItemsKey(listId),
        queryFn: async () => {
            await guestStore.hydrate();
            const lists = guestStore.peekLists();
            const list = lists.find((l) => l.id === listId);
            if (!list) return null;
            return toListView(list, guestStore.peekItems(listId));
        },
        enabled: !!listId,
        staleTime: GUEST_LIST_STALE_MS,
    });
