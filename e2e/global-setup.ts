import { createServer } from 'node:http';
import { MongoClient } from 'mongodb';
import { resolveMongoUri } from './mongo-uri';

const KIVO_PORT = 3099;

const MOCK_USER = { id: 'user-testuser', username: 'testuser' };
const MOCK_USER_2 = { id: 'user-other', username: 'otheruser' };

export default async function globalSetup(): Promise<() => Promise<void>> {
    const kivoServer = createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET' && req.url === '/verify') {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, payload: MOCK_USER }));
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

    return async () => {
        await new Promise<void>((resolve) => kivoServer.close(() => resolve()));

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
