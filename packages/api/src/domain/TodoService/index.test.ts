import { beforeEach, describe, expect, it } from 'bun:test';
import type { Todo } from '@shoppingo/types';
import { TodoService } from './index';

class MockRepo {
    store = new Map<string, Todo>();
    cleared: Array<{ labelId: string; ownerId: string }> = [];
    async insert(t: Todo) {
        this.store.set(t.id, t);
        return t;
    }
    async getById(id: string) {
        return this.store.get(id) ?? null;
    }
    async findByOwnerId(ownerId: string) {
        return [...this.store.values()].filter((t) => t.ownerId === ownerId);
    }
    async update(id: string, t: Todo) {
        this.store.set(id, t);
        return t;
    }
    async deleteById(id: string) {
        this.store.delete(id);
    }
    async clearLabel(labelId: string, ownerId: string) {
        this.cleared.push({ labelId, ownerId });
    }
}

class MockIds {
    private n = 0;
    generate() {
        this.n += 1;
        return `id-${this.n}`;
    }
}

describe('TodoService', () => {
    let repo: MockRepo;
    let svc: TodoService;

    beforeEach(() => {
        repo = new MockRepo();
        svc = new TodoService(repo as never, new MockIds() as never);
    });

    it('creates a todo with id, ownerId, dateAdded, done=false', async () => {
        const todo = await svc.createTodo('u1', { title: 'Buy milk' });
        expect(todo.id).toBe('id-1');
        expect(todo.ownerId).toBe('u1');
        expect(todo.done).toBe(false);
        expect(todo.dateAdded).toBeInstanceOf(Date);
    });

    it('lists todos for the owner only', async () => {
        await svc.createTodo('u1', { title: 'A' });
        await svc.createTodo('u2', { title: 'B' });
        const mine = await svc.getTodosByOwner('u1');
        expect(mine).toHaveLength(1);
        expect(mine[0].title).toBe('A');
    });

    it('updates an owned todo', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        const updated = await svc.updateTodo(t.id, 'u1', { title: 'A2' });
        expect(updated.title).toBe('A2');
    });

    it('rejects update by a non-owner with 403', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        expect(svc.updateTodo(t.id, 'intruder', { title: 'x' })).rejects.toMatchObject({ status: 403 });
    });

    it('rejects update of a missing todo with 404', async () => {
        expect(svc.updateTodo('nope', 'u1', { title: 'x' })).rejects.toMatchObject({ status: 404 });
    });

    it('deletes an owned todo', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        await svc.deleteTodo(t.id, 'u1');
        expect(await repo.getById(t.id)).toBeNull();
    });

    it('rejects delete by non-owner with 403', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        expect(svc.deleteTodo(t.id, 'intruder')).rejects.toMatchObject({ status: 403 });
    });

    it('toggles done for a non-recurring todo', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        const on = await svc.toggleComplete(t.id, 'u1');
        expect(on.done).toBe(true);
        const off = await svc.toggleComplete(t.id, 'u1');
        expect(off.done).toBe(false);
    });

    it('adds and removes a date in completedDates for a recurring todo', async () => {
        const t = await svc.createTodo('u1', {
            title: 'Standup',
            recurrence: { freq: 'daily', interval: 1 },
        });
        const added = await svc.toggleComplete(t.id, 'u1', '2026-06-04');
        expect(added.completedDates).toEqual(['2026-06-04']);
        const removed = await svc.toggleComplete(t.id, 'u1', '2026-06-04');
        expect(removed.completedDates).toEqual([]);
    });

    it('coerces a string dueDate to a Date on create', async () => {
        const t = await svc.createTodo('u1', { title: 'A', dueDate: '2026-06-29T00:00:00.000Z' as never });
        expect(t.dueDate).toBeInstanceOf(Date);
        expect((t.dueDate as Date).toISOString()).toBe('2026-06-29T00:00:00.000Z');
    });

    it('coerces a string recurrence.until to a Date on create', async () => {
        const t = await svc.createTodo('u1', {
            title: 'A',
            dueDate: '2026-06-29T00:00:00.000Z' as never,
            recurrence: { freq: 'daily', interval: 1, until: '2026-07-29T00:00:00.000Z' as never },
        });
        expect(t.recurrence?.until).toBeInstanceOf(Date);
    });

    it('coerces a string dueDate to a Date on update', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        const updated = await svc.updateTodo(t.id, 'u1', { dueDate: '2026-06-29T00:00:00.000Z' as never });
        expect(updated.dueDate).toBeInstanceOf(Date);
    });
});
