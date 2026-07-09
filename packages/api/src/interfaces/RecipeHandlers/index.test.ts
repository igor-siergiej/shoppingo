import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { Recipe } from '@shoppingo/types';

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
    regenerateImage: vi.fn(),
    revertToAiImage: vi.fn(),
};

const mockRecipeImportService = {
    importFromUrl: vi.fn(),
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

type HonoVars = { Variables: { user: { id: string; username: string } | undefined } };

const createMockContext = (
    overrides: {
        params?: Record<string, string>;
        body?: unknown;
        files?: Record<string, { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> }>;
        user?: { id: string; username: string } | undefined;
    } = {}
) => {
    const vars: Record<string, unknown> = {
        user: 'user' in overrides ? overrides.user : { id: 'user-1', username: 'testuser' },
    };

    return {
        req: {
            param: (name: string) => overrides.params?.[name],
            json: vi.fn().mockResolvedValue(overrides.body ?? {}),
            header: (_name: string): undefined => undefined,
            parseBody: vi.fn().mockResolvedValue(overrides.files ?? {}),
        },
        json: vi.fn().mockImplementation(
            (body: unknown, status: number): Response =>
                new Response(JSON.stringify(body), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                })
        ),
        get: (key: string) => vars[key],
        set: (key: string, val: unknown) => {
            vars[key] = val;
        },
    } as unknown as import('hono').Context<HonoVars>;
};

