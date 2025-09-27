import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { usePWAContext } from '../contexts/PWAContext';
import { checkForVersionUpdate } from '../utils/version';

export const usePWA = () => {
    const { canInstall, isInstalled, installApp } = usePWAContext();

    // Use Vite PWA plugin's service worker registration with auto-update
    const {
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered() {
            // Service worker registered successfully
        },
        onRegisterError() {
            // Service worker registration error
        },
        onNeedRefresh() {
            updateServiceWorker(true);
        },
        onOfflineReady() {
            // App ready to work offline
        },
    });

    // Check for version updates from localStorage
    const [, setHasVersionUpdate] = useState(false);

    useEffect(() => {
        // Check for app version updates
        if (checkForVersionUpdate()) {
            setHasVersionUpdate(true);
        }
    }, []);

    // Auto-update is now handled by the service worker
    // Keep these methods for backward compatibility but they're no longer needed
    const updateApp = async () => {
        return true;
    };

    const dismissUpdate = () => {
        // Auto-update is enabled, no action needed
    };

    return {
        canInstall,
        isInstalled,
        hasUpdate: false, // Always false since auto-update is enabled
        installApp,
        updateApp,
        dismissUpdate
    };
};
