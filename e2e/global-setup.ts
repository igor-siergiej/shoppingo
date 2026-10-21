import { MongoClient, ObjectId } from 'mongodb';
import { E2E_OPENSEARCH_URL, seedDiscoveryLibrary } from './db-helpers';
import { DISCOVERY_FIXTURES } from './discovery-fixtures';
import { MOCK_USER, MOCK_USER_2, PASSWORDS } from './mocks/data/users';
import { resolveMongoUri } from './mongo-uri';

const DB_NAME = 'shoppingo_e2e';

// Writes the two fixture accounts in the shape Better Auth's Mongo adapter stores (user + credential
// account), with fixed ids so specs can name them. Upserts, so a run that died before teardown is harmless.
const seedUsers = async (client: MongoClient) => {
    const db = client.db(DB_NAME);
    const now = new Date();
    for (const user of [MOCK_USER, MOCK_USER_2]) {
        const _id = new ObjectId(user.id);
        await db.collection('user').replaceOne(
            { _id },
            {
                name: user.username,
                email: `${user.id}@users.invalid`,
                emailVerified: false,
                username: user.username.toLowerCase(),
                displayUsername: user.username,
                createdAt: now,
                updatedAt: now,
            },
            { upsert: true }
        );
        await db.collection('account').replaceOne(
            { userId: _id, providerId: 'credential' },
            {
                userId: _id,
                providerId: 'credential',
                accountId: user.id,
                password: await Bun.password.hash(PASSWORDS[user.username], { algorithm: 'argon2id' }),
                createdAt: now,
                updatedAt: now,
            },
            { upsert: true }
        );
    }
};

export default async function globalSetup(): Promise<() => Promise<void>> {
    const client = new MongoClient(resolveMongoUri());
    try {
        await client.connect();
        await seedUsers(client);
    } finally {
        await client.close();
    }

    // The library is read-only shared data (no test writes to it), so it is seeded once rather than per test.
    if (E2E_OPENSEARCH_URL) await seedDiscoveryLibrary(DISCOVERY_FIXTURES);

    return async () => {
        // Empty the library before the database is dropped so the index is not left holding fixtures.
        if (E2E_OPENSEARCH_URL) await seedDiscoveryLibrary([]);

        const teardown = new MongoClient(resolveMongoUri());
        try {
            await teardown.connect();
            await teardown.db(DB_NAME).dropDatabase();
        } finally {
            await teardown.close();
        }
    };
}
