import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { tryRefreshToken } from '../utils/tokenUtils';

export const useTokenInitialization = () => {
    const { login, isAuthenticated } = useAuth();
    const [isInitializing, setIsInitializing] = useState(true);

    const initializeToken = useCallback(async () => {
        try {
            const newAccessToken = await tryRefreshToken();

            if (newAccessToken) {
                login(newAccessToken);
            }
        } catch {
            localStorage.removeItem('accessToken');
        } finally {
            setIsInitializing(false);
        }
    }, [login]);

    useEffect(() => {
        if (!isAuthenticated) {
            initializeToken();
        } else {
            setIsInitializing(false);
        }
    }, [initializeToken, isAuthenticated, isInitializing]);

    return { isInitializing };
};
