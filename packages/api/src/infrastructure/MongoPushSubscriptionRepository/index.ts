import type { MongoDbConnection } from '@imapps/api-utils';
import type { PushSubscription } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { PushSubscriptionRepository } from '../../domain/PushSubscriptionRepository';

export class MongoPushSubscriptionRepository implements PushSubscriptionRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.PushSubscription]: PushSubscription }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.PushSubscription);
    }

    async upsert(sub: PushSubscription): Promise<void> {
        await this.collection().replaceOne({ endpoint: sub.endpoint }, sub, { upsert: true });
    }

    async deleteByEndpoint(endpoint: string): Promise<void> {
        await this.collection().deleteOne({ endpoint });
    }

    async findByUserIds(userIds: string[]): Promise<PushSubscription[]> {
        if (userIds.length === 0) {
            return [];
        }
        return this.collection()
            .find({ userId: { $in: userIds } })
            .toArray();
    }

    async deleteByEndpoints(endpoints: string[]): Promise<void> {
        if (endpoints.length === 0) {
            return;
        }
        await this.collection().deleteMany({ endpoint: { $in: endpoints } });
    }
}
