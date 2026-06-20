import { beforeEach, describe, expect, it, vi } from 'bun:test';

import { IpRateLimiter } from '../../infrastructure/rateLimit';

const mockDependencyContainer = {
    resolve: vi.fn(),
};

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer,
}));

const mockIsAllowed = vi.spyOn(IpRateLimiter.prototype, 'isAllowed');

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
};

import { receiveLogs } from './index';

const createMockContext = (overrides: { ip?: string; body?: unknown } = {}) => {
    const ip = overrides.ip ?? '127.0.0.1';
    const body = overrides.body ?? {};

    return {
        req: {
            header: (name: string) => {
                if (name === 'x-forwarded-for') return ip;
                return undefined;
            },
            json: vi.fn().mockResolvedValue(body),
            raw: {
                headers: {
                    get: (_name: string): null => null,
                },
            },
        },
        json: vi.fn().mockImplementation(
            (responseBody: unknown, status: number): Response =>
                new Response(JSON.stringify(responseBody), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                })
        ),
    } as unknown as import('hono').Context;
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
                    body: { level: 'info', message: 'Test message' },
                });

                const response = await receiveLogs(ctx);

                expect(mockLogger.info).toHaveBeenCalledWith(
                    'Test message',
                    expect.objectContaining({ source: 'frontend' })
                );
                expect(response.status).toBe(204);
            });

            it('should support all valid log levels', async () => {
                for (const level of ['debug', 'info', 'warn', 'error'] as const) {
                    vi.clearAllMocks();
                    mockDependencyContainer.resolve.mockReturnValue(mockLogger);
                    mockIsAllowed.mockReturnValue(true);

                    const ctx = createMockContext({
                        body: { level, message: `${level} message` },
                    });

                    const response = await receiveLogs(ctx);

                    expect(mockLogger[level]).toHaveBeenCalledWith(`${level} message`, expect.any(Object));
                    expect(response.status).toBe(204);
                }
            });

            it('should include clientIp in log context', async () => {
                const ctx = createMockContext({
                    ip: '192.168.1.100',
                    body: { level: 'info', message: 'msg' },
                });

                await receiveLogs(ctx);

                expect(mockLogger.info).toHaveBeenCalledWith(
                    'msg',
                    expect.objectContaining({ clientIp: '192.168.1.100' })
                );
            });

            it('should include optional context fields', async () => {
                const ctx = createMockContext({
                    body: {
                        level: 'info',
                        message: 'msg',
                        context: { userId: 'u1' },
                        userAgent: 'Mozilla',
                        url: '/some/page',
                    },
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
                    body: { level: 'info', message: 'test' },
                });

                const response = await receiveLogs(ctx);

                expect(response.status).toBe(429);
                expect(await response.json()).toEqual({ error: 'Rate limit exceeded' });
            });

            it('should log a warning when rate limit is exceeded', async () => {
                mockIsAllowed.mockReturnValue(false);

                const ctx = createMockContext({
                    ip: '10.0.0.1',
                    body: { level: 'info', message: 'test' },
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
                    body: { message: 'No level here' },
                });

                const response = await receiveLogs(ctx);

                expect(response.status).toBe(400);
                expect(await response.json()).toEqual({ error: 'level and message are required' });
            });
        });

        describe('When message is missing', () => {
            it('should return 400', async () => {
                const ctx = createMockContext({
                    body: { level: 'info' },
                });

                const response = await receiveLogs(ctx);

                expect(response.status).toBe(400);
                expect(await response.json()).toEqual({ error: 'level and message are required' });
            });
        });

        describe('When an invalid log level is provided', () => {
            it('should return 400', async () => {
                const ctx = createMockContext({
                    body: { level: 'verbose', message: 'test' },
                });

                const response = await receiveLogs(ctx);

                expect(response.status).toBe(400);
                expect(await response.json()).toEqual({ error: 'Invalid log level' });
            });
        });

        describe('When logger throws an error', () => {
            it('should return 500 when logger.info throws', async () => {
                mockLogger.info.mockImplementation(() => {
                    throw new Error('Logger failed');
                });

                const ctx = createMockContext({
                    body: { level: 'info', message: 'test' },
                });

                const response = await receiveLogs(ctx);

                expect(response.status).toBe(500);
                expect(await response.json()).toEqual({ error: 'Failed to process log' });
                expect(mockLogger.error).toHaveBeenCalledWith('Failed to process frontend log', expect.any(Object));
            });

            it('should return 500 when logger.debug throws', async () => {
                mockLogger.debug.mockImplementation(() => {
                    throw new Error('Logger failed');
                });

                const ctx = createMockContext({
                    body: { level: 'debug', message: 'test' },
                });

                const response = await receiveLogs(ctx);

                expect(response.status).toBe(500);
                expect(await response.json()).toEqual({ error: 'Failed to process log' });
            });

            it('should return 500 when logger.warn throws', async () => {
                mockLogger.warn.mockImplementation(() => {
                    throw new Error('Logger failed');
                });

                const ctx = createMockContext({
                    body: { level: 'warn', message: 'test' },
                });

                const response = await receiveLogs(ctx);

                expect(response.status).toBe(500);
                expect(await response.json()).toEqual({ error: 'Failed to process log' });
            });
        });
    });
});
