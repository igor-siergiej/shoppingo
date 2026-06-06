import type { Recurrence, Todo } from '@shoppingo/types';
import { addDays, addMonths, addWeeks, addYears, format, isAfter, isBefore } from 'date-fns';

export interface Occurrence {
    date: Date;
    done: boolean;
}

export const isoDay = (date: Date): string => format(date, 'yyyy-MM-dd');

const step = (date: Date, recurrence: Recurrence): Date => {
    const n = recurrence.interval;
    switch (recurrence.freq) {
        case 'daily':
            return addDays(date, n);
        case 'weekly':
            return addWeeks(date, n);
        case 'monthly':
            return addMonths(date, n);
        case 'yearly':
            return addYears(date, n);
    }
};

const normalize = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const expandOccurrences = (todo: Todo, rangeStart: Date, rangeEnd: Date): Occurrence[] => {
    if (!todo.dueDate) {
        return [];
    }

    const anchor = normalize(new Date(todo.dueDate));
    const start = normalize(rangeStart);
    const end = normalize(rangeEnd);
    const completed = new Set(todo.completedDates ?? []);

    if (!todo.recurrence) {
        if (isBefore(anchor, start) || isAfter(anchor, end)) {
            return [];
        }
        return [{ date: anchor, done: todo.done }];
    }

    const hardEnd = todo.recurrence.until ? normalize(new Date(todo.recurrence.until)) : end;
    const limit = isBefore(hardEnd, end) ? hardEnd : end;

    const occurrences: Occurrence[] = [];
    let cursor = anchor;
    // Guard against pathological loops.
    for (let i = 0; i < 1000 && !isAfter(cursor, limit); i += 1) {
        if (!isBefore(cursor, start)) {
            occurrences.push({ date: cursor, done: completed.has(isoDay(cursor)) });
        }
        cursor = step(cursor, todo.recurrence);
    }
    return occurrences;
};
