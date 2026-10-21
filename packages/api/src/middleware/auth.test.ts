import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { memoryAdapter } from 'better-auth/adapters/memory';
import type { Context } from 'hono';

import { config } from '../config';
import { type Auth, createAuth } from '../infrastructure/BetterAuth';
import { __setAuthGetterForTests, authenticate, clearVerifyCache } from './auth';

type AuthVars = { Variables: { user: { id: string; username: string } } };

const mockConfigGet = vi.spyOn(config as { get: (...args: unknown[]) => unknown }, 'get');

const createMockContext = (
    headers: Record<string, string> = {},
    requestHeaders: Record<string, string> = {}
): Context<AuthVars> => {
    const allHeaders = { ...headers, ...requestHeaders };
    const req = new Request('http://localhost/', {
        headers: allHeaders,
    });

    const ctx = {
        req: {
            header: (name: string) => allHeaders[name.toLowerCase()] ?? allHeaders[name],
            raw: req,
        },
        json: vi.fn().mockImplementation(
            (body, status) =>
                new Response(JSON.stringify(body), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                })
        ),
        set: vi.fn(),
        get: vi.fn(),
    } as unknown as Context<AuthVars>;

    return ctx;
};

const mockNext = vi.fn().mockResolvedValue(undefined);

describe('authenticate middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearVerifyCache();
        mockConfigGet.mockReturnValue('http://localhost:3001');
    });

    describe('When Authorization header is missing', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({});

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Missing or invalid authorization header' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe("When Authorization header does not start with 'Bearer '", () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Basic abc123' });

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Missing or invalid authorization header' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When authUrl is not configured', () => {
        it('should return 500', async () => {
            mockConfigGet.mockReturnValue(undefined);
            const ctx = createMockContext({ authorization: 'Bearer valid-token' });

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(500);
            expect(await result?.json()).toEqual({ error: 'Authentication service not configured' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo returns a non-OK response', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Bearer expired-token' });
            global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Invalid or expired token' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo response has success: false', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: false }),
            }) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Invalid token response' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo response has no payload', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: true, payload: null }),
            }) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(401);
            expect(await result?.json()).toEqual({ error: 'Invalid token response' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When token is valid', () => {
        it('should set user on context and call next()', async () => {
            const ctx = createMockContext({ authorization: 'Bearer valid-token' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'user-1', username: 'alice' },
                }),
            }) as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(ctx.set).toHaveBeenCalledWith('user', { id: 'user-1', username: 'alice' });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should call Kivo /verify with the Authorization header', async () => {
            const ctx = createMockContext({ authorization: 'Bearer my-token' });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'user-1', username: 'alice' },
                }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/verify',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
                })
            );
        });
    });

    describe('When fetch throws a network error', () => {
        it('should return 503', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' });
            global.fetch = vi.fn().mockRejectedValue(new Error('Network failure')) as unknown as typeof fetch;

            const result = await authenticate(ctx, mockNext);

            expect(result?.status).toBe(503);
            expect(await result?.json()).toEqual({ error: 'Authentication service unavailable' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When an Origin header is present in the request', () => {
        it('should forward the Origin header to Kivo', async () => {
            const ctx = createMockContext(
                { authorization: 'Bearer token' },
                { origin: 'https://shoppingo.imapps.co.uk' }
            );
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ Origin: 'https://shoppingo.imapps.co.uk' }),
                })
            );
        });
    });

    describe('When a Referer header is present (but no Origin)', () => {
        it('should extract and forward the origin from the referer', async () => {
            const ctx = createMockContext(
                { authorization: 'Bearer token' },
                { referer: 'https://shoppingo.imapps.co.uk/some/page' }
            );
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ Origin: 'https://shoppingo.imapps.co.uk' }),
                })
            );
        });
    });

    describe('When Origin header is present but has no protocol (no "://")', () => {
        it('should forward the origin as-is without splitting', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' }, { origin: 'localhost:4000' });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ Origin: 'localhost:4000' }),
                })
            );
        });
    });

    describe('When the same token is presented repeatedly', () => {
        const okResponse = () => ({
            ok: true,
            json: vi.fn().mockResolvedValue({ success: true, payload: { id: 'u1', username: 'bob' } }),
        });

        it('should only call Kivo once and still authenticate every request', async () => {
            const mockFetch = vi.fn().mockImplementation(async () => okResponse());
            global.fetch = mockFetch as unknown as typeof fetch;
            const first = createMockContext({ authorization: 'Bearer repeat-token' });
            const second = createMockContext({ authorization: 'Bearer repeat-token' });

            await authenticate(first, mockNext);
            await authenticate(second, mockNext);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(second.set).toHaveBeenCalledWith('user', { id: 'u1', username: 'bob' });
            expect(mockNext).toHaveBeenCalledTimes(2);
        });

        it('should not share a cached identity between different tokens', async () => {
            const mockFetch = vi.fn().mockImplementation(async () => okResponse());
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(createMockContext({ authorization: 'Bearer token-a' }), mockNext);
            await authenticate(createMockContext({ authorization: 'Bearer token-b' }), mockNext);

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should not cache a rejected token', async () => {
            const mockFetch = vi
                .fn()
                .mockResolvedValueOnce({ ok: false, json: vi.fn() })
                .mockImplementation(async () => okResponse());
            global.fetch = mockFetch as unknown as typeof fetch;

            const rejected = await authenticate(createMockContext({ authorization: 'Bearer flaky' }), mockNext);
            await authenticate(createMockContext({ authorization: 'Bearer flaky' }), mockNext);

            expect(rejected?.status).toBe(401);
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });
    });

    describe('When the request carries an X-Forwarded-For header', () => {
        it('should forward it to Kivo so the limit applies per client, not per shoppingo', async () => {
            const ctx = createMockContext({ authorization: 'Bearer token' }, { 'x-forwarded-for': '203.0.113.7' });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: true, payload: { id: 'u1', username: 'bob' } }),
            });
            global.fetch = mockFetch as unknown as typeof fetch;

            await authenticate(ctx, mockNext);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ 'X-Forwarded-For': '203.0.113.7' }),
                })
            );
        });
    });
});

