import type { MongoDbConnection } from '@imapps/api-utils';
import type { Item, ItemCategory, List } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { ListRepository } from '../../domain/ListRepository';

export class MongoListRepository implements ListRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.List]: List }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.List);
    }

    // getByTitle/replaceIfUnchanged/pushItem filter on title and findByUserId on users.id; without these every
    // request scans the whole collection (scripts/load/README.md: p95 225 ms -> 9 ms at 200 sessions/s).
    // Not unique: titles are not guaranteed unique in existing data, and a failed unique build would stop startup.
    async ensureIndexes(): Promise<void> {
        await this.collection().createIndex({ title: 1 });
        await this.collection().createIndex({ 'users.id': 1 });
    }

    async getByTitle(title: string): Promise<List | null> {
        return this.collection().findOne({ title });
    }

    async getAll(): Promise<Array<List>> {
        return this.collection().find({}).toArray();
    }

    async findByUserId(userId: string): Promise<Array<List>> {
        return this.collection().find({ 'users.id': userId }).toArray();
    }

    async insert(list: List): Promise<void> {
        await this.collection().insertOne(list);
    }

    async deleteByTitle(title: string): Promise<void> {
        await this.collection().deleteOne({ title });
    }

    async replaceIfUnchanged(title: string, list: List): Promise<number | null> {
        // Lists written before `revision` existed have no field; they match on its absence.
        const revision = list.revision === undefined ? { $exists: false } : list.revision;
        const next = (list.revision ?? 0) + 1;
        const result = await this.collection().replaceOne({ title, revision }, { ...list, revision: next });

        return result.matchedCount === 1 ? next : null;
    }

    // Every writer that does not go through replaceIfUnchanged must bump `revision`, or a concurrent
    // read-modify-write would overwrite its change without noticing.
    async pushItem(title: string, item: Item): Promise<void> {
        await this.collection().findOneAndUpdate({ title }, { $push: { items: item }, $inc: { revision: 1 } });
    }

    async setCategoryIfUnset(title: string, itemId: string, category: ItemCategory): Promise<boolean> {
        const result = await this.collection().updateOne(
            { title },
            { $set: { 'items.$[item].category': category }, $inc: { revision: 1 } },
            { arrayFilters: [{ 'item.id': itemId, 'item.category': { $exists: false } }] }
        );
        return result.modifiedCount === 1;
    }

    async removeMemberFromAll(memberId: string, ownerId: string): Promise<void> {
        await this.collection().updateMany({ ownerId }, { $pull: { users: { id: memberId } }, $inc: { revision: 1 } });
    }
}
