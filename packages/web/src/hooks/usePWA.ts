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

    // Use Vite PWA plugin's service worker registration with auto-update
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
        onNeedRefresh() {
            console.log('PWA: Auto-updating service worker');
            updateServiceWorker(true);
        },
        onOfflineReady() {
            console.log('PWA: App ready to work offline');
        },
    });

    // Check for version updates from localStorage
    const [hasVersionUpdate, setHasVersionUpdate] = useState(false);

    useEffect(() => {
        console.log('PWA: usePWA hook initializing');

        // Check for app version updates
        if (checkForVersionUpdate()) {
            setHasVersionUpdate(true);
        }

        // Check if app is already installed
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
            || (navigator as unknown as { standalone?: boolean }).standalone === true;

        setIsInstalled(Boolean(isStandalone));
        console.log('PWA: App installed status:', Boolean(isStandalone));

        // Setup install prompt listener
        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('PWA: beforeinstallprompt event fired');
            e.preventDefault();
            const event = e as BeforeInstallPromptEvent;

            setDeferredPrompt(event);
            setCanInstall(true);
            console.log('PWA: Install prompt available, canInstall set to true');
        };

        const handleAppInstalled = () => {
            console.log('PWA: App installed successfully');
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

    // Auto-update is now handled by the service worker
    // Keep these methods for backward compatibility but they're no longer needed
    const updateApp = async () => {
        console.log('PWA: Manual update requested (auto-update is enabled)');
        return true;
    };

    const dismissUpdate = () => {
        console.log('PWA: Dismiss update requested (auto-update is enabled)');
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
