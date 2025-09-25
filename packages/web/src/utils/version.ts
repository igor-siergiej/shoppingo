declare const __APP_VERSION__: string;

export const getCurrentVersion = () => __APP_VERSION__;

export const checkForVersionUpdate = (): boolean => {
    const currentVersion = getCurrentVersion();
    const lastKnownVersion = localStorage.getItem('app_version');

    if (!lastKnownVersion) {
        // First time user, store current version
        localStorage.setItem('app_version', currentVersion);

        return false;
    }

    if (lastKnownVersion !== currentVersion) {
        // Version changed, update stored version
        localStorage.setItem('app_version', currentVersion);
        console.log(`App updated from ${lastKnownVersion} to ${currentVersion}`);

        return true;
    }

    return false;
};

export const clearVersionCache = () => {
    localStorage.removeItem('app_version');
    // Clear all caches
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach((name) => {
                caches.delete(name);
            });
        });
    }
};
