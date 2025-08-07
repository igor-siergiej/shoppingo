import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import path from 'path';

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
