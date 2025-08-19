export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
}

export const tryRefreshToken = async (): Promise<string | null> => {
    try {
        const response = await fetch(`/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            return null;
        }

        const data: RefreshTokenResponse = await response.json();

        return data.accessToken;
    } catch {
        return null;
    }
};

export const clearRefreshTokenCookie = (): void => {
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

export const refreshAccessToken = async (): Promise<string> => {
    try {
        const response = await fetch(`/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                clearRefreshTokenCookie();
                throw new Error('Refresh token expired. Please log in again.');
            } else {
                throw new Error(`Failed to refresh token: ${response.status}`);
            }
        }

        const data: RefreshTokenResponse = await response.json();

        return data.accessToken;
    } catch (error) {
        clearRefreshTokenCookie();
        throw error;
    }
};

export const withTokenRefresh = async <T>(
    requestFn: () => Promise<T>,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
): Promise<T> => {
    try {
        return await requestFn();
    } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
            try {
                const newAccessToken = await tryRefreshToken();

                if (newAccessToken) {
                    onTokenRefresh(newAccessToken);

                    return await requestFn();
                } else {
                    onTokenClear();
                    clearRefreshTokenCookie();
                    throw new Error('No valid refresh token available');
                }
            } catch (refreshError) {
                onTokenClear();
                clearRefreshTokenCookie();
                throw refreshError;
            }
        }

        throw error;
    }
};
