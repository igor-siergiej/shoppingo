import type { ListResponse } from '@shoppingo/types';

export interface ShoppingListPickerProps {
    lists: ListResponse[];
    onSelect: (title: string) => void;
}

export const ShoppingListPicker = ({ lists, onSelect }: ShoppingListPickerProps) =>
    lists.length === 0 ? (
        <p className="text-muted-foreground text-sm py-3">No shopping lists yet</p>
    ) : (
        <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
                <button
                    key={list.title}
                    type="button"
                    onClick={() => onSelect(list.title)}
                    className="px-4 py-2 rounded-full border font-medium bg-muted border-muted-foreground/30 text-foreground hover:bg-muted/80 transition-all"
                >
                    {list.title}
                </button>
            ))}
        </div>
    );
