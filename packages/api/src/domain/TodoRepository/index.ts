import type { Todo } from '@shoppingo/types';

export interface TodoRepository {
    getById(todoId: string): Promise<Todo | null>;
    findByOwnerId(ownerId: string): Promise<Todo[]>;
    insert(todo: Todo): Promise<Todo>;
    update(todoId: string, todo: Todo): Promise<Todo>;
    deleteById(todoId: string): Promise<void>;
    clearLabel(labelId: string, ownerId: string): Promise<void>;
}