// Better Auth session-cookie path. Each test installs a fresh `memoryAdapter` Auth into the
// middleware via the test seam, signs a user up to mint a real session cookie, and drives
// `authenticate` with `Request`-shaped headers. The kivo-bearer fallback is verified above;
// this block proves the new session path wires `c.get('user')` correctly.
//
// The memory adapter is `better-auth/adapters/memory`; its deep-shape parameter and the
// `createAuth` factory parameter are structurally identical but the inference path treats
// them as unrelated. Named alias keeps the cast honest and out of the call site.
type AuthDatabase = Parameters<typeof createAuth>[0]['database'];

describe('authenticate middleware with Better Auth session', () => {
    interface UserRow {
        id: string;
        username?: string;
        displayUsername?: string;
    }
    const buildAuth = (): { auth: Auth; db: { user: UserRow[] } } => {
        const db: Record<string, unknown[]> = {
            user: [],
            session: [],
            account: [],
            verification: [],
            rateLimit: [],
        };
        const memoryAuthDb = memoryAdapter(db) as unknown as AuthDatabase;
        const auth = createAuth({
            database: memoryAuthDb,
            secret: 'test-secret-test-secret-test-secret-123',
            baseURL: 'http://localhost:4000',
            trustedOrigins: ['http://localhost:4000'],
        });
        return { auth, db: db as unknown as { user: UserRow[] } };
    };

    const signUpAndGetCookie = async (
        auth: Auth
    ): Promise<{ cookieHeader: string; userId: string; username: string }> => {
        const signUp = await auth.api.signUpEmail({
            body: { email: 'x@y.z', name: 'Alice', password: 'password123', username: 'Alice' },
            asResponse: true,
        });
        const setCookie = signUp.headers.get('set-cookie');
        if (!setCookie) throw new Error('sign-up did not set the session cookie');
        const userId = ((await signUp.json()) as { user: { id: string } }).user.id;
        return { cookieHeader: setCookie.split(';')[0], userId, username: 'Alice' };
    };

    beforeEach(() => {
        __setAuthGetterForTests(() => undefined);
        vi.clearAllMocks();
        mockNext.mockClear();
    });

    it("sets c.get('user') to {id, username} when a session cookie is present", async () => {
        const { auth } = buildAuth();
        __setAuthGetterForTests(() => auth);
        const { cookieHeader, userId, username } = await signUpAndGetCookie(auth);

        const ctx = createMockContext({}, { cookie: cookieHeader });
        await authenticate(ctx, mockNext);

        expect(ctx.set).toHaveBeenCalledWith('user', { id: userId, username });
        expect(mockNext).toHaveBeenCalled();
    });

    it('returns 403 username_required when the session user has no username yet', async () => {
        const { auth, db } = buildAuth();
        __setAuthGetterForTests(() => auth);
        // Sign up normally so Better Auth hands back a properly-signed session cookie, then
        // mutate the in-memory user row to clear its username — Better Auth's username
        // validation hook rejects an empty username over its HTTP/adapter surface, but the
        // memory adapter here is just an array, so the path that drives `getSession` is what
        // a fresh Google sign-in (no username yet) actually looks like.
        const signUp = await auth.api.signUpEmail({
            body: {
                email: 'google-user@example.test',
                name: 'googleuser',
                password: 'password123',
                username: 'googleuser',
            },
            asResponse: true,
        });
        const cookieHeader = signUp.headers.get('set-cookie')?.split(';')[0];
        if (!cookieHeader) throw new Error('sign-up did not set the session cookie');
        const userId = ((await signUp.json()) as { user: { id: string } }).user.id;
        const target = db.user.find((u) => u.id === userId);
        if (target) {
            delete target.username;
            delete target.displayUsername;
        }
        const reqCtx = createMockContext({}, { cookie: cookieHeader });
        const result = await authenticate(reqCtx, mockNext);

        expect(result?.status).toBe(403);
        expect(await result?.json()).toEqual({ error: 'username_required' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 when no cookie and no bearer are present', async () => {
        const ctx = createMockContext({});
        const result = await authenticate(ctx, mockNext);
        expect(result?.status).toBe(401);
    });

    it('prefers the Better Auth session over a kivo bearer header when both are present', async () => {
        const { auth } = buildAuth();
        __setAuthGetterForTests(() => auth);
        const { cookieHeader, userId, username } = await signUpAndGetCookie(auth);
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ success: true, payload: { id: 'kivo-user', username: 'kivoBob' } }),
        }) as unknown as typeof fetch;

        const ctx = createMockContext({ authorization: 'Bearer kivo-token' }, { cookie: cookieHeader });
        await authenticate(ctx, mockNext);

        expect(ctx.set).toHaveBeenCalledWith('user', { id: userId, username });
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
