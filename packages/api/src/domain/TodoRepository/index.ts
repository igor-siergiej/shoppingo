import type { Todo } from '@shoppingo/types';

export interface TodoRepository {
    getById(todoId: string): Promise<Todo | null>;
    findByOwnerId(ownerId: string): Promise<Todo[]>;
    /** Incomplete todos whose dueDate day is on or before `today` (YYYY-MM-DD) — recurring anchors included. */
    findDueCandidates(today: string): Promise<Todo[]>;
    insert(todo: Todo): Promise<Todo>;
    update(todoId: string, todo: Todo): Promise<Todo>;
    deleteById(todoId: string): Promise<void>;
    clearLabel(labelId: string, ownerId: string): Promise<void>;
    /** Todos where userId appears in users[] (shared with them). */
    findByMember(userId: string): Promise<Todo[]>;
    /** Remove memberId from users[] on every todo owned by ownerId. */
    removeMemberFromAll(memberId: string, ownerId: string): Promise<void>;
}
