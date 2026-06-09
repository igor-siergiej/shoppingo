import type { Label } from '@shoppingo/types';
import { Checkbox } from '../../ui/checkbox';
import { SwipeableRow } from '../SwipeableRow';

export interface DayTodoItem {
    todoId: string;
    title: string;
    time?: string;
    done: boolean;
    labelColor?: string;
    dimmed?: boolean;
    occurrenceDay: string; // dayKey of the occurrence
}

export interface DayTodoListProps {
    items: DayTodoItem[];
    labels: Label[];
    onToggle: (todoId: string, occurrenceDay: string) => void;
    onDelete: (todoId: string) => void;
}

interface DayTodoRowProps {
    item: DayTodoItem;
    onToggle: (todoId: string, occurrenceDay: string) => void;
    onDelete: (todoId: string) => void;
}

const DayTodoRow = ({ item, onToggle, onDelete }: DayTodoRowProps) => {
    const rowClass = `flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 transition-opacity ${item.dimmed ? 'opacity-40' : ''}`;
    const titleClass = item.done ? 'line-through text-muted-foreground' : '';
    return (
        <li data-todo-title={item.title}>
            <SwipeableRow onDelete={() => onDelete(item.todoId)}>
                <div className={rowClass}>
                    <span className="w-1 self-stretch rounded" style={{ backgroundColor: item.labelColor }} />
                    <Checkbox checked={item.done} onCheckedChange={() => onToggle(item.todoId, item.occurrenceDay)} />
                    <span className="text-xs text-muted-foreground w-12">{item.time}</span>
                    <span className={titleClass}>{item.title}</span>
                </div>
            </SwipeableRow>
        </li>
    );
};

export const DayTodoList = ({ items, onToggle, onDelete }: DayTodoListProps) => {
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No todos for this day</p>;
    }
    return (
        <ul className="space-y-2 py-2">
            {items.map((item) => (
                <DayTodoRow
                    key={`${item.todoId}-${item.occurrenceDay}`}
                    item={item}
                    onToggle={onToggle}
                    onDelete={onDelete}
                />
            ))}
        </ul>
    );
};
