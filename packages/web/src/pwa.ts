declare const __APP_VERSION__: string;

export function registerPWA() {
    if (!('serviceWorker' in navigator)) return;

    let isUpdating = false; // Prevent multiple simultaneous updates
    let updateCheckCount = 0; // Track update attempts
    let currentRegistration: ServiceWorkerRegistration | null = null;

    const registerNow = async () => {
        try {
            // Register service worker (no timestamp - let browser handle caching)
            const registration = await navigator.serviceWorker.register('/sw.js', {
                updateViaCache: 'none'
            });

            currentRegistration = registration;

            // Set up update handling with proper lifecycle management
            registration.addEventListener('updatefound', () => {
                const installing = registration.installing;

                if (!installing || isUpdating) return;

                isUpdating = true;

                installing.addEventListener('statechange', () => {
                    switch (installing.state) {
                        case 'installed':
                            if (navigator.serviceWorker.controller) {
                                // New version is ready, but old version is still controlling

                                // Force the waiting service worker to become active
                                if (registration.waiting) {
                                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                                }

                                // Give user a moment, then reload
                                setTimeout(() => {
                                    window.location.reload();
                                }, 2000);
                            } else {
                                // First installation
                                isUpdating = false;
                            }

                            break;

                        case 'activated':
                            isUpdating = false;
                            break;

                        case 'redundant':
                            isUpdating = false;
                            break;
                    }
                });

                // Handle installation errors
                installing.addEventListener('error', () => {
                    isUpdating = false;
                });
            });

            // Check for updates on registration
            await registration.update();

            // Set up periodic update checks (less aggressive)
            setInterval(async () => {
                updateCheckCount++;

                // Only check every 5th attempt to reduce noise
                if (updateCheckCount % 5 === 0) {
                    try {
                        await registration.update();
                    } catch (error) {
                        // Silent fail
                    }
                }
            }, 30000); // Every 30 seconds, but only check every 5th time

            return registration;
        } catch (error) {
            isUpdating = false;
        }
    };

    // Single event listener for controller changes (prevent loops)
    let controllerChangeHandled = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controllerChangeHandled && !isUpdating) {
            controllerChangeHandled = true;
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    });

    // Check for updates on focus (but only once per focus)
    let focusCheckHandled = false;

    window.addEventListener('focus', async () => {
        if (focusCheckHandled) return;
        focusCheckHandled = true;

        setTimeout(async () => {
            focusCheckHandled = false;

            const registration = await navigator.serviceWorker.getRegistration();

            if (registration && !isUpdating) {
                try {
                    await registration.update();
                } catch (error) {
                    // Silent fail
                }
            }
        }, 2000);
    });

    // Helper function to query service worker version
    const getServiceWorkerVersion = async (): Promise<any> => {
        if (!currentRegistration || !currentRegistration.active) {
            return { error: 'No active service worker' };
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();

            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };

            currentRegistration.active!.postMessage(
                { type: 'GET_VERSION' },
                [messageChannel.port2]
            );

            // Timeout after 2 seconds
            setTimeout(() => {
                resolve({ error: 'Service worker did not respond' });
            }, 2000);
        });
    };

    // Make debug functions available globally
    if (typeof window !== 'undefined') {
        (window as any).PWA = {
            getServiceWorkerVersion,
            getCurrentRegistration: () => currentRegistration,
            forceUpdate: async () => {
                if (currentRegistration) {
                    await currentRegistration.update();
                }
            }
        };
    }

    // Start registration
    if (document.readyState === 'complete') {
        registerNow();
    } else {
        window.addEventListener('load', registerNow);
    }
}
