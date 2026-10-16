import { MongoClient } from 'mongodb';
import type { MockKivoServer } from '../scripts/mock-kivo';
import { startMockKivo } from '../scripts/mock-kivo';
import { E2E_OPENSEARCH_URL, seedDiscoveryLibrary } from './db-helpers';
import { DISCOVERY_FIXTURES } from './discovery-fixtures';
import { resolveMongoUri } from './mongo-uri';

const E2E_KIVO_PORT = 3099;

export default async function globalSetup(): Promise<() => Promise<void>> {
    const kivo: MockKivoServer = startMockKivo({
        port: E2E_KIVO_PORT,
        host: '127.0.0.1',
        // Seed the same two users the rest of the e2e suite defaults to so
        // existing fixtures and route stubs continue to work unchanged.
        seedUsers: [
            { id: 'user-testuser', username: 'testuser' },
            { id: 'user-other', username: 'otheruser' },
        ],
    });

    // The library is read-only shared data (no test writes to it), so it is seeded once rather than per test.
    if (E2E_OPENSEARCH_URL) await seedDiscoveryLibrary(DISCOVERY_FIXTURES);

    return async () => {
        kivo.close();
        // Empty the library before the database is dropped so the index is not left holding fixtures.
        if (E2E_OPENSEARCH_URL) await seedDiscoveryLibrary([]);

        const mongoUri = resolveMongoUri();
        const client = new MongoClient(mongoUri);
        try {
            await client.connect();
            await client.db('shoppingo_e2e').dropDatabase();
        } finally {
            await client.close();
        }
    };
}
