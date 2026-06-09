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

export const DayTodoList = ({ items, onToggle, onDelete }: DayTodoListProps) => {
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No todos for this day</p>;
    }
    return (
        <ul className="space-y-2 py-2">
            {items.map((item) => (
                <li key={`${item.todoId}-${item.occurrenceDay}`} data-todo-title={item.title}>
                    <SwipeableRow onDelete={() => onDelete(item.todoId)}>
                        <div
                            className={`flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 transition-opacity ${item.dimmed ? 'opacity-40' : ''}`}
                        >
                            <span
                                className="w-1 self-stretch rounded"
                                style={{ backgroundColor: item.labelColor ?? 'transparent' }}
                            />
                            <Checkbox
                                checked={item.done}
                                onCheckedChange={() => onToggle(item.todoId, item.occurrenceDay)}
                            />
                            <span className="text-xs text-muted-foreground w-12">{item.time ?? 'all day'}</span>
                            <span className={item.done ? 'line-through text-muted-foreground' : ''}>{item.title}</span>
                        </div>
                    </SwipeableRow>
                </li>
            ))}
        </ul>
    );
};
