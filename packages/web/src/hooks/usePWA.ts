import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { checkForVersionUpdate, handleVersionUpdate } from '../utils/version';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWA = () => {
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    // Use Vite PWA plugin's service worker registration
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    // Check for version updates from localStorage
    const [hasVersionUpdate, setHasVersionUpdate] = useState(false);

    useEffect(() => {
        // Check for app version updates
        if (checkForVersionUpdate()) {
            setHasVersionUpdate(true);
        }

        // Check if app is already installed
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
            || (navigator as unknown as { standalone?: boolean }).standalone === true;

        setIsInstalled(Boolean(isStandalone));

        // Setup install prompt listener
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
        } catch (error) {
            console.warn('Error installing app:', error);
        }

        return false;
    };

    const updateApp = async () => {
        try {
            // Handle service worker updates if available
            if (needRefresh) {
                await updateServiceWorker(true);
                setNeedRefresh(false);
            }

            // Handle version updates
            if (hasVersionUpdate) {
                await handleVersionUpdate();
                setHasVersionUpdate(false);
            }

            return true;
        } catch (error) {
            console.warn('Error updating app:', error);

            return false;
        }
    };

    const dismissUpdate = () => {
        if (needRefresh) {
            setNeedRefresh(false);
        }

        if (hasVersionUpdate) {
            setHasVersionUpdate(false);
        }
    };

    return {
        canInstall,
        isInstalled,
        hasUpdate: needRefresh || hasVersionUpdate,
        installApp,
        updateApp,
        dismissUpdate
    };
};
