import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
    deferredPrompt: BeforeInstallPromptEvent | null;
    canInstall: boolean;
    isInstalled: boolean;
    installApp: () => Promise<boolean>;
    hasUpdate: boolean;
    isUpdating: boolean;
    updateApp: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWAContext = () => {
    const context = useContext(PWAContext);

    if (context === undefined) {
        throw new Error('usePWAContext must be used within a PWAProvider');
    }

    return context;
};

interface PWAProviderProps {
    children: React.ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [hasUpdate, setHasUpdate] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const toastIdRef = useRef<string | number | null>(null);

    const { updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_swUrl, r) {
            if (r) {
                setInterval(() => {
                    if (!r.installing && navigator.onLine) {
                        void r.update();
                    }
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError() {},
        onNeedRefresh() {
            setHasUpdate(true);
        },
        onOfflineReady() {},
    });

    const updateApp = useCallback(() => {
        if (toastIdRef.current !== null) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
        }
        setIsUpdating(true);
        updateServiceWorker(true);
    }, [updateServiceWorker]);

    useEffect(() => {
        if (!hasUpdate) return;

        if (toastIdRef.current !== null) {
            toast.dismiss(toastIdRef.current);
        }

        toastIdRef.current = toast('A new version is available', {
            duration: Number.POSITIVE_INFINITY,
            action: {
                label: 'Update',
                onClick: updateApp,
            },
        });
    }, [hasUpdate, updateApp]);

    useEffect(() => {
        const isStandalone =
            window.matchMedia?.('(display-mode: standalone)').matches ||
            (navigator as unknown as { standalone?: boolean }).standalone === true;

        setIsInstalled(Boolean(isStandalone));

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const event = e as BeforeInstallPromptEvent;

            setDeferredPrompt(event);
            setCanInstall(true);
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setCanInstall(false);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async (): Promise<boolean> => {
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

    const value: PWAContextType = {
        deferredPrompt,
        canInstall,
        isInstalled,
        installApp,
        hasUpdate,
        isUpdating,
        updateApp,
    };

    return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
};
