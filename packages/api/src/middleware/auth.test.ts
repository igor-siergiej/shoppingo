import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { Context } from 'hono';

import '../test-setup';
import { config } from '../config';
import { authenticate } from './auth';

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
});
