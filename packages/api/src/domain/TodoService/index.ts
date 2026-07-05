import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Recurrence, Todo } from '@shoppingo/types';

import type { TodoRepository } from '../TodoRepository';

export interface CreateTodoInput {
    title: string;
    dueDate?: string;
    time?: string;
    labelId?: string;
    recurrence?: Recurrence;
    id?: string;
}

export type UpdateTodoInput = Partial<Omit<Todo, 'id' | 'ownerId' | 'dateAdded'>>;

const forbidden = () => Object.assign(new Error('Forbidden'), { status: 403 });
const notFound = () => Object.assign(new Error('Todo not found'), { status: 404 });

/**
 * dueDate/recurrence.until are timezone-agnostic YYYY-MM-DD days. Clients send that directly,
 * but a legacy client (or a Date serialized to ISO) may send a full instant — keep only the
 * day part so day-string range queries and calendar bucketing stay tz-stable.
 */
const toDay = (value: string): string => value.slice(0, 10);

const normalizeDays = <T extends { dueDate?: string; recurrence?: Recurrence }>(input: T): T => ({
    ...input,
    ...(input.dueDate !== undefined && { dueDate: toDay(input.dueDate) }),
    ...(input.recurrence?.until !== undefined && {
        recurrence: { ...input.recurrence, until: toDay(input.recurrence.until) },
    }),
});

export class TodoService {
    constructor(
        private readonly repo: TodoRepository,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger
    ) {}

    private async getOwned(todoId: string, ownerId: string): Promise<Todo> {
        const todo = await this.repo.getById(todoId);
        if (!todo) throw notFound();
        if (todo.ownerId !== ownerId) throw forbidden();
        return todo;
    }

    async createTodo(ownerId: string, rawInput: CreateTodoInput): Promise<Todo> {
        const input = normalizeDays(rawInput);
        if (input.id) {
            const existing = await this.repo.getById(input.id);
            if (existing && existing.ownerId === ownerId) {
                return existing;
            }
        }
        const todo: Todo = {
            id: input.id ?? this.idGenerator.generate(),
            ownerId,
            title: input.title,
            done: false,
            dateAdded: new Date(),
            ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
            ...(input.time !== undefined && { time: input.time }),
            ...(input.labelId !== undefined && { labelId: input.labelId }),
            ...(input.recurrence !== undefined && { recurrence: input.recurrence, completedDates: [] }),
        };
        await this.repo.insert(todo);
        this.logger?.info('Todo created', { todoId: todo.id, ownerId });
        return todo;
    }

    async getTodosByOwner(ownerId: string): Promise<Todo[]> {
        return this.repo.findByOwnerId(ownerId);
    }

    async updateTodo(todoId: string, ownerId: string, rawInput: UpdateTodoInput): Promise<Todo> {
        const existing = await this.getOwned(todoId, ownerId);
        const merged: Todo = { ...existing, ...normalizeDays(rawInput) };
        return this.repo.update(todoId, merged);
    }

    async deleteTodo(todoId: string, ownerId: string): Promise<void> {
        await this.getOwned(todoId, ownerId);
        await this.repo.deleteById(todoId);
    }

    async toggleComplete(todoId: string, ownerId: string, date?: string): Promise<Todo> {
        const todo = await this.getOwned(todoId, ownerId);

        if (todo.recurrence && date) {
            const current = todo.completedDates ?? [];
            const completedDates = current.includes(date) ? current.filter((d) => d !== date) : [...current, date];
            return this.repo.update(todoId, { ...todo, completedDates });
        }

        return this.repo.update(todoId, { ...todo, done: !todo.done });
    }
}
