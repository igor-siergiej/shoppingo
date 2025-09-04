export function registerPWA() {
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost
        = location.hostname === 'localhost'
            || location.hostname === '127.0.0.1'
            || location.hostname === '::1'
            || location.hostname.endsWith('.local')
            || (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true);

    // In development/local, do not use a service worker. Also clean up any previous SW + caches.
    if (!isLocalhost) {
        window.addEventListener('load', async () => {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();

                await Promise.all(registrations.map(r => r.unregister()));
                if ('caches' in window) {
                    const keys = await caches.keys();

                    await Promise.all(keys.filter(k => k.startsWith('shoppingo-')).map(k => caches.delete(k)));
                }
            } catch {
                // ignore cleanup errors in dev
            }
        });

        return;
    }

    // Production: register the service worker and auto-reload when a new version takes control
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            registration.addEventListener('updatefound', () => {
                const installing = registration.installing;

                if (!installing) return;
                installing.addEventListener('statechange', () => {
                    if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                        // A new SW is installed, trigger a refresh so users see latest assets
                        window.location.reload();
                    }
                });
            });
        }).catch(() => {
            // ignore registration errors
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // When the new SW activates and controls the page, refresh once
            window.location.reload();
        });
    });
}

export function listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        (window as unknown as { deferredPrompt?: Event }).deferredPrompt = e;
    });
}
