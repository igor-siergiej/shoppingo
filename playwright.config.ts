import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolveMongoUri } from './e2e/mongo-uri';

config();

const E2E_KIVO_PORT = 3099;
const E2E_MONGO_URI = resolveMongoUri();

export default defineConfig({
    testDir: './e2e/tests',
    tsconfig: './e2e/tsconfig.json',
    fullyParallel: false,
    workers: 1,
    timeout: 8000,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'html',
    globalSetup: './e2e/global-setup.ts',
    expect: {
        toHaveScreenshot: {
            animations: 'disabled',
            maxDiffPixelRatio: 0.02,
        },
    },
    use: {
        baseURL: 'http://localhost:4000',
        trace: 'on-first-retry',
        serviceWorkers: 'block',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: /.*\.visual\.spec\.ts/,
        },
        {
            name: 'mobile-visual',
            use: { ...devices['Pixel 7'] },
            testMatch: /.*\.visual\.spec\.ts/,
            timeout: 15000,
        },
        {
            name: 'desktop-visual',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /.*\.visual\.spec\.ts/,
            timeout: 15000,
            // Desktop screens are mostly empty background, so the global 2%
            // ratio (of a much larger 1280x720 canvas) is a looser absolute
            // pixel budget than it is for the smaller mobile viewport — use
            // a flat pixel cap here instead, roughly matching the mobile
            // project's effective budget, so a real component-level shift
            // can't hide under a ratio that's loose only because the canvas
            // is big. Repeats `animations: 'disabled'` rather than relying
            // on it merging in from the global `expect` block above.
            expect: {
                toHaveScreenshot: {
                    animations: 'disabled',
                    maxDiffPixels: 4000,
                },
            },
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
