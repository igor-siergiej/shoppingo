import type { Item, List } from '@shoppingo/types';
import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as listHandlers from './index';

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn(),
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer,
}));

const mockListService = {
    getList: vi.fn(),
    getListItems: vi.fn(),
    getListsForUser: vi.fn(),
    addList: vi.fn(),
    updateItemName: vi.fn(),
    setItemSelected: vi.fn(),
    clearSelectedItems: vi.fn(),
    deleteItem: vi.fn(),
    updateListTitle: vi.fn(),
    deleteList: vi.fn(),
    clearList: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
};

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
};

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

describe('ListHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockImplementation((token: string) => {
            if (token === 'ListService') return mockListService;
            if (token === 'Logger') return mockLogger;
            return null;
        });

        // Default mock for getList (used by verifyListAccess)
        // Returns a list where the authenticated user has access
        mockListService.getList.mockResolvedValue({
            id: 'list-1',
            title: 'Test List',
            dateAdded: new Date(),
            items: [],
            users: [{ id: 'test-user-1', username: 'testuser' }],
            listType: 'shopping',
        });
    });

    describe('getList', () => {
        it('should return list items successfully', async () => {
            const mockItems: Array<Item> = [
                {
                    id: 'item-1',
                    name: 'Item 1',
                    dateAdded: new Date(),
                    isSelected: false,
                },
            ];
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.getList.mockResolvedValue({
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: mockItems,
                users: [{ id: 'test-user-1', username: 'testuser' }],
                listType: 'shopping',
            });

            await listHandlers.getList(ctx);

            expect(mockListService.getList).toHaveBeenCalledWith('Test List');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({
                listType: 'shopping',
                items: mockItems,
                ownerId: 'test-user-1',
                users: [{ id: 'test-user-1', username: 'testuser' }],
            });
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { title: 'Test List' } });

            // First call (in verifyListAccess) returns a valid list
            // Second call (in getList) throws an error
            mockListService.getList
                .mockResolvedValueOnce({
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [],
                    users: [{ id: 'test-user-1', username: 'testuser' }],
                    listType: 'shopping',
                })
                .mockRejectedValueOnce(Object.assign(new Error('List not found'), { status: 404 }));

            await listHandlers.getList(ctx);

            expect(ctx.response.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });

    describe('getLists', () => {
        it('should return user lists successfully', async () => {
            const mockLists: Array<List> = [
                {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [],
                    users: [{ id: 'test-user-1', username: 'testuser' }],
                    listType: 'shopping',
                },
            ];
            // userId must match authenticated user's id (test-user-1)
            const ctx = createMockContext({ params: { userId: 'test-user-1' } });

            mockListService.getListsForUser.mockResolvedValue(mockLists);

            await listHandlers.getLists(ctx);

            expect(mockListService.getListsForUser).toHaveBeenCalledWith('test-user-1');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockLists);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { userId: 'test-user-1' } });

            mockListService.getListsForUser.mockRejectedValue(new Error('userId is required'));

            await listHandlers.getLists(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'userId is required' });
        });

        it('should deny access if userId does not match authenticated user', async () => {
            const ctx = createMockContext({ params: { userId: 'different-user-id' } });

            await listHandlers.getLists(ctx);

            expect(ctx.response.status).toBe(403);
            expect(ctx.body).toEqual({ error: 'Forbidden' });
        });
    });

    describe('addList', () => {
        it('should add list successfully', async () => {
            const mockList: List = {
                id: 'list-1',
                title: 'New List',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'test-user-1', username: 'testuser' }],
                listType: 'shopping',
            };
            const ctx = createMockContext({
                response: { status: 201 } as any,
                request: {
                    body: {
                        title: 'New List',
                        dateAdded: new Date().toISOString(),
                        selectedUsers: [],
                        listType: 'shopping',
                    },
                } as any,
            });

            mockListService.addList.mockResolvedValue(mockList);

            await listHandlers.addList(ctx);

            // Should use authenticated user from ctx.state.user, not request body
            expect(mockListService.addList).toHaveBeenCalledWith(
                'New List',
                expect.any(String),
                { id: 'test-user-1', username: 'testuser' },
                [],
                'shopping'
            );
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockList);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                request: {
                    body: {
                        title: 'New List',
                        dateAdded: new Date().toISOString(),
                    },
                } as Context['request'],
            });

            mockListService.addList.mockRejectedValue(new Error('Auth service not configured'));

            await listHandlers.addList(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Auth service not configured' });
        });

        it('should reject empty title', async () => {
            const ctx = createMockContext({
                request: {
                    body: {
                        title: '',
                        dateAdded: new Date().toISOString(),
                    },
                } as Context['request'],
            });

            await listHandlers.addList(ctx);

            expect(ctx.response.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Title is required and must be a non-empty string' });
        });
    });

    describe('updateItem', () => {
        it('should update item successfully', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Old Name' },
                request: {
                    body: {
                        newItemName: 'New Name',
                    },
                } as Context['request'],
            });

            mockListService.updateItemName.mockResolvedValue({
                message: 'Item updated successfully',
                newItemName: 'New Name',
            });

            await listHandlers.updateItem(ctx);

            expect(mockListService.updateItemName).toHaveBeenCalledWith('Test List', 'Old Name', 'New Name');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({
                message: 'Item updated successfully',
                newItemName: 'New Name',
            });
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Old Name' },
                request: {
                    body: {
                        newItemName: 'New Name',
                    },
                } as Context['request'],
            });

            mockListService.updateItemName.mockRejectedValue(new Error('List not found'));

            await listHandlers.updateItem(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });

        it('should reject empty newItemName', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Old Name' },
                request: {
                    body: {
                        newItemName: '',
                    },
                } as Context['request'],
            });

            await listHandlers.updateItem(ctx);

            expect(ctx.response.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'New item name must be a non-empty string' });
        });
    });

    describe('deleteItem', () => {
        it('should delete item successfully', async () => {
            const mockList: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'testuser' }],
            };
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Item 1' },
            });

            mockListService.deleteItem.mockResolvedValue(mockList);

            await listHandlers.deleteItem(ctx);

            expect(mockListService.deleteItem).toHaveBeenCalledWith('Test List', 'Item 1');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockList);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Item 1' },
            });

            mockListService.deleteItem.mockRejectedValue(new Error('List not found'));

            await listHandlers.deleteItem(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });

    describe('clearList', () => {
        it('should clear list successfully', async () => {
            const mockList: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'testuser' }],
            };
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.clearList.mockResolvedValue(mockList);

            await listHandlers.clearList(ctx);

            expect(mockListService.clearList).toHaveBeenCalledWith('Test List');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockList);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.clearList.mockRejectedValue(new Error('List not found'));

            await listHandlers.clearList(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });

    describe('deleteSelected', () => {
        it('should delete selected items successfully', async () => {
            const mockList: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'testuser' }],
            };
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.clearSelectedItems.mockResolvedValue(mockList);

            await listHandlers.deleteSelected(ctx);

            expect(mockListService.clearSelectedItems).toHaveBeenCalledWith('Test List');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockList);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.clearSelectedItems.mockRejectedValue(new Error('List not found'));

            await listHandlers.deleteSelected(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });

    describe('updateList', () => {
        it('should update list successfully', async () => {
            const ctx = createMockContext({
                params: { title: 'Old Title' },
                request: {
                    body: {
                        newTitle: 'New Title',
                    },
                } as Context['request'],
            });

            mockListService.updateListTitle.mockResolvedValue({
                message: 'List updated successfully',
                newTitle: 'New Title',
            });

            await listHandlers.updateList(ctx);

            expect(mockListService.updateListTitle).toHaveBeenCalledWith('Old Title', 'New Title');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({
                message: 'List updated successfully',
                newTitle: 'New Title',
            });
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { title: 'Old Title' },
                request: {
                    body: {
                        newTitle: 'New Title',
                    },
                } as Context['request'],
            });

            mockListService.updateListTitle.mockRejectedValue(new Error('List not found'));

            await listHandlers.updateList(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });

        it('should reject empty newTitle', async () => {
            const ctx = createMockContext({
                params: { title: 'Old Title' },
                request: {
                    body: {
                        newTitle: '',
                    },
                } as Context['request'],
            });

            await listHandlers.updateList(ctx);

            expect(ctx.response.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'New title is required and must be a non-empty string' });
        });
    });

    describe('addItem', () => {
        it('should add item successfully', async () => {
            const mockItem: Item = {
                id: 'item-1',
                name: 'New Item',
                dateAdded: new Date(),
                isSelected: false,
            };
            const ctx = createMockContext({
                params: { title: 'Test List' },
                request: {
                    body: {
                        itemName: 'New Item',
                        dateAdded: new Date().toISOString(),
                    },
                } as Context['request'],
            });

            mockListService.addItem.mockResolvedValue(mockItem);

            await listHandlers.addItem(ctx);

            expect(mockListService.addItem).toHaveBeenCalledWith(
                'Test List',
                'New Item',
                expect.any(String),
                undefined,
                undefined,
                undefined
            );
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockItem);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List' },
                request: {
                    body: {
                        itemName: 'New Item',
                        dateAdded: new Date().toISOString(),
                    },
                } as Context['request'],
            });

            mockListService.addItem.mockRejectedValue(new Error('List not found'));

            await listHandlers.addItem(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });

        it('should reject empty itemName', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List' },
                request: {
                    body: {
                        itemName: '',
                        dateAdded: new Date().toISOString(),
                    },
                } as Context['request'],
            });

            await listHandlers.addItem(ctx);

            expect(ctx.response.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Item name is required and must be a non-empty string' });
        });
    });

    describe('deleteList', () => {
        it('should delete list successfully', async () => {
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.deleteList.mockResolvedValue({
                message: 'List deleted successfully',
            });

            await listHandlers.deleteList(ctx);

            expect(mockListService.deleteList).toHaveBeenCalledWith('Test List');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({
                message: 'List deleted successfully',
            });
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.deleteList.mockRejectedValue(new Error('List not found'));

            await listHandlers.deleteList(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });
});
