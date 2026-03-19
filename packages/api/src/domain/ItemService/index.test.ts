import { beforeEach, describe, expect, it } from 'bun:test';
import type { Item, List } from '@shoppingo/types';
import { ListType } from '@shoppingo/types';
import { ItemService } from './index';

class MockRepository {
    items: Map<string, List> = new Map();

    async getByTitle(title: string): Promise<List | null> {
        return this.items.get(title) || null;
    }

    async replaceByTitle(title: string, list: List): Promise<void> {
        this.items.set(title, list);
    }

    async pushItem(title: string, item: Item): Promise<void> {
        const list = await this.getByTitle(title);
        if (list) {
            list.items.push(item);
        }
    }

    reset() {
        this.items.clear();
    }
}

class MockIdGenerator {
    private counter = 0;

    generate(): string {
        return `id-${++this.counter}`;
    }

    reset() {
        this.counter = 0;
    }
}

class MockLogger {
    calls = {
        info: [] as any[],
        error: [] as any[],
    };

    info(...args: any[]) {
        this.calls.info.push(args);
    }

    error(...args: any[]) {
        this.calls.error.push(args);
    }

    reset() {
        this.calls = { info: [], error: [] };
    }
}

const mockRepository = new MockRepository();
const mockIdGenerator = new MockIdGenerator();
const mockLogger = new MockLogger();

