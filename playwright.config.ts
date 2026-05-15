import { defineConfig, devices } from '@playwright/test';

const E2E_KIVO_PORT = 3099;
const E2E_MONGO_URI = process.env.E2E_MONGO_URI ?? 'mongodb://localhost:27017/';

export default defineConfig({
    testDir: './e2e/tests',
    tsconfig: './e2e/tsconfig.json',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'html',
    globalSetup: './e2e/global-setup.ts',
    use: {
        baseURL: 'http://localhost:4000',
        trace: 'on-first-retry',
        serviceWorkers: 'block',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'bun run start:web',
            url: 'http://localhost:4000',
            reuseExistingServer: !process.env.CI,
        },
        {
            command: 'bun run --filter @shoppingo/api start:e2e',
            url: 'http://localhost:4001/api/health',
            reuseExistingServer: false,
            env: {
                PORT: '4001',
                AUTH_URL: `http://localhost:${E2E_KIVO_PORT}`,
                CONNECTION_URI: E2E_MONGO_URI,
                DATABASE_NAME: 'shoppingo_e2e',
                BUCKET_ENDPOINT: 'localhost:9000',
                BUCKET_NAME: 'shoppingo',
                BUCKET_ACCESS_KEY: 'minioadmin',
                BUCKET_SECRET_KEY: 'minioadmin',
            },
        },
    ],
});
