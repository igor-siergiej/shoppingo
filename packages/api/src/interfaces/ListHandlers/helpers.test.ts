import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn(),
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer,
}));

const mockListService = {
    getList: vi.fn(),
};

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
};

import { handleError, requireListAccess } from './helpers';

const createMockContext = (overrides: Partial<Context> = {}): Context => {
    const ctx = {
        params: {},
        request: { body: {} } as Context['request'],
        response: { status: 200 } as Context['response'],
        state: { user: { id: 'test-user-1', username: 'testuser' } },
        set: vi.fn(),
        status: 200,
        body: {},
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

describe('ListHandlers helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockImplementation((token: string) => {
            if (token === 'ListService') return mockListService;
            if (token === 'Logger') return mockLogger;
            return null;
        });
    });

    describe('handleError', () => {
        it('sets status from error.status', () => {
            const ctx = createMockContext();
            const error = Object.assign(new Error('Not found'), { status: 404 });

            handleError(ctx, error, mockLogger);

            expect(ctx.response.status).toBe(404);
        });

        it('falls back to 500 when error has no status', () => {
            const ctx = createMockContext();
            const error = new Error('Something went wrong');

            handleError(ctx, error, mockLogger);

            expect(ctx.response.status).toBe(500);
        });

        it('sets body to error message', () => {
            const ctx = createMockContext();
            const error = new Error('Bad request');

            handleError(ctx, error, mockLogger);

            expect(ctx.response.body).toEqual({ error: 'Bad request' });
        });

        it('handles non-Error objects by converting to string', () => {
            const ctx = createMockContext();

            handleError(ctx, 'string error', mockLogger);

            expect(ctx.response.body).toEqual({ error: 'string error' });
            expect(ctx.response.status).toBe(500);
        });

        it('handles null error (covers optional chain null path)', () => {
            const ctx = createMockContext();

            handleError(ctx, null, mockLogger);

            expect(ctx.response.status).toBe(500);
        });

        it('falls back to Internal Server Error when error message is empty', () => {
            const ctx = createMockContext();

            handleError(ctx, new Error(''), mockLogger);

            expect(ctx.response.body).toEqual({ error: 'Internal Server Error' });
        });

        it('calls logger.error with the error message', () => {
            const ctx = createMockContext();
            const error = new Error('Something failed');

            handleError(ctx, error, mockLogger);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Handler error',
                expect.objectContaining({ error: 'Something failed' })
            );
        });

        it('includes additional context in the log', () => {
            const ctx = createMockContext();
            const error = new Error('Oops');
            const context = { listTitle: 'My List' };

            handleError(ctx, error, mockLogger, context);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Handler error',
                expect.objectContaining({ listTitle: 'My List' })
            );
        });
    });

    describe('requireListAccess', () => {
        const authenticatedUser = { id: 'test-user-1', username: 'testuser' };

        describe('When the user is in the list', () => {
            it('returns true', async () => {
                mockListService.getList.mockResolvedValue({
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [],
                    users: [{ id: 'test-user-1', username: 'testuser' }],
                });

                const ctx = createMockContext();
                const result = await requireListAccess('Test List', authenticatedUser, ctx, mockLogger);

                expect(result).toBe(true);
                expect(ctx.response.status).toBe(200);
            });
        });

        describe('When the user is NOT in the list', () => {
            it('returns false and sets status 403', async () => {
                mockListService.getList.mockResolvedValue({
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [],
                    users: [{ id: 'other-user', username: 'other' }],
                });

                const ctx = createMockContext();
                const result = await requireListAccess('Test List', authenticatedUser, ctx, mockLogger);

                expect(result).toBe(false);
                expect(ctx.response.status).toBe(403);
                expect(ctx.response.body).toEqual({ error: 'Forbidden' });
            });
        });

        describe('When getList throws', () => {
            it('returns false and sets status 403', async () => {
                mockListService.getList.mockRejectedValue(new Error('List not found'));

                const ctx = createMockContext();
                const result = await requireListAccess('Non-existent', authenticatedUser, ctx, mockLogger);

                expect(result).toBe(false);
                expect(ctx.response.status).toBe(403);
                expect(ctx.response.body).toEqual({ error: 'Forbidden' });
            });
        });

        describe('When the list has no users array (covers optional chain null path)', () => {
            it('returns false and sets status 403', async () => {
                mockListService.getList.mockResolvedValue({
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [],
                    users: undefined,
                });

                const ctx = createMockContext();
                const result = await requireListAccess('Test List', authenticatedUser, ctx, mockLogger);

                expect(result).toBe(false);
                expect(ctx.response.status).toBe(403);
            });
        });
    });
});
