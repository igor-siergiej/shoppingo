import { createAuthClient } from 'better-auth/client';
import { usernameClient } from 'better-auth/client/plugins';

// Same-origin: the api serves Better Auth at /api/auth and the session lives in an httpOnly cookie.
export const authClient = createAuthClient({
    baseURL: typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
    basePath: '/api/auth',
    plugins: [usernameClient()],
});
