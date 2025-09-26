declare const __APP_VERSION__: string;

export const getCurrentVersion = () => __APP_VERSION__;

export interface VersionInfo {
    current: string;
    stored: string | null;
    isFirstTime: boolean;
    hasChanged: boolean;
}

export const getVersionInfo = (): VersionInfo => {
    const current = getCurrentVersion();
    const stored = localStorage.getItem('app_version');
    const isFirstTime = !stored;
    const hasChanged = stored !== null && stored !== current;

    return {
        current,
        stored,
        isFirstTime,
        hasChanged
    };
};

export const checkForVersionUpdate = (): boolean => {
    const versionInfo = getVersionInfo();

    if (versionInfo.isFirstTime) {
        // First time user, store current version
        localStorage.setItem('app_version', versionInfo.current);

        return false;
    }

    if (versionInfo.hasChanged) {
        return true;
    }

    return false;
};

export const updateStoredVersion = (version?: string) => {
    const versionToStore = version || getCurrentVersion();

    localStorage.setItem('app_version', versionToStore);
};

export const clearAllCaches = async (): Promise<void> => {
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();

            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
    } catch {
        // Silent fail
    }
};

export const clearVersionCache = async (): Promise<void> => {
    localStorage.removeItem('app_version');
    await clearAllCaches();
};

export const handleVersionUpdate = async (): Promise<boolean> => {
    const versionInfo = getVersionInfo();

    if (versionInfo.hasChanged) {
        // Clear all caches before updating version
        await clearAllCaches();

        // Now update the stored version
        updateStoredVersion();

        return true;
    }

    return false;
};
