import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const appVersion = process.env.APP_VERSION || packageJson.version || (isDev ? 'localhost' : '');

    return {
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                injectRegister: false,
                workbox: {
                    skipWaiting: true,
                    clientsClaim: true,
                    cacheId: `shoppingo-v${appVersion}`,
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
                    runtimeCaching: [
                        {
                            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'api-cache',
                                networkTimeoutSeconds: 2,
                            },
                        },
                        {
                            urlPattern: /^\/config\.json$/,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'config-cache',
                            },
                        },
                    ],
                },
                manifest: {
                    name: 'Shoppingo',
                    short_name: 'Shoppingo',
                    description: 'Shopping list application',
                    start_url: '/',
                    display: 'standalone',
                    background_color: '#ffffff',
                    theme_color: '#2e7d32',
                    scope: '/',
                    orientation: 'portrait-primary',
                    categories: ['shopping', 'productivity', 'lifestyle'],
                    icons: [
                        {
                            src: 'logo-192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any maskable',
                        },
                        {
                            src: 'logo-512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any maskable',
                        },
                    ],
                },
                devOptions: {
                    enabled: true,
                    type: 'module',
                },
            }),
        ],
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
            __APP_VERSION__: JSON.stringify(appVersion),
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
