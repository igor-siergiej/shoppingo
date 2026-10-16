/**
 * Shared mock-kivo HTTP server.
 *
 * The single source of truth for the kivo stand-in used by:
 *   - the load-test runner (`scripts/load/mock-kivo.ts`, port 3199)
 *   - the Playwright global setup (`e2e/global-setup.ts`, port 3099)
 *   - the dev:local composer (`scripts/dev-local.sh`, port 3099)
 *
 * The server is localhost-only and refuses to start under `NODE_ENV=production`.
 * Tokens it issues are JWT-shaped but unsigned (see `./tokens.ts`); the API
 * verifier must treat the signature as cosmetic and never trust a token that
 * did not come from a process it trusts.
 */

import { decodeClaims, refreshTokenFor, tokenFor } from './tokens';

export interface MockKivoUser {
    id: string;
    username: string;
    password: string;
}

export interface MockKivoOptions {
    port?: number;
    /** Bind host. Defaults to 127.0.0.1; only overridable so tests can use 0.0.0.1 in a container if needed. */
    host?: string;
    /**
     * Shared secret the API will send as `X-Service-Token` on `/users`. When set,
     * the route requires the matching header. When unset, `/users` always returns
     * the seeded user, matching the original e2e behaviour.
     */
    serviceToken?: string;
    /** Pre-existing users the server will accept. Defaults to the two users the e2e suite uses. */
    seedUsers?: Array<{ id: string; username: string; password?: string }>;
}

export interface MockKivoServer {
    url: string;
    port: number;
    host: string;
    close: () => void;
}

const DEFAULT_SEED_USERS: MockKivoUser[] = [
    { id: 'user-testuser', username: 'testuser', password: 'testpassword' },
    { id: 'user-other', username: 'otheruser', password: 'otherpassword' },
];

const json = (body: unknown, init: ResponseInit = {}): Response =>
    new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });

const readBody = async (req: Request): Promise<Record<string, unknown>> => {
    try {
        return (await req.json()) as Record<string, unknown>;
    } catch {
        return {};
    }
};

/**
 * Start a mock kivo on the given port. Throws if `NODE_ENV === 'production'`
 * — the unsigned tokens and cleartext password storage make the mock unsafe
 * to expose in any environment that is not explicitly local development.
 */
export const startMockKivo = (options: MockKivoOptions = {}): MockKivoServer => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'mock-kivo refuses to start under NODE_ENV=production (localhost-only, unsigned tokens, plain-text passwords).'
        );
    }

    const port = options.port ?? Number(process.env.MOCK_KIVO_PORT ?? 3199);
    const host = options.host ?? process.env.MOCK_KIVO_HOST ?? '127.0.0.1';

    const users: MockKivoUser[] = (options.seedUsers ?? DEFAULT_SEED_USERS).map((u) => ({
        id: u.id,
        username: u.username,
        password: u.password ?? `${u.username}-password`,
    }));
    const byUsername: Record<string, MockKivoUser> = Object.fromEntries(users.map((u) => [u.username, u]));

    const server = Bun.serve({
        port,
        hostname: host,
        development: false,
        fetch: async (req) => {
            const { pathname } = new URL(req.url);

            // /health is for compose-style healthchecks and the dev:local script.
            if (req.method === 'GET' && pathname === '/health') {
                return json({ success: true, status: 'ok' });
            }

            // Token verification — the API calls this on every authenticated request.
            if (req.method === 'GET' && pathname === '/verify') {
                const claims = decodeClaims(req.headers.get('authorization'));
                if (!claims.id || !claims.username) {
                    return json({ success: false, error: 'invalid_token' }, { status: 401 });
                }
                return json({
                    success: true,
                    payload: { id: claims.id, username: claims.username },
                });
            }

            // Service-token-protected user lookup.
            if (req.method === 'POST' && pathname === '/users') {
                if (options.serviceToken !== undefined) {
                    const provided = req.headers.get('x-service-token');
                    if (provided !== options.serviceToken) {
                        return json({ success: false, error: 'invalid_service_token' }, { status: 401 });
                    }
                }
                const claims = decodeClaims(req.headers.get('authorization'));
                const id = claims.id;
                if (!id) {
                    return json({ success: false, error: 'invalid_token' }, { status: 401 });
                }
                const user = users.find((u) => u.id === id);
                return json({ success: true, users: user ? [{ id: user.id, username: user.username }] : [] });
            }

            // /search is the public-by-default username search used by ManageUsersDrawer.
            if (req.method === 'GET' && pathname === '/search') {
                const q = new URL(req.url).searchParams.get('q')?.toLowerCase() ?? '';
                const matches = users
                    .filter((u) => u.username.toLowerCase().includes(q))
                    .map((u) => ({ id: u.id, username: u.username }));
                return json({
                    success: 'true',
                    usernames: matches.map((u) => u.username),
                    count: matches.length,
                    query: q,
                });
            }

            // Username/password login.
            if (req.method === 'POST' && pathname === '/login') {
                const body = await readBody(req);
                const username = String(body.username ?? '');
                const password = String(body.password ?? '');
                const user = byUsername[username];
                if (!user || user.password !== password) {
                    return json({ success: false, error: 'invalid_credentials' }, { status: 401 });
                }
                return json({ success: true, token: tokenFor(user), user: { id: user.id, username: user.username } });
            }

            // New user registration. Rejects duplicate usernames.
            if (req.method === 'POST' && pathname === '/register') {
                const body = await readBody(req);
                const username = String(body.username ?? '');
                const password = String(body.password ?? '');
                if (!username || !password) {
                    return json({ success: false, error: 'missing_credentials' }, { status: 400 });
                }
                if (byUsername[username]) {
                    return json({ success: false, error: 'username_taken' }, { status: 409 });
                }
                const user: MockKivoUser = {
                    id: `user-${username}`,
                    username,
                    password,
                };
                byUsername[username] = user;
                users.push(user);
                return json(
                    { success: true, accessToken: tokenFor(user), user: { id: user.id, username: user.username } },
                    { status: 201 }
                );
            }

            // Refresh an existing access token.
            if (req.method === 'POST' && pathname === '/refresh') {
                const claims = decodeClaims(req.headers.get('authorization'));
                const user = users.find((u) => u.id === claims.id);
                if (!user) {
                    return json({ success: false, error: 'invalid_token' }, { status: 401 });
                }
                return json({ success: true, accessToken: refreshTokenFor(user) });
            }

            // /logout is a no-op; the web clears its in-memory token.
            if (req.method === 'POST' && pathname === '/logout') {
                return json({ success: true, message: 'Logged out' });
            }

            return json({ success: false, error: 'not_found' }, { status: 404 });
        },
    });

    const boundPort = server.port ?? port;
    const boundHost = server.hostname ?? host;
    return {
        url: `http://${boundHost}:${boundPort}`,
        port: boundPort,
        host: boundHost,
        close: () => server.stop(true),
    };
};
