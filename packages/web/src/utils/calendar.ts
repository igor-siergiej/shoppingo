import type { Todo } from '@shoppingo/types';
import type { DayTodoItem } from '../components/Calendar/DayTodoList';
import { dayKey } from '../components/Calendar/MonthGrid';
import { expandOccurrences, isoDay } from './recurrence';

interface CalendarDayData {
    dotsByDay: Record<string, string[]>;
    selectedItems: DayTodoItem[];
}

const addOccurrenceToDots = (dots: Record<string, string[]>, key: string, color: string): void => {
    if (!dots[key]) dots[key] = [];
    dots[key].push(color);
};

const toSelectedItem = (todo: Todo, color: string | undefined, occDate: Date, done: boolean): DayTodoItem => ({
    todoId: todo.id,
    title: todo.title,
    time: todo.time,
    done,
    labelColor: color,
    occurrenceDay: isoDay(occDate),
});

export const buildCalendarDayData = (
    visible: Todo[],
    _month: Date,
    selectedDay: Date,
    rangeStart: Date,
    rangeEnd: Date,
    labelColor: Map<string, string>
): CalendarDayData => {
    const dots: Record<string, string[]> = {};
    const items: DayTodoItem[] = [];
    const selectedKey = dayKey(selectedDay);

    for (const todo of visible) {
        const color = todo.labelId ? labelColor.get(todo.labelId) : undefined;
        for (const occ of expandOccurrences(todo, rangeStart, rangeEnd)) {
            const key = dayKey(occ.date);
            addOccurrenceToDots(dots, key, color ?? '#3b82f6');
            if (key === selectedKey) {
                items.push(toSelectedItem(todo, color, occ.date, occ.done));
            }
        }
    }

    return { dotsByDay: dots, selectedItems: items };
};
