import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Item, List } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import { ListRepository } from '../../domain/ListRepository';

export class MongoListRepository implements ListRepository {
    constructor(
        private readonly db: MongoDbConnection<{ [CollectionNames.List]: List }>
    ) {}

    private collection() {
        return this.db.getCollection(CollectionNames.List);
    }

    async getByTitle(title: string): Promise<List | null> {
        return this.collection().findOne({ title });
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

    async replaceByTitle(title: string, list: List): Promise<void> {
        await this.collection().findOneAndReplace({ title }, list);
    }

    async pushItem(title: string, item: Item): Promise<void> {
        await this.collection().findOneAndUpdate(
            { title },
            { $push: { items: item } }
        );
    }
}
