import type { Context, Next } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted ensures mockConfigGet is available when vi.mock is hoisted
const mockConfigGet = vi.hoisted(() => vi.fn());
vi.mock('../config', () => ({
    config: { get: mockConfigGet },
}));

import { authenticate } from './auth';

const createMockContext = (overrides: Partial<Context> = {}): Context => {
    const ctx = {
        headers: {},
        request: {
            headers: {},
            ip: '127.0.0.1',
        },
        state: {},
        status: 200,
        body: undefined,
        ip: '127.0.0.1',
        ...overrides,
    } as unknown as Context;

    return ctx;
};

const mockNext: Next = vi.fn().mockResolvedValue(undefined);

describe('authenticate middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConfigGet.mockReturnValue('http://localhost:3001');
    });

    describe('When Authorization header is missing', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ headers: {} });

            await authenticate(ctx, mockNext);

            expect(ctx.status).toBe(401);
            expect(ctx.body).toEqual({ error: 'Missing or invalid authorization header' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe("When Authorization header does not start with 'Bearer '", () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ headers: { authorization: 'Basic abc123' } });

            await authenticate(ctx, mockNext);

            expect(ctx.status).toBe(401);
            expect(ctx.body).toEqual({ error: 'Missing or invalid authorization header' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When authUrl is not configured', () => {
        it('should return 500', async () => {
            mockConfigGet.mockReturnValue(undefined);
            const ctx = createMockContext({ headers: { authorization: 'Bearer valid-token' } });

            await authenticate(ctx, mockNext);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Authentication service not configured' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo returns a non-OK response', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ headers: { authorization: 'Bearer expired-token' } });
            global.fetch = vi.fn().mockResolvedValue({ ok: false });

            await authenticate(ctx, mockNext);

            expect(ctx.status).toBe(401);
            expect(ctx.body).toEqual({ error: 'Invalid or expired token' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo response has success: false', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ headers: { authorization: 'Bearer token' } });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: false }),
            });

            await authenticate(ctx, mockNext);

            expect(ctx.status).toBe(401);
            expect(ctx.body).toEqual({ error: 'Invalid token response' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When Kivo response has no payload', () => {
        it('should return 401', async () => {
            const ctx = createMockContext({ headers: { authorization: 'Bearer token' } });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ success: true, payload: null }),
            });

            await authenticate(ctx, mockNext);

            expect(ctx.status).toBe(401);
            expect(ctx.body).toEqual({ error: 'Invalid token response' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When token is valid', () => {
        it('should set ctx.state.user and call next()', async () => {
            const ctx = createMockContext({ headers: { authorization: 'Bearer valid-token' } });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'user-1', username: 'alice' },
                }),
            });

            await authenticate(ctx, mockNext);

            expect(ctx.state.user).toEqual({ id: 'user-1', username: 'alice' });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should call Kivo /verify with the Authorization header', async () => {
            const ctx = createMockContext({ headers: { authorization: 'Bearer my-token' } });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'user-1', username: 'alice' },
                }),
            });
            global.fetch = mockFetch;

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
            const ctx = createMockContext({ headers: { authorization: 'Bearer token' } });
            global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

            await authenticate(ctx, mockNext);

            expect(ctx.status).toBe(503);
            expect(ctx.body).toEqual({ error: 'Authentication service unavailable' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('When an Origin header is present in the request', () => {
        it('should forward the Origin header to Kivo', async () => {
            const ctx = createMockContext({
                headers: { authorization: 'Bearer token' },
                request: {
                    headers: { origin: 'https://shoppingo.imapps.co.uk' },
                    ip: '127.0.0.1',
                } as any,
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch;

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
            const ctx = createMockContext({
                headers: { authorization: 'Bearer token' },
                request: {
                    headers: { referer: 'https://shoppingo.imapps.co.uk/some/page' },
                    ip: '127.0.0.1',
                } as any,
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch;

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
            const ctx = createMockContext({
                headers: { authorization: 'Bearer token' },
                request: {
                    headers: { origin: 'localhost:4000' },
                    ip: '127.0.0.1',
                } as any,
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    payload: { id: 'u1', username: 'bob' },
                }),
            });
            global.fetch = mockFetch;

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
