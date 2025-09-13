import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    return {
        plugins: [react()],
        build: {
            outDir: './build',
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react-vendor': ['react', 'react-dom'],
                        'router-vendor': ['react-router-dom'],
                        'query-vendor': ['react-query'],
                        'ui-vendor': ['lucide-react', 'motion'],
                        'utils-vendor': ['clsx', 'tailwind-merge']
                    },
                },
            },
            chunkSizeWarningLimit: 1000,
            commonjsOptions: {
                include: [/node_modules/],
            },
        },
        define: {
            __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || (isDev ? 'localhost' : '')),
            __IS_PROD__: JSON.stringify(!isDev),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 4000,
            hmr: {
                overlay: false
            },
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
