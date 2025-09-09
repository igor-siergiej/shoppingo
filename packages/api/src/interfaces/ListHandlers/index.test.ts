import { Item, List } from '@shoppingo/types';
import { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as listHandlers from './index';

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn()
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer
}));

const mockListService = {
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
    addItem: vi.fn()
};

const createMockContext = (overrides: Partial<Context> = {}): Context => {
    const ctx = {
        params: {},
        request: { body: {} } as Context['request'],
        response: { status: 200 } as Context['response'],
        state: {},
        set: vi.fn(),
        status: 200,
        body: {},
        ...overrides
    } as Context;

    Object.defineProperty(ctx, 'status', {
        get: () => ctx.response.status,
        set: (value) => { ctx.response.status = value; },
        configurable: true,
        enumerable: true
    });

    Object.defineProperty(ctx, 'body', {
        get: () => ctx.response.body,
        set: (value) => { ctx.response.body = value; },
        configurable: true,
        enumerable: true
    });

    return ctx;
};

describe('ListHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockReturnValue(mockListService);
    });

    describe('getList', () => {
        it('should return list items successfully', async () => {
            const mockItems: Array<Item> = [
                { id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false }
            ];
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.getListItems.mockResolvedValue(mockItems);

            await listHandlers.getList(ctx);

            expect(mockListService.getListItems).toHaveBeenCalledWith('Test List');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockItems);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { title: 'Non-existent' } });

            mockListService.getListItems.mockRejectedValue(new Error('List not found'));

            await listHandlers.getList(ctx);

            expect(ctx.response.status).toBe(500);
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
                    users: [{ id: 'user-1', username: 'testuser' }]
                }
            ];
            const ctx = createMockContext({ params: { userId: 'user-1' } });

            mockListService.getListsForUser.mockResolvedValue(mockLists);

            await listHandlers.getLists(ctx);

            expect(mockListService.getListsForUser).toHaveBeenCalledWith('user-1');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockLists);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { userId: '' } });

            mockListService.getListsForUser.mockRejectedValue(new Error('userId is required'));

            await listHandlers.getLists(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'userId is required' });
        });
    });

    describe('addList', () => {
        it('should add list successfully', async () => {
            const mockList: List = {
                id: 'list-1',
                title: 'New List',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'testuser' }]
            };
            const ctx = createMockContext({
                response: { status: 201 } as any,
                request: {
                    body: {
                        title: 'New List',
                        dateAdded: new Date().toISOString(),
                        user: { id: 'user-1', username: 'testuser' },
                        selectedUsers: []
                    },
                } as any,
            });

            mockListService.addList.mockResolvedValue(mockList);

            await listHandlers.addList(ctx);

            expect(mockListService.addList).toHaveBeenCalledWith(
                'New List',
                expect.any(String),
                { id: 'user-1', username: 'testuser' },
                []
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
                        user: { id: 'user-1', username: 'testuser' }
                    }
                } as Context['request']
            });

            mockListService.addList.mockRejectedValue(new Error('Auth service not configured'));

            await listHandlers.addList(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Auth service not configured' });
        });
    });

    describe('updateItem', () => {
        it('should update item successfully', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Old Name' },
                request: {
                    body: {
                        newItemName: 'New Name'
                    }
                } as Context['request']
            });

            mockListService.updateItemName.mockResolvedValue({
                message: 'Item updated successfully',
                newItemName: 'New Name'
            });

            await listHandlers.updateItem(ctx);

            expect(mockListService.updateItemName).toHaveBeenCalledWith(
                'Test List',
                'Old Name',
                'New Name'
            );
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({
                message: 'Item updated successfully',
                newItemName: 'New Name'
            });
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Old Name' },
                request: {
                    body: {
                        newItemName: 'New Name'
                    }
                } as Context['request']
            });

            mockListService.updateItemName.mockRejectedValue(new Error('List not found'));

            await listHandlers.updateItem(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });

    describe('deleteItem', () => {
        it('should delete item successfully', async () => {
            const mockList: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'testuser' }]
            };
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Item 1' }
            });

            mockListService.deleteItem.mockResolvedValue(mockList);

            await listHandlers.deleteItem(ctx);

            expect(mockListService.deleteItem).toHaveBeenCalledWith('Test List', 'Item 1');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockList);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { title: 'Test List', itemName: 'Item 1' }
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
                users: [{ id: 'user-1', username: 'testuser' }]
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
                users: [{ id: 'user-1', username: 'testuser' }]
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
                        newTitle: 'New Title'
                    }
                } as Context['request']
            });

            mockListService.updateListTitle.mockResolvedValue({
                message: 'List updated successfully',
                newTitle: 'New Title'
            });

            await listHandlers.updateList(ctx);

            expect(mockListService.updateListTitle).toHaveBeenCalledWith('Old Title', 'New Title');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({
                message: 'List updated successfully',
                newTitle: 'New Title'
            });
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { title: 'Old Title' },
                request: {
                    body: {
                        newTitle: 'New Title'
                    }
                } as Context['request']
            });

            mockListService.updateListTitle.mockRejectedValue(new Error('List not found'));

            await listHandlers.updateList(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });

    describe('addItem', () => {
        it('should add item successfully', async () => {
            const mockItem: Item = {
                id: 'item-1',
                name: 'New Item',
                dateAdded: new Date(),
                isSelected: false
            };
            const ctx = createMockContext({
                params: { title: 'Test List' },
                request: {
                    body: {
                        itemName: 'New Item',
                        dateAdded: new Date().toISOString()
                    }
                } as Context['request']
            });

            mockListService.addItem.mockResolvedValue(mockItem);

            await listHandlers.addItem(ctx);

            expect(mockListService.addItem).toHaveBeenCalledWith(
                'Test List',
                'New Item',
                expect.any(String)
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
                        dateAdded: new Date().toISOString()
                    }
                } as Context['request']
            });

            mockListService.addItem.mockRejectedValue(new Error('List not found'));

            await listHandlers.addItem(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'List not found' });
        });
    });

    describe('deleteList', () => {
        it('should delete list successfully', async () => {
            const ctx = createMockContext({ params: { title: 'Test List' } });

            mockListService.deleteList.mockResolvedValue({
                message: 'List deleted successfully'
            });

            await listHandlers.deleteList(ctx);

            expect(mockListService.deleteList).toHaveBeenCalledWith('Test List');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({
                message: 'List deleted successfully'
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
