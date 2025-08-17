import React from 'react';
import { Loader2 } from 'lucide-react';

import { useTokenInitialization } from '../../hooks/useTokenInitialization';

interface AppInitializerProps {
    children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { isInitializing } = useTokenInitialization();

    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">
                    Loading...
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

export default AppInitializer;
