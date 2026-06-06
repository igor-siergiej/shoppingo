import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Recurrence, Todo } from '@shoppingo/types';

import type { TodoRepository } from '../TodoRepository';

export interface CreateTodoInput {
    title: string;
    dueDate?: Date;
    time?: string;
    labelId?: string;
    recurrence?: Recurrence;
}

export type UpdateTodoInput = Partial<Omit<Todo, 'id' | 'ownerId' | 'dateAdded'>>;

const forbidden = () => Object.assign(new Error('Forbidden'), { status: 403 });
const notFound = () => Object.assign(new Error('Todo not found'), { status: 404 });

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

    async createTodo(ownerId: string, input: CreateTodoInput): Promise<Todo> {
        const todo: Todo = {
            id: this.idGenerator.generate(),
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

    async updateTodo(todoId: string, ownerId: string, input: UpdateTodoInput): Promise<Todo> {
        const existing = await this.getOwned(todoId, ownerId);
        const merged: Todo = { ...existing, ...input };
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
            const completedDates = current.includes(date)
                ? current.filter((d) => d !== date)
                : [...current, date];
            return this.repo.update(todoId, { ...todo, completedDates });
        }

        return this.repo.update(todoId, { ...todo, done: !todo.done });
    }
}
