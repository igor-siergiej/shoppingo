import type { User } from '@shoppingo/types';
import { MongoClient } from 'mongodb';
import { resolveMongoUri } from './mongo-uri';

const DB_NAME = 'shoppingo_e2e';

/** Canonical sorted pair — mirrors the API's canonicalPair. */
const sortPair = (a: User, b: User): { userIds: [string, string]; users: [User, User] } =>
    a.id < b.id ? { userIds: [a.id, b.id], users: [a, b] } : { userIds: [b.id, a.id], users: [b, a] };

/**
 * Seed a mutual friendship directly into Mongo. Sharing now requires the two
 * users to be friends, so e2e sharing tests establish the friendship this way
 * (there is no single-token API path to pair two distinct users).
 */
export async function seedFriendship(a: User, b: User): Promise<void> {
    const client = new MongoClient(resolveMongoUri());
    await client.connect();
    try {
        const { userIds, users } = sortPair(a, b);
        await client
            .db(DB_NAME)
            .collection('friendships')
            .updateOne(
                { userIds },
                { $setOnInsert: { id: `friendship-${userIds.join('-')}`, userIds, users, createdAt: new Date() } },
                { upsert: true }
            );
    } finally {
        await client.close();
    }
}