describe('RecipeHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockImplementation((token: string) => {
            if (token === 'RecipeService') return mockRecipeService;
            if (token === 'RecipeImportService') return mockRecipeImportService;
            if (token === 'Logger') return mockLogger;
            if (token === 'ImageStore') return mockBucketStore;
            return null;
        });
        mockRecipeService.getRecipe.mockResolvedValue(baseRecipe);
    });

    describe('importRecipe', () => {
        const draft = {
            title: 'Imported',
            ingredients: [{ id: 'i1', name: '2 cups flour' }],
            instructions: ['Mix it.'],
            link: 'https://example.com/r',
        };

        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({ user: undefined, body: { url: 'https://example.com/r' } });
            const response = await recipeHandlers.importRecipe(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 400 when url is missing', async () => {
            const ctx = createMockContext({ body: {} });
            const response = await recipeHandlers.importRecipe(ctx);
            expect(response.status).toBe(400);
        });

        it('returns 400 when url is blank', async () => {
            const ctx = createMockContext({ body: { url: '   ' } });
            const response = await recipeHandlers.importRecipe(ctx);
            expect(response.status).toBe(400);
        });

        it('returns the draft on success', async () => {
            mockRecipeImportService.importFromUrl.mockResolvedValue(draft);
            const ctx = createMockContext({ body: { url: 'https://example.com/r' } });
            const response = await recipeHandlers.importRecipe(ctx);
            expect(response.status).toBe(200);
            expect(mockRecipeImportService.importFromUrl).toHaveBeenCalledWith('https://example.com/r');
            const body = (await response.json()) as typeof draft;
            expect(body.title).toBe('Imported');
        });

        it('throws an APIError when the import service fails', async () => {
            mockRecipeImportService.importFromUrl.mockRejectedValue(Object.assign(new Error('boom'), { status: 502 }));
            const ctx = createMockContext({ body: { url: 'https://example.com/r' } });
            await expect(recipeHandlers.importRecipe(ctx)).rejects.toMatchObject({ status: 502 });
        });
    });

    describe('getRecipes', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({ user: undefined });
            const response = await recipeHandlers.getRecipes(ctx);
            expect(response.status).toBe(401);
        });

        it('returns recipes successfully', async () => {
            mockRecipeService.getRecipesByUserId.mockResolvedValue([baseRecipe]);
            const ctx = createMockContext();
            const response = await recipeHandlers.getRecipes(ctx);
            expect(response.status).toBe(200);
            const body = (await response.json()) as Array<{ id: string }>;
            expect(body).toHaveLength(1);
            expect(body[0].id).toBe(baseRecipe.id);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.getRecipesByUserId.mockRejectedValue(
                Object.assign(new Error('DB error'), { status: 500 })
            );
            const ctx = createMockContext();
            await expect(recipeHandlers.getRecipes(ctx)).rejects.toThrow('DB error');
        });
    });

    describe('getRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' }, user: undefined });
            const response = await recipeHandlers.getRecipe(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.getRecipe(ctx);
            expect(response.status).toBe(403);
        });

        it('returns recipe successfully', async () => {
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.getRecipe(ctx);
            expect(response.status).toBe(200);
            const body = (await response.json()) as { id: string };
            expect(body.id).toBe(baseRecipe.id);
        });

        it('returns 403 when verifyRecipeAccess throws', async () => {
            mockRecipeService.getRecipe.mockRejectedValueOnce(new Error('not found'));
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.getRecipe(ctx);
            expect(response.status).toBe(403);
        });

        it('returns error status on service failure after access check', async () => {
            mockRecipeService.getRecipe
                .mockResolvedValueOnce(baseRecipe)
                .mockRejectedValueOnce(Object.assign(new Error('DB error'), { status: 500 }));
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await expect(recipeHandlers.getRecipe(ctx)).rejects.toThrow('DB error');
        });
    });

    describe('createRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                body: { title: 'Test', ingredients: [] },
                user: undefined,
            });
            const response = await recipeHandlers.createRecipe(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 400 when title missing', async () => {
            const ctx = createMockContext({
                body: { title: '', ingredients: [] },
            });
            const response = await recipeHandlers.createRecipe(ctx);
            expect(response.status).toBe(400);
        });

        it('returns 400 when ingredients missing', async () => {
            const ctx = createMockContext({
                body: { title: 'Test' },
            });
            const response = await recipeHandlers.createRecipe(ctx);
            expect(response.status).toBe(400);
        });

        it('creates recipe successfully', async () => {
            mockRecipeService.createRecipe.mockResolvedValue(baseRecipe);
            const ctx = createMockContext({
                body: { title: 'Test', ingredients: [] },
            });
            const response = await recipeHandlers.createRecipe(ctx);
            expect(response.status).toBe(201);
            const body = (await response.json()) as { id: string };
            expect(body.id).toBe(baseRecipe.id);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.createRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 500 }));
            const ctx = createMockContext({
                body: { title: 'Test', ingredients: [] },
            });
            await expect(recipeHandlers.createRecipe(ctx)).rejects.toThrow('fail');
        });
    });

    describe('updateRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { title: 'Updated', ingredients: [] },
                user: undefined,
            });
            const response = await recipeHandlers.updateRecipe(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { title: 'Updated', ingredients: [] },
            });
            const response = await recipeHandlers.updateRecipe(ctx);
            expect(response.status).toBe(403);
        });

        it('updates recipe successfully', async () => {
            const updated = { ...baseRecipe, title: 'Updated' };
            mockRecipeService.updateRecipe.mockResolvedValue(updated);
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { title: 'Updated', ingredients: [] },
            });
            const response = await recipeHandlers.updateRecipe(ctx);
            expect(response.status).toBe(200);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.updateRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 403 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { title: 'Updated', ingredients: [] },
            });
            await expect(recipeHandlers.updateRecipe(ctx)).rejects.toThrow('fail');
        });
    });

    describe('deleteRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                user: undefined,
            });
            const response = await recipeHandlers.deleteRecipe(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.deleteRecipe(ctx);
            expect(response.status).toBe(403);
        });

        it('deletes recipe successfully', async () => {
            mockRecipeService.deleteRecipe.mockResolvedValue(undefined);
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.deleteRecipe(ctx);
            expect(response.status).toBe(204);
        });

        it('returns error status on service failure', async () => {
            mockRecipeService.deleteRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 403 }));
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await expect(recipeHandlers.deleteRecipe(ctx)).rejects.toThrow('fail');
        });
    });

    describe('addUserToRecipe', () => {
        const newUser = { id: 'user-2', username: 'bob' };

        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { friendId: newUser.id },
                user: undefined,
            });
            const response = await recipeHandlers.addUserToRecipe(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 400 when friendId missing', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { friendId: '' },
            });
            const response = await recipeHandlers.addUserToRecipe(ctx);
            expect(response.status).toBe(400);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { friendId: newUser.id },
            });
            const response = await recipeHandlers.addUserToRecipe(ctx);
            expect(response.status).toBe(403);
        });

        it('adds user successfully', async () => {
            const updated = { ...baseRecipe, users: [baseRecipe.users[0], newUser] };
            mockRecipeService.addUserToRecipe.mockResolvedValue(updated);
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { friendId: newUser.id },
            });
            const response = await recipeHandlers.addUserToRecipe(ctx);
            expect(response.status).toBe(200);
        });

        it('returns error on service failure', async () => {
            mockRecipeService.addUserToRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 400 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { friendId: newUser.id },
            });
            await expect(recipeHandlers.addUserToRecipe(ctx)).rejects.toThrow('fail');
        });
    });

    describe('removeUserFromRecipe', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
                user: undefined,
            });
            const response = await recipeHandlers.removeUserFromRecipe(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
            });
            const response = await recipeHandlers.removeUserFromRecipe(ctx);
            expect(response.status).toBe(403);
        });

        it('removes user successfully', async () => {
            mockRecipeService.removeUserFromRecipe.mockResolvedValue(baseRecipe);
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
            });
            const response = await recipeHandlers.removeUserFromRecipe(ctx);
            expect(response.status).toBe(200);
        });

        it('returns error on service failure', async () => {
            mockRecipeService.removeUserFromRecipe.mockRejectedValue(Object.assign(new Error('fail'), { status: 400 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1', targetUserId: 'user-2' },
            });
            await expect(recipeHandlers.removeUserFromRecipe(ctx)).rejects.toThrow('fail');
        });
    });

    describe('setCoverImageKey', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { imageKey: 'some-key' },
                user: undefined,
            });
            const response = await recipeHandlers.setCoverImageKey(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 400 when imageKey missing', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { imageKey: '' },
            });
            const response = await recipeHandlers.setCoverImageKey(ctx);
            expect(response.status).toBe(400);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { imageKey: 'some-key' },
            });
            const response = await recipeHandlers.setCoverImageKey(ctx);
            expect(response.status).toBe(403);
        });

        it('sets cover image key successfully', async () => {
            mockRecipeService.setCoverImageKey.mockResolvedValue({ ...baseRecipe, coverImageKey: 'some-key' });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { imageKey: 'some-key' },
            });
            const response = await recipeHandlers.setCoverImageKey(ctx);
            expect(response.status).toBe(200);
        });

        it('returns error on service failure', async () => {
            mockRecipeService.setCoverImageKey.mockRejectedValue(Object.assign(new Error('fail'), { status: 403 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                body: { imageKey: 'some-key' },
            });
            await expect(recipeHandlers.setCoverImageKey(ctx)).rejects.toThrow('fail');
        });
    });

    describe('revertRecipeImage', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' }, user: undefined });
            const response = await recipeHandlers.revertRecipeImage(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.revertRecipeImage(ctx);
            expect(response.status).toBe(403);
        });

        it('reverts to ai image successfully', async () => {
            mockRecipeService.revertToAiImage.mockResolvedValue({
                ...baseRecipe,
                coverImageKey: 'recipe-image/recipe-1',
                aiImageKey: 'recipe-image/recipe-1',
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.revertRecipeImage(ctx);
            expect(response.status).toBe(200);
        });

        it('propagates service failure (e.g. no ai image)', async () => {
            mockRecipeService.revertToAiImage.mockRejectedValue(
                Object.assign(new Error('No AI image available to revert to'), { status: 400 })
            );
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            await expect(recipeHandlers.revertRecipeImage(ctx)).rejects.toThrow('No AI image available');
        });
    });

    describe('uploadRecipeImage', () => {
        it('returns 401 when no authenticated user', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                user: undefined,
            });
            const response = await recipeHandlers.uploadRecipeImage(ctx);
            expect(response.status).toBe(401);
        });

        it('returns 403 when user not in recipe', async () => {
            mockRecipeService.getRecipe.mockResolvedValue({
                ...baseRecipe,
                users: [{ id: 'other-user', username: 'other' }],
            });
            const ctx = createMockContext({ params: { recipeId: 'recipe-1' } });
            const response = await recipeHandlers.uploadRecipeImage(ctx);
            expect(response.status).toBe(403);
        });

        it('returns 400 when no file provided', async () => {
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                files: {},
            });
            const response = await recipeHandlers.uploadRecipeImage(ctx);
            expect(response.status).toBe(400);
        });

        it('returns 400 when file is not an image', async () => {
            const mockFile = new File([new Uint8Array([1, 2, 3])], 'test.pdf', { type: 'application/pdf' });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                files: {
                    image: mockFile as unknown as {
                        name: string;
                        type: string;
                        arrayBuffer: () => Promise<ArrayBuffer>;
                    },
                },
            });
            const response = await recipeHandlers.uploadRecipeImage(ctx);
            expect(response.status).toBe(400);
        });

        it('uploads image successfully', async () => {
            const mockFile = new File([new Uint8Array([1, 2, 3])], 'img.jpg', { type: 'image/jpeg' });
            mockBucketStore.putObject.mockResolvedValue(undefined);
            mockRecipeService.setCoverImageKey.mockResolvedValue({
                ...baseRecipe,
                coverImageKey: 'recipe-upload/user-1/recipe-1',
            });
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                files: {
                    image: mockFile as unknown as {
                        name: string;
                        type: string;
                        arrayBuffer: () => Promise<ArrayBuffer>;
                    },
                },
            });
            const response = await recipeHandlers.uploadRecipeImage(ctx);
            expect(response.status).toBe(200);
            const storedKey = mockBucketStore.putObject.mock.calls[0][0] as string;
            expect(storedKey.endsWith('.jpg')).toBe(true);
            expect(mockRecipeService.setCoverImageKey.mock.calls[0][1]).toBe(storedKey);
        });

        it('returns error on bucket failure', async () => {
            const mockFile = new File([new Uint8Array([1, 2, 3])], 'img.jpg', { type: 'image/jpeg' });
            mockBucketStore.putObject.mockRejectedValue(Object.assign(new Error('bucket fail'), { status: 500 }));
            const ctx = createMockContext({
                params: { recipeId: 'recipe-1' },
                files: {
                    image: mockFile as unknown as {
                        name: string;
                        type: string;
                        arrayBuffer: () => Promise<ArrayBuffer>;
                    },
                },
            });
            await expect(recipeHandlers.uploadRecipeImage(ctx)).rejects.toThrow('bucket fail');
        });
    });
});
