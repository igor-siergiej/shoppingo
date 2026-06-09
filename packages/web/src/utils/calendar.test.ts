import type { Todo } from '@shoppingo/types';
import { endOfMonth, startOfMonth } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { buildCalendarDayData } from './calendar';

const today = new Date();

const todo = (id: string, labelId?: string): Todo =>
    ({ id, ownerId: 'u', title: id, done: false, dateAdded: today, dueDate: today, labelId }) as Todo;

const ctx = (activeLabels: string[] = []) => ({
    labelColor: new Map<string, string>([['L1', '#ff0000']]),
    activeLabels: new Set(activeLabels),
});

const build = (todos: Todo[], activeLabels: string[]) =>
    buildCalendarDayData(todos, today, today, startOfMonth(today), endOfMonth(today), ctx(activeLabels));

describe('buildCalendarDayData dimming', () => {
    it('dims nothing when no label filter is active', () => {
        const { selectedItems } = build([todo('a', 'L1'), todo('b')], []);
        expect(selectedItems.every((i) => !i.dimmed)).toBe(true);
    });

    it('dims only todos whose label is not active', () => {
        const { selectedItems } = build([todo('a', 'L1'), todo('b')], ['L1']);
        expect(selectedItems.find((i) => i.todoId === 'a')?.dimmed).toBe(false);
        expect(selectedItems.find((i) => i.todoId === 'b')?.dimmed).toBe(true);
    });

    it('keeps all todos in the result when filtering (grey-out, not hide)', () => {
        const { selectedItems } = build([todo('a', 'L1'), todo('b')], ['L1']);
        expect(selectedItems).toHaveLength(2);
    });
});
