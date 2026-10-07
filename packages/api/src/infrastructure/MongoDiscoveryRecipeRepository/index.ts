import type { MongoDbConnection } from '@imapps/api-utils';
import type { DiscoveryRecipe, DiscoverySource } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { DiscoveryRecipeRepository } from '../../domain/DiscoveryRecipeRepository';

// `_id` is Mongo bookkeeping, not part of the library contract.
const NO_OBJECT_ID = { projection: { _id: 0 } } as const;

export class MongoDiscoveryRecipeRepository implements DiscoveryRecipeRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.DiscoveryRecipe]: DiscoveryRecipe }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.DiscoveryRecipe);
    }

    async ensureIndexes(): Promise<void> {
        await this.collection().createIndex({ id: 1 }, { unique: true });
    }

    async getById(id: string): Promise<DiscoveryRecipe | null> {
        return this.collection().findOne({ id }, NO_OBJECT_ID);
    }

    async upsert(recipe: DiscoveryRecipe): Promise<void> {
        await this.collection().replaceOne({ id: recipe.id }, recipe, { upsert: true });
    }

    async deleteById(id: string): Promise<void> {
        await this.collection().deleteOne({ id });
    }

    async listRevisions(
        source: DiscoverySource
    ): Promise<Array<Pick<DiscoveryRecipe, 'id' | 'sourceRevision' | 'createdAt'>>> {
        return this.collection()
            .find({ source }, { projection: { _id: 0, id: 1, sourceRevision: 1, createdAt: 1 } })
            .toArray() as Promise<Array<Pick<DiscoveryRecipe, 'id' | 'sourceRevision' | 'createdAt'>>>;
    }

    async *batches(size: number): AsyncGenerator<DiscoveryRecipe[]> {
        const cursor = this.collection().find({}, NO_OBJECT_ID).sort({ id: 1 });
        let batch: DiscoveryRecipe[] = [];
        for await (const recipe of cursor) {
            batch.push(recipe as DiscoveryRecipe);
            if (batch.length >= size) {
                yield batch;
                batch = [];
            }
        }
        if (batch.length > 0) yield batch;
    }
}
