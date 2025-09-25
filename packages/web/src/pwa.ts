export function registerPWA() {
    if (!('serviceWorker' in navigator)) return;

    const registerNow = () => {
        navigator.serviceWorker.register('/sw.js', {
            // Force update check on registration
            updateViaCache: 'none'
        }).then((registration) => {
            // Check for updates immediately
            registration.update();

            registration.addEventListener('updatefound', () => {
                const installing = registration.installing;

                console.log('PWA: New version found, installing...');

                if (!installing) return;
                installing.addEventListener('statechange', () => {
                    if (installing.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // New version available
                            console.log('PWA: New version ready, will reload...');
                            // Give a brief moment for the new SW to activate
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        } else {
                            // First installation
                            console.log('PWA: App ready for offline use');
                        }
                    }
                });
            });

            // Check for updates every 30 seconds while the app is open
            setInterval(() => {
                registration.update();
            }, 30000);
        }).catch((error) => {
            console.error('PWA: Service worker registration failed:', error);
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('PWA: New service worker controller, reloading...');
            window.location.reload();
        });

        // Also check for updates when the page regains focus
        window.addEventListener('focus', () => {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration) {
                    registration.update();
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
