import { addItem, deleteItem, updateItem, updateItemName, updateItemQuantity } from '../api';
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

export const replayIntent = async (intent: OutboxIntent): Promise<void> => {
    const p = intent.payload;
    switch (intent.op) {
        case 'item.add':
            await addItem(
                String(p.name),
                intent.scope,
                p.quantity as number | undefined,
                p.unit as string | undefined,
                intent.targetId
            );
            return;
        case 'item.delete':
            await deleteItem(intent.targetId, intent.scope);
            return;
        case 'item.toggle':
            await updateItem(intent.targetId, Boolean(p.isSelected), intent.scope);
            return;
        case 'item.rename':
            await updateItemName(intent.scope, intent.targetId, String(p.newItemName));
            return;
        case 'item.quantity':
            await updateItemQuantity(
                intent.scope,
                intent.targetId,
                p.quantity as number | undefined,
                p.unit as string | undefined
            );
            return;
    }
};
