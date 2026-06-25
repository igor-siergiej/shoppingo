import type { Todo } from '@shoppingo/types';

export interface TodoRepository {
    getById(todoId: string): Promise<Todo | null>;
    findByOwnerId(ownerId: string): Promise<Todo[]>;
    /** Incomplete todos with a dueDate on or before `dayEnd` — recurring anchors included. */
    findDueCandidates(dayEnd: Date): Promise<Todo[]>;
    insert(todo: Todo): Promise<Todo>;
    update(todoId: string, todo: Todo): Promise<Todo>;
    deleteById(todoId: string): Promise<void>;
    clearLabel(labelId: string, ownerId: string): Promise<void>;
}
