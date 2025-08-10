import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        setupFiles: ['./src/setupTests.ts'],
        environment: 'jsdom',
        globals: true
    },
    build: {
        outDir: './build'
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
