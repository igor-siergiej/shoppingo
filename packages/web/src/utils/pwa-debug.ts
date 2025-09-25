declare const __APP_VERSION__: string;

export const PWADebugUtils = {
    async getStatus() {
        const status = {
            appVersion: __APP_VERSION__,
            storedVersion: localStorage.getItem('app_version'),
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
        console.log('🧹 PWA Debug: Clearing everything...');

        // Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();

            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log(`🧹 Cleared ${cacheNames.length} caches:`, cacheNames);
        }

        // Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();

            await Promise.all(registrations.map(reg => reg.unregister()));
            console.log(`🧹 Unregistered ${registrations.length} service workers`);
        }

        // Clear localStorage
        localStorage.removeItem('app_version');
        console.log('🧹 Cleared version from localStorage');

        return this.getStatus();
    },

    async forceUpdate() {
        console.log('🔄 PWA Debug: Forcing update...');

        await this.clearEverything();

        // Force reload with cache busting
        window.location.href = window.location.pathname + '?pwa-debug=' + Date.now();
    },

    logStatus() {
        this.getStatus().then((status) => {
            console.group('📱 PWA Status');
            console.log('App Version:', status.appVersion);
            console.log('Stored Version:', status.storedVersion);
            console.log('Version Match:', status.appVersion === status.storedVersion);
            console.log('Service Workers:', status.registrations);
            console.log('SW State:', status.state);
            console.log('Caches:', status.caches);
            console.groupEnd();
        });
    }
};

// Make available globally in development
if (typeof window !== 'undefined') {
    (window as any).PWADebug = PWADebugUtils;
}
