import type { Item } from '@shoppingo/types';
import { Trash2 } from 'lucide-react';
import { type MouseEvent, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useGuestItemActions } from '../../guest/useGuestActions';

interface GuestItemRowProps {
    item: Item;
    listId: string;
}

// Minimal row for guest items: checkbox, name (inline edit on tap), delete.
// We deliberately skip the swipe/drawer/image/aisle interactions the
// authenticated ItemsPage supports — guests need to feel the core loop
// (add → tick → delete) without the full feature surface.

export const GuestItemRow = ({ item, listId }: GuestItemRowProps) => {
    const { toggleItem, updateItemName, deleteItem } = useGuestItemActions();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(item.name);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleToggle = () => {
        toggleItem(listId, item.id, !item.isSelected);
    };

    const handleSaveEdit = async () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== item.name) {
            try {
                await updateItemName(listId, item.id, trimmed);
            } catch (error) {
                console.error('Failed to rename guest item', error);
                setDraft(item.name);
            }
        } else {
            setDraft(item.name);
        }
        setIsEditing(false);
    };

    const handleDelete = async (event?: MouseEvent) => {
        event?.stopPropagation();
        setIsDeleting(true);
        await deleteItem(listId, item.id);
    };

    if (isDeleting) return null;

    return (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 mb-2">
            <input
                type="checkbox"
                checked={item.isSelected}
                onChange={handleToggle}
                aria-label={`Mark ${item.name} as ${item.isSelected ? 'needed' : 'bought'}`}
                className="h-5 w-5 accent-primary"
            />
            {isEditing ? (
                <Input
                    purpose="name"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSaveEdit();
                        else if (event.key === 'Escape') {
                            setDraft(item.name);
                            setIsEditing(false);
                        }
                    }}
                    className="flex-1"
                    autoFocus
                />
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setDraft(item.name);
                        setIsEditing(true);
                    }}
                    className={`flex-1 text-left ${item.isSelected ? 'line-through text-muted-foreground' : ''}`}
                >
                    {item.name}
                    {(item.quantity !== undefined || item.unit) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                            {[item.quantity, item.unit].filter(Boolean).join(' ')}
                        </span>
                    )}
                </button>
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                aria-label={`Delete ${item.name}`}
                className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
                <Trash2 size={18} strokeWidth={1.75} />
            </Button>
        </div>
    );
};
