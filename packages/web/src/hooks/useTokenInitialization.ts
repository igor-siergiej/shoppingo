import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { tryRefreshToken } from '../utils/tokenUtils';

export const useTokenInitialization = () => {
    const { login } = useAuth();
    const [isInitializing, setIsInitializing] = useState(true);

    const initializeToken = useCallback(async () => {
        try {
            const newAccessToken = await tryRefreshToken();
            if (newAccessToken) {
                login(newAccessToken);
            } else {
                console.log('No valid refresh token found');
            }
        } catch {
            console.log('Token refresh failed');
        } finally {
            setIsInitializing(false);
        }
    }, [login]);

    useEffect(() => {
        initializeToken();
    }, [initializeToken]);

    return { isInitializing };
};
