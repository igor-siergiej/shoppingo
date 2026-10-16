import type { AuthConfig } from '@imapps/web-utils';

import { getConfig } from '../utils/config';

export const getAuthConfig = (): AuthConfig => {
    const config = getConfig();

    return {
        authUrl: config.AUTH_URL,
        // The access token no longer lives in DOM storage; it is held in module memory by web-utils.
        // storageType / accessTokenKey are kept here for type-compatibility with older AuthConfig
        // shapes but are no longer read.
        refreshTokenCookieName: 'refreshToken',
        endpoints: {
            refresh: '/refresh',
            logout: '/logout',
        },
    };
};
