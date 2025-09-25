import { useTokenInitialization } from '@igor-siergiej/web-utils';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface AppInitializerProps {
    children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { isInitializing } = useTokenInitialization();
    const [timeoutReached, setTimeoutReached] = useState(false);

    useEffect(() => {
        if (isInitializing) {
            const timeout = setTimeout(() => {
                console.warn('Token initialization timeout reached, this might indicate cache/SW issues');
                setTimeoutReached(true);
            }, 10000);

            return () => clearTimeout(timeout);
        }
    }, [isInitializing]);

    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">
                    Loading Shoppingo...
                </p>
                {timeoutReached && (
                    <div className="text-center text-sm text-orange-600 max-w-md">
                        <p>Taking longer than expected...</p>
                        <p>If this persists, try:</p>
                        <ul className="list-disc text-left mt-2 pl-4">
                            <li>Hard refresh (Ctrl+F5)</li>
                            <li>Clear browser data</li>
                            <li>Reinstall the app</li>
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    return <>{children}</>;
};

export default AppInitializer;
