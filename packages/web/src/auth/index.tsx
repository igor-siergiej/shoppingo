/**
 * The web's only auth surface.
 *
 * Every component reads auth through this module rather than reaching into
 * `@imapps/web-utils` directly. Right now it is a thin pass-through, so this is a pure
 * refactor with no behaviour change — but it means the later cutover to Better Auth
 * sessions (jott #145) rewrites this one file instead of every caller.
 *
 * The contracts below are deliberately narrower than web-utils' own:
 * `useUser` drops `setUser`/`updateUserFromToken`/`clearUser` and `useAuth` drops
 * `accessToken`/`login`, because no component outside this module uses them and the
 * session cookie will replace the token anyway.
 */

import {
    AuthConfigProvider,
    AuthProvider,
    ProtectedRoute,
    UserProvider,
    useAuth as useWebUtilsAuth,
    useUser as useWebUtilsUser,
} from '@imapps/web-utils';
import type { ReactNode } from 'react';

import { getAuthConfig } from '../config/auth';

/** The signed-in user as the domain sees them: an id and a display name, nothing else. */
export interface SessionUser {
    id: string;
    username: string;
}

export interface UserState {
    user: SessionUser | null;
}

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
}

/**
 * The current user, or null while signed out / still resolving. Components only ever read
 * `id` and `username`, so the narrower `SessionUser` is what they get — web-utils' looser
 * `UserInfo` (which allows arbitrary extra string fields) is not part of our contract.
 */
export const useUser = (): UserState => {
    const { user } = useWebUtilsUser();
    return { user: user ? { id: user.id, username: user.username } : null };
};

/**
 * Sign-in state and the sign-out action. `isLoading` is false for the kivo bearer session
 * this module currently delegates to; the Better Auth cutover (#145) is what makes it
 * meaningful (the session is fetched from the server rather than read from storage).
 */
export const useAuth = (): AuthState => {
    const { isAuthenticated, logout } = useWebUtilsAuth();
    return { isAuthenticated, isLoading: false, logout };
};

/** Redirects to `/login` (or `fallbackPath`) when signed out. */
export { ProtectedRoute };

/**
 * The provider stack that supplies the two hooks above. Wrapped here so `src/index.tsx`
 * does not name web-utils directly — the cutover swaps this component's body and every
 * consumer keeps working.
 */
export const AuthRoot = ({ children }: { children: ReactNode }) => (
    <AuthConfigProvider config={getAuthConfig()}>
        <UserProvider>
            <AuthProvider>{children}</AuthProvider>
        </UserProvider>
    </AuthConfigProvider>
);
