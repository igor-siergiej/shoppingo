import { describe, expect, it } from 'bun:test';
import type { Todo } from './index';
import { occursOn } from './recurrence';

const base: Todo = {
    id: 't1',
    ownerId: 'u1',
    title: 'Task',
    done: false,
    dateAdded: new Date('2026-06-01'),
};

const day = (s: string) => new Date(s);

describe('occursOn', () => {
    it('true for a single todo due on the day', () => {
        expect(occursOn({ ...base, dueDate: day('2026-06-25') }, day('2026-06-25'))).toBe(true);
    });

    it('false for a single todo due on another day', () => {
        expect(occursOn({ ...base, dueDate: day('2026-06-24') }, day('2026-06-25'))).toBe(false);
    });

    it('false for a done single todo', () => {
        expect(occursOn({ ...base, done: true, dueDate: day('2026-06-25') }, day('2026-06-25'))).toBe(false);
    });

    it('true for a daily recurrence landing on the day', () => {
        const todo: Todo = { ...base, dueDate: day('2026-06-01'), recurrence: { freq: 'daily', interval: 1 } };
        expect(occursOn(todo, day('2026-06-25'))).toBe(true);
    });

    it('false when recurrence has ended via until', () => {
        const todo: Todo = {
            ...base,
            dueDate: day('2026-06-01'),
            recurrence: { freq: 'daily', interval: 1, until: day('2026-06-10') },
        };
        expect(occursOn(todo, day('2026-06-25'))).toBe(false);
    });

    it('false when the recurring instance is already completed for that day', () => {
        const todo: Todo = {
            ...base,
            dueDate: day('2026-06-01'),
            recurrence: { freq: 'daily', interval: 1 },
            completedDates: ['2026-06-25'],
        };
        expect(occursOn(todo, day('2026-06-25'))).toBe(false);
    });

    it('false for an unscheduled (Inbox) todo with no dueDate', () => {
        expect(occursOn(base, day('2026-06-25'))).toBe(false);
    });
});
