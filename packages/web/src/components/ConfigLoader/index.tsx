import React, { useEffect, useState } from 'react';

import { loadConfig } from '../../utils/config';
import ErrorPage from '../ErrorPage';
import LoadingSpinner from '../LoadingSpinner';

interface ConfigLoaderProps {
    children: React.ReactNode;
}

const ConfigLoader: React.FC<ConfigLoaderProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeConfig = async () => {
            try {
                await loadConfig();
                setIsLoading(false);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';

                setError(errorMessage);
                setIsLoading(false);
            }
        };

        initializeConfig();
    }, []);

    if (isLoading) {
        return <LoadingSpinner message="Loading configuration..." />;
    }

    if (error) {
        return (
            <ErrorPage
                error={new Error(error)}
            />
        );
    }

    return <>{children}</>;
};

export default ConfigLoader;
