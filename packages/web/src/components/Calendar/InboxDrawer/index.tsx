import type { Todo } from '@shoppingo/types';
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { useState } from 'react';
import { InboxDrawerItem } from './InboxDrawerItem';

export interface InboxDrawerProps {
    todos: Todo[]; // undated todos
    onDelete: (todoId: string) => void;
    schedulingTodoId: string | null;
    onToggleScheduling: (todoId: string) => void;
}

export const InboxDrawer = ({ todos, onDelete, schedulingTodoId, onToggleScheduling }: InboxDrawerProps) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-24 left-0 right-0 z-30 px-4">
            <div className="mx-auto max-w-[500px] rounded-t-xl border bg-background shadow-lg">
                <button
                    type="button"
                    data-testid="inbox-toggle"
                    className="flex w-full items-center justify-between px-4 py-2"
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className="flex items-center gap-2 text-sm font-medium">
                        <Inbox className="h-4 w-4" />
                        Inbox ({todos.length})
                    </span>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
                {schedulingTodoId && (
                    <div className="flex items-center justify-between px-4 pb-2 text-xs text-primary">
                        <span>Tap a day to schedule it</span>
                        <button
                            type="button"
                            onClick={() => onToggleScheduling(schedulingTodoId)}
                            className="font-medium underline"
                        >
                            Cancel
                        </button>
                    </div>
                )}
                {open && (
                    <ul className="max-h-48 overflow-y-auto px-4 pb-3 space-y-1.5">
                        {todos.length === 0 && (
                            <li className="text-sm text-muted-foreground py-2">Nothing unscheduled</li>
                        )}
                        {todos.map((todo) => (
                            <InboxDrawerItem
                                key={todo.id}
                                todo={todo}
                                scheduling={schedulingTodoId === todo.id}
                                onDelete={() => onDelete(todo.id)}
                                onToggleScheduling={() => {
                                    onToggleScheduling(todo.id);
                                    setOpen(false);
                                }}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
