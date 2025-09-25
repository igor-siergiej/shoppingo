import { clearVersionCache, getVersionInfo } from './version';

export const PWADebugUtils = {
    async getStatus() {
        const versionInfo = getVersionInfo();
        const status = {
            ...versionInfo,
            hasServiceWorker: 'serviceWorker' in navigator,
            registrations: 0,
            caches: [] as Array<string>,
            controller: null as any,
            state: 'unknown'
        };

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();

            status.registrations = registrations.length;

            if (registrations.length > 0) {
                status.controller = registrations[0];
                status.state = registrations[0].active?.state || 'no active worker';
            }
        }

        if ('caches' in window) {
            status.caches = await caches.keys();
        }

        return status;
    },

    async clearEverything() {
        // Use the centralized cache clearing
        await clearVersionCache();

        // Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();

            await Promise.all(registrations.map(reg => reg.unregister()));
        }

        return this.getStatus();
    },

    async forceUpdate() {
        await this.clearEverything();

        // Force reload with cache busting
        window.location.href = window.location.pathname + '?pwa-debug=' + Date.now();
    },

    logStatus() {
        this.getStatus().then((status) => {
            console.group('📱 PWA Status');
            console.log('Current Version:', status.current);
            console.log('Stored Version:', status.stored);
            console.log('First Time:', status.isFirstTime);
            console.log('Version Changed:', status.hasChanged);
            console.log('Service Workers:', status.registrations);
            console.log('SW State:', status.state);
            console.log('Caches:', status.caches.length, status.caches);
            console.groupEnd();
        });
    }
};

// Make available globally in development
if (typeof window !== 'undefined') {
    (window as any).PWADebug = PWADebugUtils;
}
