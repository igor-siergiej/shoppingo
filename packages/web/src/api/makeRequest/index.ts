import { getStorageItem, setStorageItem, tryRefreshToken } from '@imapps/web-utils';
import { getAuthConfig } from '../../config/auth';
import { logger } from '../../utils/logger';
import type { MakeRequestProps } from '../types';

// Helper function to execute a request with the given token
const executeRequest = async (
    pathname: string,
    method: string,
    body: string | undefined,
    token: string | null,
    queryParams?: Record<string, string>
) => {
    let url = pathname;

    if (queryParams) {
        const searchParams = new URLSearchParams(queryParams);
        url = `${pathname}?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return await fetch(url, {
        method: method,
        headers: headers,
        body: body,
    });
};

// Parse error message from response, handling both ok and error responses
const parseErrorMessage = async (response: Response): Promise<string> => {
    let errorMessage = response.statusText;
    try {
        const errorBody = await response.json();
        if (errorBody?.error) {
            errorMessage = errorBody.error;
        }
    } catch {
        // If parsing fails, use status text
    }
    return errorMessage;
};

// Handle 401 token refresh and retry
const refreshAndRetry = async (
    authConfig: ReturnType<typeof getAuthConfig>,
    pathname: string,
    method: string,
    body: string | undefined,
    queryParams?: Record<string, string>
): Promise<Response | null> => {
    logger.info('Token expired, attempting to refresh');
    const newToken = await tryRefreshToken(authConfig);

    if (newToken) {
        setStorageItem(authConfig.accessTokenKey || 'accessToken', newToken, authConfig.storageType || 'localStorage');

        logger.info('Token refreshed successfully, retrying request');
        return await executeRequest(pathname, method, body, newToken, queryParams);
    } else {
        logger.warn('Token refresh failed, redirecting to login');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }
};

export const makeRequest = async ({ pathname, method, operationString, body, queryParams }: MakeRequestProps) => {
    const authConfig = getAuthConfig();

    try {
        const accessToken = getStorageItem(
            authConfig.accessTokenKey || 'accessToken',
            authConfig.storageType || 'localStorage'
        );

        let response = await executeRequest(pathname, method, body, accessToken, queryParams);

        if (response.status === 401 && accessToken) {
            const retryResponse = await refreshAndRetry(authConfig, pathname, method, body, queryParams);
            if (retryResponse) {
                response = retryResponse;
            }
        }

        if (response.ok) {
            return await response.json();
        }

        const errorMessage = await parseErrorMessage(response);
        logger.warn(`Request failed for ${operationString}`, {
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error(errorMessage);
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error(`Error while trying to ${operationString}`, {
                error: error.message,
            });
            throw error;
        }
        logger.error(`Error while trying to ${operationString}`, {
            error: 'Unknown error',
        });
        throw new Error(`Error while trying to ${operationString}`);
    }
};
