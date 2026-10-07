import { createServer } from 'node:http';
import { MongoClient } from 'mongodb';
import { E2E_OPENSEARCH_URL, seedDiscoveryLibrary } from './db-helpers';
import { DISCOVERY_FIXTURES } from './discovery-fixtures';
import { resolveMongoUri } from './mongo-uri';

const KIVO_PORT = 3099;

const MOCK_USER = { id: 'user-testuser', username: 'testuser' };
const MOCK_USER_2 = { id: 'user-other', username: 'otheruser' };

export default async function globalSetup(): Promise<() => Promise<void>> {
    const kivoServer = createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET' && req.url === '/verify') {
            // The mock tokens carry their user in the JWT payload; fall back to the default user.
            const payload = req.headers.authorization?.split('.')[1];
            let user = MOCK_USER;
            try {
                const claims = JSON.parse(Buffer.from(payload ?? '', 'base64').toString());
                if (claims.id === MOCK_USER_2.id) user = MOCK_USER_2;
            } catch {
                // not a mock JWT
            }
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, payload: user }));
            return;
        }

        if (req.method === 'POST' && req.url === '/users') {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, users: [MOCK_USER_2] }));
            return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
    });

    await new Promise<void>((resolve) => kivoServer.listen(KIVO_PORT, resolve));

    // The library is read-only shared data (no test writes to it), so it is seeded once rather than per test.
    if (E2E_OPENSEARCH_URL) await seedDiscoveryLibrary(DISCOVERY_FIXTURES);

    return async () => {
        await new Promise<void>((resolve) => kivoServer.close(() => resolve()));
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
