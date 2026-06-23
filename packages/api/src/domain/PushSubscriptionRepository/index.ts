import type { PushSubscription } from '@shoppingo/types';

export interface PushSubscriptionRepository {
    /** Insert or replace a subscription, keyed by its endpoint. */
    upsert(sub: PushSubscription): Promise<void>;
    deleteByEndpoint(endpoint: string): Promise<void>;
    findByUserIds(userIds: string[]): Promise<PushSubscription[]>;
    /** Bulk-remove expired/invalid subscriptions discovered during send. */
    deleteByEndpoints(endpoints: string[]): Promise<void>;
}
