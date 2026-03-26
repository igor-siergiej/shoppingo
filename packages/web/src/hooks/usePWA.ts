import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { usePWAContext } from '../contexts/PWAContext';
import { checkForVersionUpdate } from '../utils/version';

export const usePWA = () => {
    const { canInstall, isInstalled, installApp } = usePWAContext();
    const [hasUpdate, setHasUpdate] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const toastIdRef = useRef<string | number | null>(null);

    const { updateServiceWorker } = useRegisterSW({
        onRegistered() {},
        onRegisterError() {},
        onNeedRefresh() {
            setHasUpdate(true);
        },
        onOfflineReady() {},
    });

    const updateApp = useCallback(async () => {
        if (toastIdRef.current !== null) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
        }
        setIsUpdating(true);
        updateServiceWorker(true);
    }, [updateServiceWorker]);

    const dismissUpdate = () => {
        // hasUpdate stays true so the hamburger button remains visible
    };

    useEffect(() => {
        if (!hasUpdate) return;

        toastIdRef.current = toast('A new version is available', {
            duration: Number.POSITIVE_INFINITY,
            action: {
                label: 'Update',
                onClick: updateApp,
            },
            onDismiss: dismissUpdate,
        });
    }, [hasUpdate, updateApp]);

    useEffect(() => {
        if (checkForVersionUpdate()) {
            // version utility handles cache clearing internally
        }
    }, []);

    return {
        canInstall,
        isInstalled,
        hasUpdate,
        isUpdating,
        installApp,
        updateApp,
        dismissUpdate,
    };
};
