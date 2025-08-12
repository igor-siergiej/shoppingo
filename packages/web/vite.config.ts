import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: './build'
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 4000,
        proxy: {
            '/api': {
                target: 'http://localhost:4001',
                changeOrigin: false,
                secure: false,
            },
        },
    },
});
