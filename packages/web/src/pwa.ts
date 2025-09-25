declare const __APP_VERSION__: string;

export function registerPWA() {
    if (!('serviceWorker' in navigator)) return;

    let isUpdating = false; // Prevent multiple simultaneous updates
    let updateCheckCount = 0; // Track update attempts
    let currentRegistration: ServiceWorkerRegistration | null = null;

    const registerNow = async () => {
        try {
            console.log(`PWA: Starting registration for version ${__APP_VERSION__}`);

            // Register service worker (no timestamp - let browser handle caching)
            const registration = await navigator.serviceWorker.register('/sw.js', {
                updateViaCache: 'none'
            });

            currentRegistration = registration;
            console.log('PWA: Service worker registered successfully');

            // Set up update handling with proper lifecycle management
            registration.addEventListener('updatefound', () => {
                const installing = registration.installing;

                if (!installing || isUpdating) return;

                isUpdating = true;
                console.log('PWA: New version found, installing...');

                installing.addEventListener('statechange', () => {
                    console.log(`PWA: Service worker state changed to: ${installing.state}`);

                    switch (installing.state) {
                        case 'installed':
                            if (navigator.serviceWorker.controller) {
                                // New version is ready, but old version is still controlling
                                console.log('PWA: New version installed, preparing to activate...');

                                // Force the waiting service worker to become active
                                if (registration.waiting) {
                                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                                }

                                // Give user a moment, then reload
                                setTimeout(() => {
                                    console.log('PWA: Activating new version with reload');
                                    window.location.reload();
                                }, 2000);
                            } else {
                                // First installation
                                console.log('PWA: First installation complete');
                                isUpdating = false;
                            }

                            break;

                        case 'activated':
                            console.log('PWA: Service worker activated');
                            if (!navigator.serviceWorker.controller) {
                                // First activation - app is ready for offline use
                                console.log('PWA: App ready for offline use');
                            } else {
                                // Update activation - should trigger reload via controllerchange
                                console.log('PWA: New version activated');
                            }

                            isUpdating = false;
                            break;

                        case 'redundant':
                            console.log('PWA: Service worker became redundant');
                            isUpdating = false;
                            break;
                    }
                });

                // Handle installation errors
                installing.addEventListener('error', (error) => {
                    console.error('PWA: Service worker installation failed:', error);
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
                    console.log('PWA: Periodic update check...');
                    try {
                        await registration.update();
                    } catch (error) {
                        console.warn('PWA: Update check failed:', error);
                    }
                }
            }, 30000); // Every 30 seconds, but only check every 5th time

            return registration;
        } catch (error) {
            console.error('PWA: Service worker registration failed:', error);
            isUpdating = false;
        }
    };

    // Single event listener for controller changes (prevent loops)
    let controllerChangeHandled = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controllerChangeHandled && !isUpdating) {
            controllerChangeHandled = true;
            console.log('PWA: Service worker controller changed - reloading in 2 seconds');
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
                console.log('PWA: Checking for updates due to window focus');
                try {
                    await registration.update();
                } catch (error) {
                    console.warn('PWA: Focus update check failed:', error);
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
                    console.log('PWA: Forced update check requested');
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
