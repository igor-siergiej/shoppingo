import { getAccessToken } from '@imapps/web-utils';
import { getAuthConfig } from '../config/auth';

/** Bearer auth header for the current access token, or empty when not signed in. */
export const getAuthHeaders = (): Record<string, string> => {
    // Suppress the unused-config warning: getAuthConfig is retained for callers that need
    // to know whether the auth service is configured at all.
    void getAuthConfig();
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
