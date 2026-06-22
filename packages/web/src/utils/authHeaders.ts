import { getStorageItem } from '@imapps/web-utils';
import { getAuthConfig } from '../config/auth';

/** Bearer auth header for the current access token, or empty when not signed in. */
export const getAuthHeaders = (): Record<string, string> => {
    const authConfig = getAuthConfig();
    const token = getStorageItem(authConfig.accessTokenKey || 'accessToken', authConfig.storageType || 'localStorage');
    return token ? { Authorization: `Bearer ${token}` } : {};
};
