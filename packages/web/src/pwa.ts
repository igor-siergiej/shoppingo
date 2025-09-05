export function registerPWA() {
    if (!('serviceWorker' in navigator)) return;

    const registerNow = () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            registration.addEventListener('updatefound', () => {
                const installing = registration.installing;

                if (!installing) return;
                installing.addEventListener('statechange', () => {
                    if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                        window.location.reload();
                    }
                });
            });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    };

    if (document.readyState === 'complete') {
        registerNow();
    } else {
        window.addEventListener('load', registerNow);
    }
}
