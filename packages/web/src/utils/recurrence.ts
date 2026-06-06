import type { Recurrence, Todo } from '@shoppingo/types';
import { addDays, addMonths, addWeeks, addYears, format, isAfter, isBefore } from 'date-fns';

export interface Occurrence {
    date: Date;
    done: boolean;
}

export const isoDay = (date: Date): string => format(date, 'yyyy-MM-dd');

const ADDERS = {
    daily: addDays,
    weekly: addWeeks,
    monthly: addMonths,
    yearly: addYears,
} as const;

const step = (date: Date, recurrence: Recurrence): Date => ADDERS[recurrence.freq](date, recurrence.interval);

const normalize = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const expandSingle = (todo: Todo, start: Date, end: Date): Occurrence[] => {
    const anchor = normalize(new Date(todo.dueDate as Date));
    if (isBefore(anchor, start) || isAfter(anchor, end)) return [];
    return [{ date: anchor, done: todo.done }];
};

const resolveLimit = (recurrence: Recurrence, end: Date): Date => {
    if (!recurrence.until) return end;
    const until = normalize(new Date(recurrence.until));
    return isBefore(until, end) ? until : end;
};

const toDoneSet = (dates: string[] | undefined): Set<string> => new Set(dates ?? []);

const expandRecurring = (todo: Todo, start: Date, end: Date): Occurrence[] => {
    const rec = todo.recurrence as Recurrence;
    const completed = toDoneSet(todo.completedDates);
    const limit = resolveLimit(rec, end);
    const occurrences: Occurrence[] = [];
    let cursor = normalize(new Date(todo.dueDate as Date));
    for (let i = 0; i < 1000 && !isAfter(cursor, limit); i += 1) {
        if (!isBefore(cursor, start)) {
            occurrences.push({ date: cursor, done: completed.has(isoDay(cursor)) });
        }
        cursor = step(cursor, rec);
    }
    return occurrences;
};

export const expandOccurrences = (todo: Todo, rangeStart: Date, rangeEnd: Date): Occurrence[] => {
    if (!todo.dueDate) return [];
    const start = normalize(rangeStart);
    const end = normalize(rangeEnd);
    return todo.recurrence ? expandRecurring(todo, start, end) : expandSingle(todo, start, end);
};
