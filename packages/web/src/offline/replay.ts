import { addItem, deleteItem, updateItem, updateItemName, updateItemQuantity } from '../api';
import type { OutboxIntent } from './outboxStore';

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
