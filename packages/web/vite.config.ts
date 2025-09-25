import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// Custom plugin to update service worker version
function updateServiceWorkerVersion(): Plugin {
    let originalSwContent: string | null = null;

    const updateServiceWorker = () => {
        if (!fs.existsSync('./package.json')) return;

        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const version = packageJson.version;
        const swPath = './public/sw.js';

        if (fs.existsSync(swPath)) {
            let swContent = fs.readFileSync(swPath, 'utf8');

            // Store original content with placeholders for restoration later
            if (!originalSwContent && (swContent.includes('__APP_VERSION_PLACEHOLDER__') || swContent.includes('__BUILD_TIMESTAMP_PLACEHOLDER__'))) {
                originalSwContent = swContent;
            }

            // Only update if placeholders are present (avoid double-updating)
            if (swContent.includes('__APP_VERSION_PLACEHOLDER__') || swContent.includes('__BUILD_TIMESTAMP_PLACEHOLDER__')) {
                // Replace APP_VERSION placeholder
                swContent = swContent.replace(
                    /__APP_VERSION_PLACEHOLDER__/g,
                    version
                );

                // Replace BUILD_TIMESTAMP placeholder
                const buildTimestamp = Date.now();

                swContent = swContent.replace(
                    /__BUILD_TIMESTAMP_PLACEHOLDER__/g,
                    buildTimestamp.toString()
                );

                fs.writeFileSync(swPath, swContent);
                console.log(`🔧 Service Worker: Injected version ${version} with build timestamp ${buildTimestamp}`);
            }
        }
    };

    const restoreServiceWorker = () => {
        const swPath = './public/sw.js';

        if (originalSwContent && fs.existsSync(swPath)) {
            fs.writeFileSync(swPath, originalSwContent);
            console.log('🔄 Service Worker: Restored placeholders for next build');
        }
    };

    return {
        name: 'update-sw-version',
        buildStart: updateServiceWorker,
        generateBundle() {
            updateServiceWorker();

            // Also ensure the updated sw.js is copied to the build directory
            const swPath = './public/sw.js';
            const buildSwPath = './build/sw.js';

            if (fs.existsSync(swPath)) {
                const swContent = fs.readFileSync(swPath, 'utf8');

                // Ensure build directory exists
                if (!fs.existsSync('./build')) {
                    fs.mkdirSync('./build', { recursive: true });
                }

                fs.writeFileSync(buildSwPath, swContent);
                console.log('📦 Service Worker: Copied updated sw.js to build directory');
            }
        },
        buildEnd() {
            // Restore placeholders after build completes
            restoreServiceWorker();
        }
    };
}

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    // Read package version for APP_VERSION
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const appVersion = process.env.APP_VERSION || packageJson.version || (isDev ? 'localhost' : '');

    return {
        plugins: [react(), updateServiceWorkerVersion()],
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
