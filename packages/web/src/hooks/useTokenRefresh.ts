import { useCallback, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { getAuthUrl } from '../utils/config';

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
}

export const useTokenRefresh = () => {
    const { login, logout, accessToken } = useAuth();
    const refreshPromiseRef = useRef<Promise<string> | null>(null);

    const hasRefreshToken = useCallback((): boolean => {
        return document.cookie.split(';').some(cookie =>
            cookie.trim().startsWith('refreshToken=')
        );
    }, []);

    const clearTokens = useCallback(() => {
        logout();
        refreshPromiseRef.current = null;
        // Clear refresh token cookie
        document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }, [logout]);

    const performTokenRefresh = useCallback(async (): Promise<string> => {
        try {
            const response = await fetch(`${getAuthUrl()}/refresh`, {
                method: 'POST',
                credentials: 'include', // Include cookies
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    clearTokens();
                    throw new Error('Refresh token expired. Please log in again.');
                } else {
                    throw new Error(`Failed to refresh token: ${response.status}`);
                }
            }

            const data: RefreshTokenResponse = await response.json();

            // Update the access token in context
            login(data.accessToken);

            return data.accessToken;
        } catch (error) {
            clearTokens();
            throw error;
        }
    }, [login, clearTokens]);

    const refreshTokens = useCallback(async (): Promise<string> => {
        // If there's already a refresh in progress, wait for it
        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        // Start a new refresh process
        refreshPromiseRef.current = performTokenRefresh();

        try {
            const newAccessToken = await refreshPromiseRef.current;

            refreshPromiseRef.current = null;

            return newAccessToken;
        } catch (error) {
            refreshPromiseRef.current = null;
            throw error;
        }
    }, [performTokenRefresh]);

    const getValidAccessToken = useCallback(async (): Promise<string> => {
        if (!accessToken) {
            throw new Error('No access token available. Please log in.');
        }

        // For now, we'll rely on 401 responses to trigger refresh
        // Could implement preemptive refresh based on token expiry
        return accessToken;
    }, [accessToken]);

    return {
        refreshTokens,
        getValidAccessToken,
        hasRefreshToken,
        clearTokens,
    };
};
