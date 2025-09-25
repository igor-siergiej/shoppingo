import React, { useEffect, useState } from 'react';

import { clearVersionCache, getVersionInfo, updateStoredVersion } from '../utils/version';

export const UpdatePrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const versionInfo = getVersionInfo();

        // Show prompt if version has changed
        if (versionInfo.hasChanged) {
            setShowPrompt(true);
        }

        // Also show prompt if page was loaded with cache-busting parameter
        if (window.location.search.includes('force-update') || window.location.search.includes('pwa-debug')) {
            setShowPrompt(true);
        }
    }, []);

    const handleUpdate = async () => {
        setIsUpdating(true);

        try {
            console.log('UpdatePrompt: Starting manual update...');

            // Clear all caches and version info
            await clearVersionCache();

            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();

                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('UpdatePrompt: Unregistered all service workers');
            }

            // Force reload with cache busting
            console.log('UpdatePrompt: Forcing reload with cache busting...');
            window.location.href = window.location.pathname + '?force-update=' + Date.now();
        } catch (error) {
            console.error('UpdatePrompt: Update failed:', error);
            setIsUpdating(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Store current version to avoid showing prompt again
        updateStoredVersion();
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg max-w-sm">
            <div className="flex flex-col gap-2">
                <div className="font-medium">
                    New version available!
                </div>
                <div className="text-sm opacity-90">
                    Update to get the latest features and fixes.
                </div>
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="flex-1 bg-white text-primary px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                    >
                        {isUpdating ? 'Updating...' : 'Update Now'}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-3 py-1 text-sm opacity-75 hover:opacity-100"
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};
