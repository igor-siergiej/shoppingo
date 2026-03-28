import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { Recipe } from '@shoppingo/types';
import type { Context } from 'koa';

import * as recipeHandlers from './index';

const mockDependencyContainer = {
    resolve: vi.fn(),
};

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer,
}));

vi.mock('node:fs/promises', () => ({
    readFile: vi.fn().mockResolvedValue(Buffer.from('file-bytes')),
}));

const mockRecipeService = {
    getRecipesByUserId: vi.fn(),
    getRecipe: vi.fn(),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    addUserToRecipe: vi.fn(),
    removeUserFromRecipe: vi.fn(),
    setCoverImageKey: vi.fn(),
};

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
};

const mockBucketStore = {
    putObject: vi.fn(),
    getHeadObject: vi.fn(),
    getObjectStream: vi.fn(),
};

const baseRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    ingredients: [],
    ownerId: 'user-1',
    users: [{ id: 'user-1', username: 'testuser' }],
    dateAdded: new Date(),
};

const createMockContext = (overrides: Partial<Context> = {}): Context => {
    const ctx = {
        params: {},
        request: { body: {}, files: undefined } as Context['request'],
        response: { status: 200 } as Context['response'],
        state: { user: { id: 'user-1', username: 'testuser' } },
        ip: '127.0.0.1',
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

describe('RecipeHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockImplementation((token: string) => {
            if (token === 'RecipeService') return mockRecipeService;
            if (token === 'Logger') return mockLogger;
            if (token === 'ImageStore') return mockBucketStore;
            return null;
        });
        mockRecipeService.getRecipe.mockResolvedValue(baseRecipe);
    });

    describe('getRecipes', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({ state: { user: undefined } });
            await recipeHandlers.getRecipes(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns recipes successfully', async () => {
            mockRecipeService.getRecipesByUserId.mockResolvedValue([baseRecipe]);
            const ctx = createMockContext();
            await recipeHandlers.getRecipes(ctx);
            expect(ctx.response.status).toBe(200);
            expect(ctx.response.body).toEqual([baseRecipe]);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.getRecipesByUserId.mockRejectedValue(
                Object.assign(new Error('DB error'), { status: 500 })
            );
            const ctx = createMockContext();
            await recipeHandlers.getRecipes(ctx);
            expect(ctx.response.status).toBe(500);
        });
    });

    describe('getRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' }, state: { user: undefined } });
            await recipeHandlers.getRecipe(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.getRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('returns recipe successfully', async () => {
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.getRecipe(ctx);
            expect(ctx.response.status).toBe(200);
            expect(ctx.response.body).toEqual(baseRecipe);
        });

        it('returns 403 when verifyRecipeAccess throws', async () => {
            mockRecipeService.getRecipe.mockRejectedValueOnce(new Error('not found'));
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.getRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('returns error status on service failure after access check', async () => {
            mockRecipeService.getRecipe
                .mockResolvedValueOnce(baseRecipe)
                .mockRejectedValueOnce(Object.assign(new Error('DB error'), { status: 500 }));
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.getRecipe(ctx);
            expect(ctx.response.status).toBe(500);
        });
    });

    describe('createRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                request: { body: { title: 'Test', ingredients: [] } } as Context['request'],
                state: { user: undefined },
            });
            await recipeHandlers.createRecipe(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 400 when title missing', async () => {
            const ctx = createMockContext({
                request: { body: { title: '', ingredients: [] } } as Context['request'],
            });
            await recipeHandlers.createRecipe(ctx);
            expect(ctx.response.status).toBe(400);
        });

        it('returns 400 when ingredients missing', async () => {
            const ctx = createMockContext({
                request: { body: { title: 'Test' } } as Context['request'],
            });
            await recipeHandlers.createRecipe(ctx);
            expect(ctx.response.status).toBe(400);
        });

        it('creates recipe successfully', async () => {
            mockRecipeService.createRecipe.mockResolvedValue(baseRecipe);
            const ctx = createMockContext({
                request: { body: { title: 'Test', ingredients: [] } } as Context['request'],
            });
            await recipeHandlers.createRecipe(ctx);
            expect(ctx.response.status).toBe(201);
            expect(ctx.response.body).toEqual(baseRecipe);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.createRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 500 }));
            const ctx = createMockContext({
                request: { body: { title: 'Test', ingredients: [] } } as Context['request'],
            });
            await recipeHandlers.createRecipe(ctx);
            expect(ctx.response.status).toBe(500);
        });
    });

    describe('updateRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { title: 'Updated', ingredients: [] } } as Context['request'],
                state: { user: undefined },
            });
            await recipeHandlers.updateRecipe(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { title: 'Updated', ingredients: [] } } as Context['request'],
            });
            await recipeHandlers.updateRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('updates recipe successfully', async () => {
            const updated = { ...baseRecipe, title: 'Updated' };
            mockRecipeService.updateRecipe.mockResolvedValue(updated);
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { title: 'Updated', ingredients: [] } } as Context['request'],
            });
            await recipeHandlers.updateRecipe(ctx);
            expect(ctx.response.status).toBe(200);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.updateRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 403 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { title: 'Updated', ingredients: [] } } as Context['request'],
            });
            await recipeHandlers.updateRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });
    });

    describe('deleteRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                state: { user: undefined },
            });
            await recipeHandlers.deleteRecipe(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.deleteRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('deletes recipe successfully', async () => {
            mockRecipeService.deleteRecipe.mockResolvedValue(undefined);
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.deleteRecipe(ctx);
            expect(ctx.response.status).toBe(204);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.deleteRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 403 }));
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.deleteRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });
    });

    describe('addUserToRecipe', () => {
        const newUser = { id: 'user-2', username: 'bob' };

        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { user: newUser } } as Context['request'],
                state: { user: undefined },
            });
            await recipeHandlers.addUserToRecipe(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 400 when user object invalid', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { user: null } } as Context['request'],
            });
            await recipeHandlers.addUserToRecipe(ctx);
            expect(ctx.response.status).toBe(400);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { user: newUser } } as Context['request'],
            });
            await recipeHandlers.addUserToRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('adds user successfully', async () => {
            const updated = { ...baseRecipe, users: [baseRecipe.users[0], newUser] };
            mockRecipeService.addUserToRecipe.mockResolvedValue(updated);
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { user: newUser } } as Context['request'],
            });
            await recipeHandlers.addUserToRecipe(ctx);
            expect(ctx.response.status).toBe(200);
        });

        it('returns error on service failure', async () => {
            mockRecipeService.addUserToRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 400 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { user: newUser } } as Context['request'],
            });
            await recipeHandlers.addUserToRecipe(ctx);
            expect(ctx.response.status).toBe(400);
        });
    });

    describe('removeUserFromRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
                state: { user: undefined },
            });
            await recipeHandlers.removeUserFromRecipe(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
            });
            await recipeHandlers.removeUserFromRecipe(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('removes user successfully', async () => {
            mockRecipeService.removeUserFromRecipe.mockResolvedValue(baseRecipe);
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
            });
            await recipeHandlers.removeUserFromRecipe(ctx);
            expect(ctx.response.status).toBe(200);
        });

        it('returns error on service failure', async () => {
            mockRecipeService.removeUserFromRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 400 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
            });
            await recipeHandlers.removeUserFromRecipe(ctx);
            expect(ctx.response.status).toBe(400);
        });
    });

    describe('setCoverImageKey', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { imageKey: 'some-key' } } as Context['request'],
                state: { user: undefined },
            });
            await recipeHandlers.setCoverImageKey(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 400 when imageKey missing', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { imageKey: '' } } as Context['request'],
            });
            await recipeHandlers.setCoverImageKey(ctx);
            expect(ctx.response.status).toBe(400);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { imageKey: 'some-key' } } as Context['request'],
            });
            await recipeHandlers.setCoverImageKey(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('sets cover image key successfully', async () => {
            mockRecipeService.setCoverImageKey.mockResolvedValue({ ...baseRecipe, coverImageKey: 'some-key' });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { imageKey: 'some-key' } } as Context['request'],
            });
            await recipeHandlers.setCoverImageKey(ctx);
            expect(ctx.response.status).toBe(200);
        });

        it('returns error on service failure', async () => {
            mockRecipeService.setCoverImageKey.mockRejectedValue(Object.assign(new Error('fail'), { status: 403 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: { imageKey: 'some-key' } } as Context['request'],
            });
            await recipeHandlers.setCoverImageKey(ctx);
            expect(ctx.response.status).toBe(403);
        });
    });

    describe('uploadRecipeImage', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                state: { user: undefined },
            });
            await recipeHandlers.uploadRecipeImage(ctx);
            expect(ctx.response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await recipeHandlers.uploadRecipeImage(ctx);
            expect(ctx.response.status).toBe(403);
        });

        it('returns 400 when no file provided', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: { body: {}, files: {} } as Context['request'],
            });
            await recipeHandlers.uploadRecipeImage(ctx);
            expect(ctx.response.status).toBe(400);
        });

        it('returns 400 when file is not an image', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: {
                    body: {},
                    files: { image: { filepath: '/tmp/file', mimetype: 'application/pdf' } },
                } as Context['request'],
            });
            await recipeHandlers.uploadRecipeImage(ctx);
            expect(ctx.response.status).toBe(400);
        });

        it('uploads image successfully', async () => {
            mockBucketStore.putObject.mockResolvedValue(undefined);
            mockRecipeService.setCoverImageKey.mockResolvedValue({
                ...baseRecipe,
                coverImageKey: 'recipe-uploads/user-1/recipe-1',
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: {
                    body: {},
                    files: { image: { filepath: '/tmp/img.jpg', mimetype: 'image/jpeg' } },
                } as Context['request'],
            });
            await recipeHandlers.uploadRecipeImage(ctx);
            expect(ctx.response.status).toBe(200);
        });

        it('returns error on bucket failure', async () => {
            mockBucketStore.putObject.mockRejectedValue(Object.assign(new Error('bucket fail'), { status: 500 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                request: {
                    body: {},
                    files: { image: { filepath: '/tmp/img.jpg', mimetype: 'image/jpeg' } },
                } as Context['request'],
            });
            await recipeHandlers.uploadRecipeImage(ctx);
            expect(ctx.response.status).toBe(500);
        });
    });
});
