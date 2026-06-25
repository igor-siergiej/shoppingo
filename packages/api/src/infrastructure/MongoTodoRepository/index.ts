import type { MongoDbConnection } from '@imapps/api-utils';
import type { Todo } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { TodoRepository } from '../../domain/TodoRepository';

export class MongoTodoRepository implements TodoRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.Todo]: Todo }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.Todo);
    }

    async getById(todoId: string): Promise<Todo | null> {
        return this.collection().findOne({ id: todoId });
    }

    async findByOwnerId(ownerId: string): Promise<Todo[]> {
        return this.collection().find({ ownerId }).toArray();
    }

    async findDueCandidates(dayEnd: Date): Promise<Todo[]> {
        return this.collection()
            .find({ done: false, dueDate: { $lte: dayEnd } })
            .toArray();
    }

    async insert(todo: Todo): Promise<Todo> {
        await this.collection().insertOne(todo);
        return todo;
    }

    async update(todoId: string, todo: Todo): Promise<Todo> {
        await this.collection().findOneAndReplace({ id: todoId }, todo);
        const updated = await this.getById(todoId);
        if (!updated) {
            throw new Error('Todo not found');
        }
        return updated;
    }

    async deleteById(todoId: string): Promise<void> {
        await this.collection().deleteOne({ id: todoId });
    }

    async clearLabel(labelId: string, ownerId: string): Promise<void> {
        await this.collection().updateMany({ labelId, ownerId }, { $unset: { labelId: '' } });
    }
}
