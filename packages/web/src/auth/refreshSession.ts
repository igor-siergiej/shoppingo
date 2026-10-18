import { tryRefreshToken } from '@imapps/web-utils';
import { getAuthConfig } from '../config/auth';
import { setAccessToken } from './accessTokenStore';

let inFlight: Promise<string | null> | null = null;

/**
 * Swap the refresh cookie for a new access token and store it. Resolves to the new token, or null when the
 * session can't be refreshed. kivo rotates the refresh token on every call and rejects a second use of the old
 * one, so concurrent callers (a screen of queries and recipe covers all 401ing on the same expired token) share
 * a single request instead of racing each other into a failed refresh.
 */
export const refreshSession = (): Promise<string | null> => {
    inFlight ??= tryRefreshToken(getAuthConfig())
        .then((token) => {
            if (token) setAccessToken(token);
            return token;
        })
        .finally(() => {
            inFlight = null;
        });
    return inFlight;
};
