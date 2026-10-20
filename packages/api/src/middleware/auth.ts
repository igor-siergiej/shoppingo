import { createHash } from 'node:crypto';
import type { Context, Next } from 'hono';
import { config } from '../config';
import { dependencyContainer } from '../dependencies/container';
import { DependencyToken } from '../dependencies/types';
import type { Auth } from '../infrastructure/BetterAuth';

interface KivoVerifyResponse {
    success: boolean;
    payload?: {
        id: string;
        username: string;
    };
    message?: string;
}

type AuthUser = { id: string; username: string };

// Kivo's /verify is a pure function of the JWT (signature + expiry), so a short-lived
// positive cache is safe and keeps one user's traffic from exhausting Kivo's rate limit.
const VERIFY_CACHE_TTL_MS = 30_000;
const VERIFY_CACHE_MAX_ENTRIES = 1000;
const verifyCache = new Map<string, { user: AuthUser; expiresAt: number }>();

// fallow-ignore-next-line unused-export
export const clearVerifyCache = () => verifyCache.clear();

const cacheKey = (authHeader: string) => createHash('sha256').update(authHeader).digest('hex');

const readCache = (key: string): AuthUser | undefined => {
    const entry = verifyCache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
        verifyCache.delete(key);
        return undefined;
    }
    return entry.user;
};

const writeCache = (key: string, user: AuthUser) => {
    if (verifyCache.size >= VERIFY_CACHE_MAX_ENTRIES) {
        // Map iterates in insertion order, so the first key is the oldest entry.
        const oldest = verifyCache.keys().next().value;
        if (oldest !== undefined) verifyCache.delete(oldest);
    }
    verifyCache.set(key, { user, expiresAt: Date.now() + VERIFY_CACHE_TTL_MS });
};

type AuthVariables = { Variables: { user: AuthUser } };

// Three independent optional headers, one line each; splitting further would only scatter them.
// fallow-ignore-next-line complexity
const buildKivoHeaders = (c: Context<AuthVariables>, authHeader: string): Record<string, string> => {
    const headers: Record<string, string> = { Authorization: authHeader };

    // Kivo rate-limits per client IP; without this every shoppingo user shares one bucket.
    const forwardedFor = c.req.header('x-forwarded-for');
    if (forwardedFor) {
        headers['X-Forwarded-For'] = forwardedFor;
    }

    const originHeader = c.req.header('origin') || c.req.header('referer');
    if (originHeader) {
        headers.Origin = originHeader.includes('://') ? originHeader.split('/', 3).join('/') : originHeader;
    }

    return headers;
};

// Kivo-bearer path. Kept private: every `authenticate`-protected route should call `authenticate`,
// which prefers Better Auth sessions and falls through to kivo only when no session is present.
// Will be deleted in Task 9 (#147) when the web cutover ships.
// fallow-ignore-next-line complexity
const authenticateKivoBearer = async (c: Context<AuthVariables>, next: Next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const key = cacheKey(authHeader);
    const cachedUser = readCache(key);
    if (cachedUser) {
        c.set('user', cachedUser);
        return next();
    }

    try {
        const kivoUrl = config.get('authUrl');
        if (!kivoUrl) {
            return c.json({ error: 'Authentication service not configured' }, 500);
        }

        const response = await fetch(`${kivoUrl}/verify`, {
            method: 'GET',
            headers: buildKivoHeaders(c, authHeader),
        });

        if (!response.ok) {
            return c.json({ error: 'Invalid or expired token' }, 401);
        }

        const data = (await response.json()) as KivoVerifyResponse;

        if (!data.success || !data.payload) {
            return c.json({ error: 'Invalid token response' }, 401);
        }

        const user = { id: data.payload.id, username: data.payload.username };
        writeCache(key, user);
        c.set('user', user);

        await next();
    } catch (error) {
        console.error('Authentication error:', error);
        return c.json({ error: 'Authentication service unavailable' }, 503);
    }
};

// Resolve the Better Auth cookie session into `{id, username}` and call `next`.
// Domain code keeps the same `{id, username}` contract as before; users who authenticated via
// Google without picking a username yet hit username_required (Task 8 #146 routes them to
// /choose-username). Returning `undefined` means "no session", which lets the caller fall
// through to another method (kivo bearer today).
//
// `getAuthForRequest` is a test seam: production reads DependencyToken.Auth from the DI
// container once, but tests install a `memoryAdapter` instance and reset it per case without
// poking into the container's internals.
type AuthGetter = () => Auth | undefined;
let getAuthForRequest: AuthGetter = () => {
    try {
        return dependencyContainer.resolve(DependencyToken.Auth);
    } catch {
        // DependencyToken.Auth throws when BETTER_AUTH_SECRET is unset; in that boot mode
        // (kivo-only) there is no session to look up, so the call falls through to the
        // kivo bearer path that the caller already implements.
        return undefined;
    }
};
// fallow-ignore-next-line unused-export
export const __setAuthGetterForTests = (next: AuthGetter) => {
    getAuthForRequest = next;
};

const sessionToAuthUser = (session: { user: { id: string; username?: string | null; displayUsername?: string | null } }, c: Context<AuthVariables>): AuthUser | Response => {
    const username = session.user.displayUsername ?? session.user.username;
    if (!username) {
        return c.json({ error: 'username_required' }, 403);
    }
    return { id: session.user.id, username };
};

const resolveBetterAuthSession = async (c: Context<AuthVariables>): Promise<AuthUser | undefined | Response> => {
    const auth = getAuthForRequest();
    if (!auth) return undefined;
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return undefined;
        return sessionToAuthUser(session, c);
    } catch (error) {
        console.error('Better Auth getSession failed:', error);
        // A broken Better Auth store must not lock the user out — fall through to kivo bearer.
        return undefined;
    }
};

// Cache lookup, Better Auth session, and kivo bearer fallback in one linear flow; splitting further would scatter one request.
// fallow-ignore-next-line complexity
export const authenticate = async (c: Context<AuthVariables>, next: Next) => {
    const sessionUser = await resolveBetterAuthSession(c);
    if (sessionUser instanceof Response) {
        return sessionUser;
    }
    if (sessionUser) {
        c.set('user', sessionUser);
        return next();
    }

    return authenticateKivoBearer(c, next);
};

// Re-exported so callers (e.g. `conditionalImageAuth` in routes/index.ts) can soft-authenticate
// when they want to honour either path without ever returning 401.
export const softAuthenticate = async (c: Context<AuthVariables>): Promise<AuthUser | undefined> => {
    const fromSession = await resolveBetterAuthSession(c);
    if (fromSession instanceof Response) return undefined;
    if (fromSession) return fromSession;
    return bearerFromCache(c.req.header('authorization'));
};

const bearerFromCache = (authHeader: string | undefined): AuthUser | undefined => {
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    return readCache(cacheKey(authHeader));
};
