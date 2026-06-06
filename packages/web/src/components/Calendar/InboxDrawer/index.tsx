import type { Todo } from '@shoppingo/types';
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { useState } from 'react';

export interface InboxDrawerProps {
    todos: Todo[]; // undated todos
}

export const InboxDrawer = ({ todos }: InboxDrawerProps) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-24 left-0 right-0 z-30 px-4">
            <div className="mx-auto max-w-[500px] rounded-t-xl border bg-background shadow-lg">
                <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2"
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className="flex items-center gap-2 text-sm font-medium">
                        <Inbox className="h-4 w-4" />
                        Inbox ({todos.length})
                    </span>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
                {open && (
                    <ul className="max-h-48 overflow-y-auto px-4 pb-3 space-y-2">
                        {todos.length === 0 && (
                            <li className="text-sm text-muted-foreground py-2">Nothing unscheduled</li>
                        )}
                        {todos.map((todo) => (
                            <li
                                key={todo.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', todo.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                className="cursor-grab rounded-lg bg-muted/40 px-3 py-2 text-sm active:cursor-grabbing"
                            >
                                {todo.title}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
