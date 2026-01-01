import { getStorageItem, setStorageItem, tryRefreshToken } from '@imapps/web-utils';
import { getAuthConfig } from '../../config/auth';
import type { MakeRequestProps } from '../types';

export const makeRequest = async ({ pathname, method, operationString, body, queryParams }: MakeRequestProps) => {
    const authConfig = getAuthConfig();

    // Helper function to execute a request with the given token
    const executeRequest = async (token: string | null) => {
        let url = pathname;

        if (queryParams) {
            const searchParams = new URLSearchParams(queryParams);
            url = `${pathname}?${searchParams.toString()}`;
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add Authorization header if token exists
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return await fetch(url, {
            method: method,
            headers: headers,
            body: body,
        });
    };

    try {
        // Get access token from localStorage
        const accessToken = getStorageItem(
            authConfig.accessTokenKey || 'accessToken',
            authConfig.storageType || 'localStorage'
        );

        // Make the request with current token
        let response = await executeRequest(accessToken);

        // Handle 401 - token may be expired, try to refresh
        if (response.status === 401 && accessToken) {
            console.log('Token expired, attempting refresh...');

            const newToken = await tryRefreshToken(authConfig);

            if (newToken) {
                // Token refresh succeeded, store new token
                setStorageItem(
                    authConfig.accessTokenKey || 'accessToken',
                    newToken,
                    authConfig.storageType || 'localStorage'
                );

                console.log('Token refreshed successfully, retrying request...');

                // Retry the original request with new token
                response = await executeRequest(newToken);
            } else {
                // Token refresh failed, redirect to login
                console.error('Token refresh failed, redirecting to login...');
                window.location.href = '/login';
                throw new Error('Session expired. Please log in again.');
            }
        }

        if (response.ok) {
            return await response.json();
        } else {
            // Try to parse error message from response body
            let errorMessage = response.statusText;
            try {
                const errorBody = await response.json();
                if (errorBody?.error) {
                    errorMessage = errorBody.error;
                }
            } catch {
                // If parsing fails, use status text
            }

            console.error(`Failed to ${operationString}:`, response.status, errorMessage);
            throw new Error(errorMessage);
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Error while trying to ${operationString}`);
    }
};
