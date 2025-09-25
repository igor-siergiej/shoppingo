export function registerPWA() {
    if (!('serviceWorker' in navigator)) return;

    const registerNow = () => {
        // Force aggressive service worker updates
        const forceUpdateSW = async () => {
            try {
                // Unregister all existing service workers first
                const registrations = await navigator.serviceWorker.getRegistrations();

                for (const registration of registrations) {
                    console.log('PWA: Unregistering old service worker');
                    await registration.unregister();
                }

                // Wait a bit for unregistration to complete
                await new Promise(resolve => setTimeout(resolve, 500));

                // Register fresh service worker with cache-busting
                const registration = await navigator.serviceWorker.register(`/sw.js?t=${Date.now()}`, {
                    updateViaCache: 'none'
                });

                console.log('PWA: Fresh service worker registered');

                // Force immediate update check
                await registration.update();

                registration.addEventListener('updatefound', () => {
                    const installing = registration.installing;

                    console.log('PWA: New version found, installing...');

                    if (!installing) return;

                    installing.addEventListener('statechange', () => {
                        console.log(`PWA: Service worker state: ${installing.state}`);

                        if (installing.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New version available - force immediate reload
                                console.log('PWA: New version ready, reloading immediately');
                                window.location.reload();
                            } else {
                                // First installation
                                console.log('PWA: App ready for offline use');
                            }
                        }

                        if (installing.state === 'activated') {
                            console.log('PWA: New service worker activated, reloading');
                            window.location.reload();
                        }
                    });
                });

                // More frequent update checking
                setInterval(async () => {
                    console.log('PWA: Checking for updates...');
                    await registration.update();
                }, 10000); // Every 10 seconds

                return registration;
            } catch (error) {
                console.error('PWA: Service worker registration failed:', error);
            }
        };

        forceUpdateSW();

        // Listen for service worker controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('PWA: Service worker controller changed, reloading');
            window.location.reload();
        });

        // Check for updates on multiple events
        ['focus', 'visibilitychange', 'online', 'pageshow'].forEach((event) => {
            window.addEventListener(event, async () => {
                if (document.visibilityState === 'visible' || navigator.onLine) {
                    const registration = await navigator.serviceWorker.getRegistration();

                    if (registration) {
                        console.log(`PWA: Checking for updates due to ${event} event`);
                        await registration.update();
                    }
                }
            });
        });
    };

    if (document.readyState === 'complete') {
        registerNow();
    } else {
        window.addEventListener('load', registerNow);
    }
}
