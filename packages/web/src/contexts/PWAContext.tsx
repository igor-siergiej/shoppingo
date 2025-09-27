import React, { createContext, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
    deferredPrompt: BeforeInstallPromptEvent | null;
    canInstall: boolean;
    isInstalled: boolean;
    installApp: () => Promise<boolean>;
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

    useEffect(() => {
        // Check if app is already installed
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
            || (navigator as unknown as { standalone?: boolean }).standalone === true;

        setIsInstalled(Boolean(isStandalone));

        // Set up event listeners as early as possible
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

        // Add listeners immediately
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
    };

    return (
        <PWAContext.Provider value={value}>
            {children}
        </PWAContext.Provider>
    );
};
