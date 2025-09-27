import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { checkForVersionUpdate } from '../utils/version';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWA = () => {
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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

        // Check if app is already installed
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
            || (navigator as unknown as { standalone?: boolean }).standalone === true;

        setIsInstalled(Boolean(isStandalone));

        // Check if install prompt was already captured globally
        if (window.__pwaInstallAvailable && window.__deferredInstallPrompt) {
            setDeferredPrompt(window.__deferredInstallPrompt);
            setCanInstall(true);
        }

        // Setup listener for future install events (fallback)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const event = e as BeforeInstallPromptEvent;

            setDeferredPrompt(event);
            setCanInstall(true);
        };

        const handleAppInstalled = () => {
            setCanInstall(false);
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        // Set up listeners as fallback
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return false;

        try {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;

            if (choice.outcome === 'accepted') {
                setCanInstall(false);
                setIsInstalled(true);
                setDeferredPrompt(null);

                return true;
            }
        } catch {
            // Error installing app
        }

        return false;
    };

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
