import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { DiscoveryRecipe, User } from '@shoppingo/types';
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

const run = promisify(execFile);
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Where the e2e API's discovery index lives. Unset means "no OpenSearch for this run": Discover specs skip.
 * Deliberately NOT `OPENSEARCH_URL`: a developer's .env points that at a real index, and the e2e library must
 * never be written into it.
 */
export const E2E_OPENSEARCH_URL = process.env.E2E_OPENSEARCH_URL;

/** Rebuilds the OpenSearch discovery index from the e2e Mongo library, through the API's own reindex command. */
async function reindexDiscovery(): Promise<void> {
    await run('bun', ['packages/api/scripts/reindex-discovery.ts'], {
        cwd: REPO_ROOT,
        env: {
            ...process.env,
            PORT: '0',
            CONNECTION_URI: resolveMongoUri(),
            DATABASE_NAME: DB_NAME,
            OPENSEARCH_URL: E2E_OPENSEARCH_URL,
            BUCKET_ENDPOINT: 'localhost:9000',
            BUCKET_NAME: 'shoppingo',
            BUCKET_ACCESS_KEY: 'minioadmin',
            BUCKET_SECRET_KEY: 'minioadmin',
        },
    });
}

/** Replaces the e2e discovery library (Mongo, then the index) with exactly `recipes`. */
export async function seedDiscoveryLibrary(recipes: DiscoveryRecipe[]): Promise<void> {
    const client = new MongoClient(resolveMongoUri());
    await client.connect();
    try {
        const collection = client.db(DB_NAME).collection('discoveryRecipes');
        await collection.deleteMany({});
        if (recipes.length > 0) await collection.insertMany(recipes.map((recipe) => ({ ...recipe })));
    } finally {
        await client.close();
    }
    await reindexDiscovery();
}
