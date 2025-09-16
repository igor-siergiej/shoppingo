import { AuthConfig } from '@igor-siergiej/web-utils';

import { getConfig } from '../utils/config';

export const getAuthConfig = (): AuthConfig => {
    const config = getConfig();

    return {
        authUrl: config.AUTH_URL,
        storageType: 'localStorage',
        accessTokenKey: 'accessToken',
        refreshTokenCookieName: 'refreshToken',
        endpoints: {
            refresh: '/refresh',
            logout: '/logout'
        }
    };
};
