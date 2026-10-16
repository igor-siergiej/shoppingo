#!/usr/bin/env bun
/**
 * CLI entry for the shared mock-kivo. Run with:
 *
 *   bun scripts/mock-kivo/bin.ts                 # defaults to port 3199
 *   PORT=3099 bun scripts/mock-kivo/bin.ts       # e2e / dev:local port
 *
 * Binds to 127.0.0.1 by default and refuses to start when NODE_ENV=production.
 */

import { startMockKivo } from './index';

const host = process.env.MOCK_KIVO_HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? process.env.MOCK_KIVO_PORT ?? 3199);

const handle = startMockKivo({ host, port });

const shutdown = () => {
    handle.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