describe('ItemService', () => {
    let itemService: ItemService;

    beforeEach(() => {
        mockRepository.reset();
        mockIdGenerator.reset();
        mockLogger.reset();
        itemService = new ItemService(mockRepository, mockIdGenerator, mockLogger);
    });

    describe('addItem', () => {
        it('should add item to shopping list successfully', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            const dateAdded = new Date();
            const result = await itemService.addItem('Groceries', 'Milk', dateAdded, 2, 'liters');

            expect(result.name).toBe('Milk');
            expect(result.quantity).toBe(2);
            expect(result.unit).toBe('liters');
            expect(result.isSelected).toBe(false);
        });

        it('should add item to TODO list without quantity', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Tasks',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.TODO,
            };
            await mockRepository.replaceByTitle('Tasks', list);

            const dateAdded = new Date();
            const dueDate = new Date();
            const result = await itemService.addItem('Tasks', 'Fix bug', dateAdded, undefined, undefined, dueDate);

            expect(result.name).toBe('Fix bug');
            expect(result.dueDate).toEqual(dueDate);
            expect(result.quantity).toBeUndefined();
        });

        it('should throw 404 when list not found', async () => {
            const dateAdded = new Date();

            try {
                await itemService.addItem('Nonexistent', 'Item', dateAdded);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });

        it('should throw 400 when adding quantity to TODO list', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Tasks',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.TODO,
            };
            await mockRepository.replaceByTitle('Tasks', list);

            try {
                await itemService.addItem('Tasks', 'Task', new Date(), 5);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('TODO lists cannot have quantity or unit');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 400 when adding due date to shopping list', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            try {
                await itemService.addItem('Groceries', 'Milk', new Date(), undefined, undefined, new Date());
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('Shopping lists cannot have due dates');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 409 when item with same name exists (case-insensitive)', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            try {
                await itemService.addItem('Groceries', 'MILK', new Date());
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('An item with that name already exists in this list');
                expect(error.status).toBe(409);
            }
        });
    });

    describe('deleteItem', () => {
        it('should delete item from list', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [
                    { id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false },
                    { id: 'item-2', name: 'Bread', dateAdded: new Date(), isSelected: false },
                ],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            const result = await itemService.deleteItem('Groceries', 'Milk');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].name).toBe('Bread');
        });

        it('should throw 404 when list not found', async () => {
            try {
                await itemService.deleteItem('Nonexistent', 'Item');
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });
    });

    describe('updateItemName', () => {
        it('should update item name successfully', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            const result = await itemService.updateItemName('Groceries', 'Milk', 'Yogurt');

            expect(result.newItemName).toBe('Yogurt');
            const updated = await mockRepository.getByTitle('Groceries');
            expect(updated?.items[0].name).toBe('Yogurt');
        });

        it('should throw 400 when new name is empty', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            try {
                await itemService.updateItemName('Groceries', 'Milk', '   ');
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('New title cannot be empty');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 400 when new name same as current name', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            try {
                await itemService.updateItemName('Groceries', 'Milk', 'Milk');
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('New item name must be different from current name');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 409 when new name already exists in list', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [
                    { id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false },
                    { id: 'item-2', name: 'Bread', dateAdded: new Date(), isSelected: false },
                ],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            try {
                await itemService.updateItemName('Groceries', 'Milk', 'Bread');
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('An item with that name already exists in this list');
                expect(error.status).toBe(409);
            }
        });

        it('should throw 404 when list not found', async () => {
            try {
                await itemService.updateItemName('Nonexistent', 'Milk', 'Yogurt');
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });
    });

    describe('updateItemQuantity', () => {
        it('should update quantity and unit', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            await itemService.updateItemQuantity('Groceries', 'Milk', 3, 'liters');

            const updated = await mockRepository.getByTitle('Groceries');
            expect(updated?.items[0].quantity).toBe(3);
            expect(updated?.items[0].unit).toBe('liters');
        });

        it('should update only quantity when unit not provided', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Eggs', dateAdded: new Date(), isSelected: false, quantity: 12 }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            await itemService.updateItemQuantity('Groceries', 'Eggs', 6);

            const updated = await mockRepository.getByTitle('Groceries');
            expect(updated?.items[0].quantity).toBe(6);
        });

        it('should throw 404 when list not found', async () => {
            try {
                await itemService.updateItemQuantity('Nonexistent', 'Item', 5);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });
    });

    describe('updateItemDueDate', () => {
        it('should update due date on TODO list', async () => {
            const dueDate = new Date('2025-12-31');
            const list: List = {
                id: 'list-1',
                title: 'Tasks',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Fix bug', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.TODO,
            };
            await mockRepository.replaceByTitle('Tasks', list);

            await itemService.updateItemDueDate('Tasks', 'Fix bug', dueDate);

            const updated = await mockRepository.getByTitle('Tasks');
            expect(updated?.items[0].dueDate).toEqual(dueDate);
        });

        it('should throw 400 on non-TODO list', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            try {
                await itemService.updateItemDueDate('Groceries', 'Milk', new Date());
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('Due dates only available for TODO lists');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 404 when list not found', async () => {
            try {
                await itemService.updateItemDueDate('Nonexistent', 'Item', new Date());
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });
    });

    describe('setItemSelected', () => {
        it('should set item as selected', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            await itemService.setItemSelected('Groceries', 'Milk', true);

            const updated = await mockRepository.getByTitle('Groceries');
            expect(updated?.items[0].isSelected).toBe(true);
        });

        it('should set item as not selected', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: true }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            await itemService.setItemSelected('Groceries', 'Milk', false);

            const updated = await mockRepository.getByTitle('Groceries');
            expect(updated?.items[0].isSelected).toBe(false);
        });

        it('should throw 404 when list not found', async () => {
            try {
                await itemService.setItemSelected('Nonexistent', 'Item', true);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });
    });

    describe('clearSelectedItems', () => {
        it('should clear all selected items', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [
                    { id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: true },
                    { id: 'item-2', name: 'Bread', dateAdded: new Date(), isSelected: false },
                    { id: 'item-3', name: 'Eggs', dateAdded: new Date(), isSelected: true },
                ],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            const result = await itemService.clearSelectedItems('Groceries');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].name).toBe('Bread');
        });

        it('should handle clearing when no items selected', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [{ id: 'item-1', name: 'Milk', dateAdded: new Date(), isSelected: false }],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            const result = await itemService.clearSelectedItems('Groceries');

            expect(result.items).toHaveLength(1);
        });

        it('should throw 404 when list not found', async () => {
            try {
                await itemService.clearSelectedItems('Nonexistent');
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });
    });

    describe('logging', () => {
        it('should log when item is added', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Groceries',
                dateAdded: new Date(),
                items: [],
                users: [{ id: 'user-1', username: 'john' }],
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Groceries', list);

            await itemService.addItem('Groceries', 'Milk', new Date());

            expect(mockLogger.calls.info.length).toBeGreaterThan(0);
        });

        it('should log errors', async () => {
            try {
                await itemService.addItem('Nonexistent', 'Item', new Date());
            } catch {
                // Expected
            }

            expect(mockLogger.calls.error.length).toBeGreaterThan(0);
        });
    });
});
