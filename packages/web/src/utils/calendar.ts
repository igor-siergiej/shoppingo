import type { Todo } from '@shoppingo/types';
import { addDays } from 'date-fns';
import type { DayTodoItem } from '../components/Calendar/DayTodoList';
import { dayKey } from '../components/Calendar/MonthGrid';
import { expandOccurrences, isoDay } from './recurrence';

interface CalendarDayData {
    dotsByDay: Record<string, string[]>;
    selectedItems: DayTodoItem[];
}

const addOccurrenceToDots = (dots: Record<string, string[]>, key: string, color: string | undefined): void => {
    if (!dots[key]) dots[key] = [];
    dots[key].push(color ?? '#3b82f6');
};

interface CollectCtx {
    selectedKey: string;
    rangeStart: Date;
    rangeEnd: Date;
    labelColor: Map<string, string>;
    dots: Record<string, string[]>;
    items: DayTodoItem[];
}

const collectTodo = (todo: Todo, ctx: CollectCtx): void => {
    const color = todo.labelId ? ctx.labelColor.get(todo.labelId) : undefined;
    for (const occ of expandOccurrences(todo, ctx.rangeStart, ctx.rangeEnd)) {
        const key = dayKey(occ.date);
        addOccurrenceToDots(ctx.dots, key, color);
        if (key === ctx.selectedKey) ctx.items.push(toSelectedItem(todo, color, occ.date, occ.done));
    }
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
    const ctx: CollectCtx = { selectedKey: dayKey(selectedDay), rangeStart, rangeEnd, labelColor, dots, items };

    for (const todo of visible) {
        collectTodo(todo, ctx);
    }

    return { dotsByDay: dots, selectedItems: items };
};

export interface AgendaDay {
    day: Date;
    items: DayTodoItem[];
}

const collectWeekTodo = (
    todo: Todo,
    rangeStart: Date,
    rangeEnd: Date,
    byDay: Map<string, DayTodoItem[]>,
    labelColor: Map<string, string>
): void => {
    const color = todo.labelId ? labelColor.get(todo.labelId) : undefined;
    for (const occ of expandOccurrences(todo, rangeStart, rangeEnd)) {
        const bucket = byDay.get(dayKey(occ.date));
        if (bucket) bucket.push(toSelectedItem(todo, color, occ.date, occ.done));
    }
};

export const buildWeekAgenda = (visible: Todo[], start: Date, labelColor: Map<string, string>): AgendaDay[] => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const byDay = new Map<string, DayTodoItem[]>(days.map((d) => [dayKey(d), []]));

    for (const todo of visible) {
        collectWeekTodo(todo, days[0], days[6], byDay, labelColor);
    }

    return days.map((day) => ({ day, items: byDay.get(dayKey(day)) ?? [] }));
};
