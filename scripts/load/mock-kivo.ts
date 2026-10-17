/**
 * Load-test entry point for the shared mock kivo. The HTTP server, token
 * helpers, and safety guards all live in `scripts/mock-kivo/` so the same
 * code serves the load test, the Playwright global setup and `dev:local`.
 *
 * Behaviour and routes: see `scripts/mock-kivo/index.ts`. Binds to localhost
 * only and refuses to start under `NODE_ENV=production`.
 */

import { startMockKivo } from '../mock-kivo';

const port = Number(process.env.MOCK_KIVO_PORT ?? 3199);
const handle = startMockKivo({ port, host: '127.0.0.1' });

console.log(`mock kivo listening on ${handle.url}`);

const shutdown = () => {
    handle.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
