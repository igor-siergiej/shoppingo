import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    return {
        plugins: [react()],
        build: {
            outDir: './build'
        },
        define: {
            __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || (isDev ? 'localhost' : '')),
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
                }
            },
        },
    };
});
