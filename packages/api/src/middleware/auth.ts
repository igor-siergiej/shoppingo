import { createHash } from 'node:crypto';
import type { Context, Next } from 'hono';
import { config } from '../config';

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

// Cache lookup, Kivo verify and response-shape checks in one linear flow; splitting further would scatter one request.
// fallow-ignore-next-line complexity
export const authenticate = async (c: Context<AuthVariables>, next: Next) => {
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
