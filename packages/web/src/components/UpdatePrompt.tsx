import React, { useEffect, useState } from 'react';

declare const __APP_VERSION__: string;

export const UpdatePrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // Check if there's a version mismatch
        const storedVersion = localStorage.getItem('app_version');
        const currentVersion = __APP_VERSION__;

        if (storedVersion && storedVersion !== currentVersion) {
            setShowPrompt(true);
        }

        // Also show prompt if page was loaded with cache-busting parameter
        if (window.location.search.includes('force-update')) {
            setShowPrompt(true);
        }
    }, []);

    const handleUpdate = async () => {
        setIsUpdating(true);

        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();

                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('Cleared all caches');
            }

            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();

                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('Unregistered all service workers');
            }

            // Clear localStorage version info
            localStorage.removeItem('app_version');

            // Force reload with cache busting
            window.location.href = window.location.pathname + '?force-update=' + Date.now();
        } catch (error) {
            console.error('Update failed:', error);
            setIsUpdating(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Store current version to avoid showing prompt again
        localStorage.setItem('app_version', __APP_VERSION__);
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
