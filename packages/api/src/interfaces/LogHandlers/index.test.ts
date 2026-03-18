import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'bun:test';

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn(),
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer,
}));

// Mock IpRateLimiter so tests control rate limit behaviour
const mockIsAllowed = vi.hoisted(() => vi.fn().mockReturnValue(true));
vi.mock('../../infrastructure/rateLimit', () => ({
    IpRateLimiter: vi.fn().mockImplementation(() => ({
        isAllowed: mockIsAllowed,
        reset: vi.fn(),
    })),
}));

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
};

import { receiveLogs } from './index';

const createMockContext = (overrides: Partial<Context> = {}): Context => {
    const ctx = {
        ip: '127.0.0.1',
        request: {
            ip: '127.0.0.1',
            body: {},
        } as Context['request'],
        response: { status: 200 } as Context['response'],
        status: 200,
        body: undefined,
        ...overrides,
    } as Context;

    Object.defineProperty(ctx, 'status', {
        get: () => ctx.response.status,
        set: (value) => {
            ctx.response.status = value;
        },
        configurable: true,
        enumerable: true,
    });

    Object.defineProperty(ctx, 'body', {
        get: () => ctx.response.body,
        set: (value) => {
            ctx.response.body = value;
        },
        configurable: true,
        enumerable: true,
    });

    return ctx;
};

describe('LogHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockReturnValue(mockLogger);
        mockIsAllowed.mockReturnValue(true);
    });

    describe('receiveLogs', () => {
        describe('When a valid log is received', () => {
            it('should log the message and return 204', async () => {
                const ctx = createMockContext({
                    request: {
                        ip: '127.0.0.1',
                        body: { level: 'info', message: 'Test message' },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(mockLogger.info).toHaveBeenCalledWith(
                    'Test message',
                    expect.objectContaining({ source: 'frontend' })
                );
                expect(ctx.response.status).toBe(204);
            });

            it('should support all valid log levels', async () => {
                for (const level of ['debug', 'info', 'warn', 'error'] as const) {
                    vi.clearAllMocks();
                    mockDependencyContainer.resolve.mockReturnValue(mockLogger);
                    mockIsAllowed.mockReturnValue(true);

                    const ctx = createMockContext({
                        request: {
                            ip: '127.0.0.1',
                            body: { level, message: `${level} message` },
                        } as Context['request'],
                    });

                    await receiveLogs(ctx);

                    expect(mockLogger[level]).toHaveBeenCalledWith(`${level} message`, expect.any(Object));
                    expect(ctx.response.status).toBe(204);
                }
            });

            it('should include clientIp in log context', async () => {
                const ctx = createMockContext({
                    ip: '192.168.1.100',
                    request: {
                        ip: '192.168.1.100',
                        body: { level: 'info', message: 'msg' },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(mockLogger.info).toHaveBeenCalledWith(
                    'msg',
                    expect.objectContaining({ clientIp: '192.168.1.100' })
                );
            });

            it('should include optional context fields', async () => {
                const ctx = createMockContext({
                    request: {
                        ip: '127.0.0.1',
                        body: {
                            level: 'info',
                            message: 'msg',
                            context: { userId: 'u1' },
                            userAgent: 'Mozilla',
                            url: '/some/page',
                        },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(mockLogger.info).toHaveBeenCalledWith(
                    'msg',
                    expect.objectContaining({ userId: 'u1', userAgent: 'Mozilla', url: '/some/page' })
                );
            });
        });

        describe('When the rate limit is exceeded', () => {
            it('should return 429', async () => {
                mockIsAllowed.mockReturnValue(false);

                const ctx = createMockContext({
                    request: {
                        ip: '127.0.0.1',
                        body: { level: 'info', message: 'test' },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(ctx.response.status).toBe(429);
                expect(ctx.response.body).toEqual({ error: 'Rate limit exceeded' });
            });

            it('should log a warning when rate limit is exceeded', async () => {
                mockIsAllowed.mockReturnValue(false);

                const ctx = createMockContext({
                    request: {
                        ip: '10.0.0.1',
                        body: { level: 'info', message: 'test' },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(mockLogger.warn).toHaveBeenCalledWith(
                    'Frontend logs rate limit exceeded',
                    expect.objectContaining({ clientIp: expect.any(String) })
                );
            });
        });

        describe('When level is missing', () => {
            it('should return 400', async () => {
                const ctx = createMockContext({
                    request: {
                        ip: '127.0.0.1',
                        body: { message: 'No level here' },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(ctx.response.status).toBe(400);
                expect(ctx.response.body).toEqual({ error: 'level and message are required' });
            });
        });

        describe('When message is missing', () => {
            it('should return 400', async () => {
                const ctx = createMockContext({
                    request: {
                        ip: '127.0.0.1',
                        body: { level: 'info' },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(ctx.response.status).toBe(400);
                expect(ctx.response.body).toEqual({ error: 'level and message are required' });
            });
        });

        describe('When an invalid log level is provided', () => {
            it('should return 400', async () => {
                const ctx = createMockContext({
                    request: {
                        ip: '127.0.0.1',
                        body: { level: 'verbose', message: 'test' },
                    } as Context['request'],
                });

                await receiveLogs(ctx);

                expect(ctx.response.status).toBe(400);
                expect(ctx.response.body).toEqual({ error: 'Invalid log level' });
            });
        });
    });
});
