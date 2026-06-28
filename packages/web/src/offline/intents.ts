import type { OutboxIntent } from './outboxStore';

export interface ItemView {
    id: string;
    name: string;
    isSelected: boolean;
    quantity?: number;
    unit?: string;
    dateAdded?: string | Date;
}

export const applyItemIntent = (items: ItemView[], intent: OutboxIntent): ItemView[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'item.add': {
            if (items.some((i) => i.id === intent.targetId)) return items;
            return [
                ...items,
                {
                    id: intent.targetId,
                    name: String(p.name ?? ''),
                    isSelected: false,
                    ...(p.quantity !== undefined && { quantity: Number(p.quantity) }),
                    ...(p.unit !== undefined && { unit: String(p.unit) }),
                },
            ];
        }
        case 'item.delete':
            return items.filter((i) => i.id !== intent.targetId);
        case 'item.toggle':
            return items.map((i) => (i.id === intent.targetId ? { ...i, isSelected: Boolean(p.isSelected) } : i));
        case 'item.rename':
            return items.map((i) => (i.id === intent.targetId ? { ...i, name: String(p.newItemName) } : i));
        case 'item.quantity':
            return items.map((i) =>
                i.id === intent.targetId
                    ? {
                          ...i,
                          ...(p.quantity !== undefined && { quantity: Number(p.quantity) }),
                          ...(p.unit !== undefined && { unit: String(p.unit) }),
                      }
                    : i
            );
        default:
            return items;
    }
};

export interface ListView {
    id: string;
    title: string;
    items: unknown[];
    users: Array<{ id: string; username: string }>;
    listType: string;
    ownerId?: string;
    dateAdded?: string | Date;
}

export const applyListIntent = (lists: ListView[], intent: OutboxIntent): ListView[] => {
    const p = intent.payload;
    if (intent.op === 'list.create') {
        if (lists.some((l) => l.id === intent.targetId)) return lists;
        return [
            ...lists,
            {
                id: intent.targetId,
                title: String(p.title ?? ''),
                items: [],
                users: (p.users as ListView['users']) ?? [],
                listType: String(p.listType ?? 'shopping'),
                ...(p.ownerId !== undefined && { ownerId: String(p.ownerId) }),
                dateAdded: new Date(),
            },
        ];
    }
    return lists;
};
