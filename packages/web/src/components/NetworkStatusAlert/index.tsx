import { CloudOff, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ONLINE_TOAST_MS = 3000;

const NetworkStatusAlert = () => {
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [showOnlineNotice, setShowOnlineNotice] = useState<boolean>(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowOnlineNotice(true);
            setTimeout(() => setShowOnlineNotice(false), ONLINE_TOAST_MS);
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOnline) {
        return (
            <div className="fixed top-[80px] left-0 right-0 z-50 px-4">
                <div className="mx-auto max-w-[500px]">
                    <Alert className="border-destructive/40 text-destructive bg-destructive/10 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-3">
                            <CloudOff className="h-5 w-5 mt-[2px]" aria-hidden="true" />
                            <div>
                                <AlertTitle>You are offline</AlertTitle>
                                <AlertDescription>
                                    Some actions may be unavailable. Recent data is shown from cache.
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                </div>
            </div>
        );
    }

    if (showOnlineNotice) {
        return (
            <div className="fixed top-[80px] left-0 right-0 z-50 px-4">
                <div className="mx-auto max-w-[500px]">
                    <Alert className="border-primary/40 text-primary bg-primary/10 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-3">
                            <Star className="h-5 w-5 mt-[2px]" aria-hidden="true" />
                            <div>
                                <AlertTitle>Back online</AlertTitle>
                                <AlertDescription>
                                    Connection restored.
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                </div>
            </div>
        );
    }

    return null;
};

export default NetworkStatusAlert;
