import { getAccessToken } from '../auth/accessTokenStore';
import { getAuthConfig } from '../config/auth';

/** Bearer auth header for the current access token, or empty when not signed in. */
export const getAuthHeaders = (): Record<string, string> => {
    // The token lives in an in-memory store (auth/accessTokenStore); not in DOM storage.
    void getAuthConfig();
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
