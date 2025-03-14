import react from '@vitejs/plugin-react';
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
    }
});
