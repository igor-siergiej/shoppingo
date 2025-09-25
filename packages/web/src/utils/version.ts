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
        console.log(`PWA Version: First install of version ${versionInfo.current}`);

        return false;
    }

    if (versionInfo.hasChanged) {
        console.log(`PWA Version: Update detected from ${versionInfo.stored} to ${versionInfo.current}`);

        return true;
    }

    return false;
};

export const updateStoredVersion = (version?: string) => {
    const versionToStore = version || getCurrentVersion();

    localStorage.setItem('app_version', versionToStore);
    console.log(`PWA Version: Updated stored version to ${versionToStore}`);
};

export const clearAllCaches = async (): Promise<void> => {
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();

            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log(`PWA Cache: Cleared ${cacheNames.length} cache(s):`, cacheNames);
        } else {
            console.log('PWA Cache: No cache API available');
        }
    } catch (error) {
        console.error('PWA Cache: Failed to clear caches:', error);
    }
};

export const clearVersionCache = async (): Promise<void> => {
    localStorage.removeItem('app_version');
    await clearAllCaches();
    console.log('PWA Version: Cleared version info and all caches');
};

export const handleVersionUpdate = async (): Promise<boolean> => {
    const versionInfo = getVersionInfo();

    if (versionInfo.hasChanged) {
        console.log(`PWA Version: Handling update from ${versionInfo.stored} to ${versionInfo.current}`);

        // Clear all caches before updating version
        await clearAllCaches();

        // Now update the stored version
        updateStoredVersion();

        return true;
    }

    return false;
};
