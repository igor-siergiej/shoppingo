/**
 * Shared mock-kivo server. The single source of truth for the standalone
 * kivo stand-in used by:
 *
 *   - the load-test runner (scripts/load/mock-kivo.ts → port 3199)
 *   - the Playwright global setup (e2e/global-setup.ts → port 3099)
 *   - the new dev:local composer (package.json → port 3099 by default)
 *
 * The mock must never be reachable from anything that isn't localhost. It
 * refuses to start when NODE_ENV=production. The whole server listens on
 * 127.0.0.1 so a developer's LAN or a careless docker bridge can never
 * silently consume the tokens it issues.
 */

import { decodeClaims, refreshTokenFor, tokenFor } from './tokens';

export interface MockKivoOptions {
    /** Port to listen on (defaults to 3199, the load-test port). */
    port?: number;
    /** Bind host (always localhost; surface parameterised only so tests can override). */
    host?: string;
    /**
     * Service token the API will send on /users. When set, /users responds
     * 200. When unset, /users responds 401 (matches kivo's pre-LOOKUP_AUTH behaviour).
     */
    serviceToken?: string;
    /**
     * Optional seed users the mock will recognise on /users lookups.
     * Defaults to the two users the e2e suite uses.
     */
    seedUsers?: Array<{ id: string; username: string }>;
}

export interface MockKivoServer {
    /** The underlying Bun HTTP server; stop it via `.stop()`. */
    server: Bun.Server;
    /** Human-friendly origin string such as `http://127.0.0.1:3199`. */
    url: string;
    /** Port the server is bound to (echoes `options.port` or the picked default). */
    port: number;
    /** Stop the server; safe to call multiple times. */
    close: () => void;
}

interface RegisteredUser {
    id: string;
    username: string;
    password: string;
}

const DEFAULT_SEED_USERS: RegisteredUser[] = [
    { id: 'user-testuser', username: 'testuser', password: 'testpw123' },
    { id: 'user-other', username: 'otheruser', password: 'otherpw123' },
];

const defaultSeed = (): RegisteredUser[] => DEFAULT_SEED_USERS.map((u) => ({ ...u }));

const json = (body: unknown, init: ResponseInit = {}): Response =>
    new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });

export const startMockKivo = (options: MockKivoOptions = {}): MockKivoServer => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'mock-kivo refuses to start in production. It is a localhost-only stand-in for local dev, ' +
                'load tests and the e2e suite — point a real kivo at production deployments.'
        );
    }
    const port = options.port ?? Number(process.env.MOCK_KIVO_PORT ?? 3199);
    const host = options.host ?? '127.0.0.1';

    // Mutable registration store so /register actually creates users. Reset
    // before each load-test run via the load runner; the e2e suite shares
    // the same default seeds.
    const registered: RegisteredUser[] = options.seedUsers
        ? options.seedUsers.map((u) => ({ ...u, password: 'mockpw' }))
        : defaultSeed();
    const serviceToken = options.serviceToken ?? process.env.SERVICE_TOKEN;

    const userByUsername = (username: string): RegisteredUser | undefined =>
        registered.find((u) => u.username === username);

    const server = Bun.serve({
        port,
        hostname: host,
        development: false, // keep Bun's default error handler; this is a mock
        fetch: async (req) => {
            const url = new URL(req.url);
            const pathname = url.pathname;

            // GET /verify — extractor, called by the API's AuthClient.verify.
            if (req.method === 'GET' && pathname === '/verify') {
                const claims = decodeClaims(req.headers.get('authorization'));
                if (!claims.id || !claims.username) {
                    return json({ success: false }, { status: 401 });
                }
                return json({ success: true, payload: { id: claims.id, username: claims.username } });
            }

            // POST /login — the web's useLoginForm posts { username, password }.
            if (req.method === 'POST' && pathname === '/login') {
                const body = (await req.json().catch(() => ({}))) as {
                    username?: string;
                    password?: string;
                };
                const user = body.username ? userByUsername(body.username) : undefined;
                if (!user || (body.password !== undefined && user.password !== body.password)) {
                    return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
                }
                return json({ token: tokenFor(user), user: { id: user.id, username: user.username } });
            }

            // POST /register — the web's useRegisterForm posts { username, password }.
            if (req.method === 'POST' && pathname === '/register') {
                const body = (await req.json().catch(() => ({}))) as {
                    username?: string;
                    password?: string;
                };
                const username = body.username?.trim();
                const password = body.password?.trim();
                if (!username || !password) {
                    return json({ success: false, error: 'Username and password required' }, { status: 400 });
                }
                if (userByUsername(username)) {
                    return json({ success: false, error: 'Username taken' }, { status: 409 });
                }
                const user: RegisteredUser = {
                    id: `user-${username}`,
                    username,
                    password,
                };
                registered.push(user);
                const token = refreshTokenFor(user);
                return json({ accessToken: token, user: { id: user.id, username: user.username } });
            }

            // POST /refresh — returns a fresh access token for a still-valid refresh cookie.
            if (req.method === 'POST' && pathname === '/refresh') {
                const body = (await req.json().catch(() => ({}))) as { username?: string };
                const user = body.username ? userByUsername(body.username) : undefined;
                if (!user) return json({ success: false, error: 'Unknown user' }, { status: 401 });
                return json({ accessToken: refreshTokenFor(user) });
            }

            // POST /logout — clears the cookie server-side; the mock just acks.
            if (req.method === 'POST' && pathname === '/logout') {
                return json({ message: 'Logout successful' });
            }

            // GET /search?usernames=a,b — the ManageUsersDrawer friend picker.
            if (req.method === 'GET' && pathname === '/search') {
                const usernamesParam = url.searchParams.get('usernames') ?? '';
                const wanted = usernamesParam
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                const matches = registered
                    .filter((u) => wanted.includes(u.username))
                    .map((u) => ({ id: u.id, username: u.username }));
                const notFoundUsernames = wanted.filter((w) => !matches.some((m) => m.username === w));
                return json({
                    success: true,
                    usernames: matches.map((m) => m.username),
                    count: matches.length,
                    query: usernamesParam,
                    users: matches,
                    notFoundUsernames,
                });
            }

            // POST /users — server-to-server, API → kivo. Requires the
            // X-Service-Token once LOOKUP_AUTH_ENABLED is on; the API falls
            // back to "no service token configured" if it isn't, so we
            // gate on the header to mirror that.
            if (req.method === 'POST' && pathname === '/users') {
                if (serviceToken && req.headers.get('x-service-token') !== serviceToken) {
                    return json({ success: false, error: 'Bad service token' }, { status: 401 });
                }
                const body = (await req.json().catch(() => ({}))) as { usernames?: string[] };
                const wanted = body.usernames ?? [];
                const matches = registered
                    .filter((u) => wanted.includes(u.username))
                    .map((u) => ({ id: u.id, username: u.username }));
                const notFoundUsernames = wanted.filter((w) => !matches.some((m) => m.username === w));
                return json({ success: true, users: matches, notFoundUsernames });
            }

            // Anything else is a no-op 200. Mirrors the e2e Playwright route
            // stub so a stray request during development doesn't 5xx.
            return json({ success: true });
        },
    });

    const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${server.port}`;
    // eslint-disable-next-line no-console
    console.log(`mock kivo listening on ${url} (localhost only)`);
    return {
        server,
        url,
        port: server.port,
        close: () => server.stop(true),
    };
};
