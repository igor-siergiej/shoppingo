#!/usr/bin/env bun
/**
 * CLI entry for the shared mock kivo. Run with:
 *   bun scripts/mock-kivo/bin.ts                          # defaults to 127.0.0.1:3199
 *   PORT=3099 bun scripts/mock-kivo/bin.ts                # e2e / dev:local port
 *   MOCK_KIVO_PORT=3099 bun scripts/mock-kivo/bin.ts      # same, via the load-test env var
 *
 * Binds to 127.0.0.1 by default and refuses to start under NODE_ENV=production.
 * The server's tokens are JWT-shaped but unsigned — see scripts/mock-kivo/tokens.ts.
 */

import { startMockKivo } from './index';

const port = Number(process.env.PORT ?? process.env.MOCK_KIVO_PORT ?? 3199);
const host = process.env.MOCK_KIVO_HOST ?? '127.0.0.1';

const handle = startMockKivo({ host, port });

console.log(`mock kivo listening on ${handle.url}`);

const shutdown = () => {
    handle.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
