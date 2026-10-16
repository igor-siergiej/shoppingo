/**
 * Standalone CLI for the load-test mock kivo. The HTTP server code, token
 * helpers, and safety guards live in `scripts/mock-kivo/` so the same code
 * serves the load test, the Playwright global setup and `bun run dev:local`.
 *
 * Behaviour and routes: see `scripts/mock-kivo/index.ts`. Bind is localhost
 * only and the process refuses to start under `NODE_ENV=production`.
 */

import { startMockKivo } from '../mock-kivo';

const port = Number(process.env.MOCK_KIVO_PORT ?? 3199);
const handle = startMockKivo({ port, host: '127.0.0.1' });

const shutdown = () => {
    handle.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
