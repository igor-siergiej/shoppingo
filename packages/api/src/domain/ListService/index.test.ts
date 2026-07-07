import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';
import type { Item, List, User } from '@shoppingo/types';
import { ListType } from '@shoppingo/types';

import type { IdGenerator } from '../IdGenerator';
import type { ListRepository } from '../ListRepository';
import { ListService } from './index';
import type { AuthClient } from './types';

class MockListRepository implements ListRepository {
    private lists: Array<List> = [];

    async getByTitle(title: string): Promise<List | null> {
        return this.lists.find((list) => list.title === title) || null;
    }

    async getAll(): Promise<Array<List>> {
        return this.lists;
    }

    async findByUserId(userId: string): Promise<Array<List>> {
        return this.lists.filter((list) => list.users.some((user) => user.id === userId));
    }

    async insert(list: List): Promise<void> {
        this.lists.push(list);
    }

    async deleteByTitle(title: string): Promise<void> {
        this.lists = this.lists.filter((list) => list.title !== title);
    }

    async replaceByTitle(title: string, list: List): Promise<void> {
        const index = this.lists.findIndex((l) => l.title === title);

        if (index !== -1) {
            this.lists[index] = list;
        }
    }

    async pushItem(title: string, item: Item): Promise<void> {
        const list = this.lists.find((l) => l.title === title);

        if (list) {
            list.items.push(item);
        }
    }

    async pushItems(title: string, items: Item[]): Promise<void> {
        const list = this.lists.find((l) => l.title === title);

        if (list) {
            list.items.push(...items);
        }
    }

    async removeMemberFromAll(memberId: string, ownerId: string): Promise<void> {
        this.lists = this.lists.map((list) =>
            list.ownerId === ownerId ? { ...list, users: list.users.filter((u) => u.id !== memberId) } : list
        );
    }
}

class MockIdGenerator implements IdGenerator {
    private counter = 0;

    generate(): string {
        return `id-${++this.counter}`;
    }
}

class MockAuthClient implements AuthClient {
    async getUsersByUsernames(usernames: Array<string>): Promise<Array<User>> {
        return usernames.map((username) => ({
            id: `user-${username}`,
            username,
        }));
    }
}

class MockFriends {
    edges = new Set<string>(); // "a|b" sorted
    private key(a: string, b: string) {
        return [a, b].sort().join('|');
    }
    add(a: string, b: string) {
        this.edges.add(this.key(a, b));
    }
    async areFriends(a: string, b: string) {
        return this.edges.has(this.key(a, b));
    }
    async friendIdsOf(userId: string) {
        return [...this.edges]
            .map((e) => e.split('|'))
            .filter((p) => p.includes(userId))
            .map((p) => (p[0] === userId ? p[1] : p[0]));
    }
    async listFriends(userId: string) {
        return (await this.friendIdsOf(userId)).map((id) => ({ id, username: `user-${id}` }));
    }
}

describe('ListService', () => {
    let listService: ListService;
    let mockRepository: MockListRepository;
    let mockIdGenerator: MockIdGenerator;
    let mockAuthClient: MockAuthClient;
    let friends: MockFriends;
    let mockUser: User;

    beforeEach(() => {
        mockRepository = new MockListRepository();
        mockIdGenerator = new MockIdGenerator();
        mockAuthClient = new MockAuthClient();
        friends = new MockFriends();
        mockUser = { id: 'user-1', username: 'testuser' };

        listService = new ListService(
            mockRepository,
            mockIdGenerator,
            mockAuthClient,
            undefined,
            undefined,
            undefined,
            friends
        );
    });

    describe('Getting lists for a user', () => {
        describe('When a user has lists', () => {
            it('should return all lists belonging to that user', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.getListsForUser('user-1');

                expect(result).toHaveLength(1);
                expect(result[0].title).toBe('Test List');
                expect(result[0].users).toEqual([{ username: 'testuser' }]);
            });
        });

        describe('When no user ID is provided', () => {
            it('should throw an error indicating user ID is required', async () => {
                await expect(listService.getListsForUser('')).rejects.toThrow('userId is required');
            });
        });
    });

    describe('Creating a new list', () => {
        describe('When creating a list with only the owner', () => {
            it('should create a list with the owner as the only user', async () => {
                const title = 'New List';
                const dateAdded = new Date('2023-01-01');

                const result = await listService.addList(title, dateAdded, mockUser);

                expect(result.title).toBe('New List');
                expect(result.users).toEqual([mockUser]);
                expect(result.id).toBe('id-1');
            });
        });

        describe('When creating a list with additional users', () => {
            it("should create a list with the owner plus the owner's friends", async () => {
                const title = 'New List';
                const dateAdded = new Date('2023-01-01');
                friends.add(mockUser.id, 'friend-2');
                friends.add(mockUser.id, 'friend-3');

                const result = await listService.addList(title, dateAdded, mockUser);

                expect(result.users).toHaveLength(3);
                expect(result.users[0]).toEqual(mockUser);
                expect(result.users.map((u) => u.id).sort()).toEqual([mockUser.id, 'friend-2', 'friend-3'].sort());
            });

            it('should create a list with only the explicitly selected friend subset', async () => {
                const title = 'New List Subset';
                const dateAdded = new Date('2023-01-01');
                friends.add(mockUser.id, 'friend-2');
                friends.add(mockUser.id, 'friend-3');

                const result = await listService.addList(title, dateAdded, mockUser, ['friend-2']);

                expect(result.users.map((u) => u.id)).toEqual([mockUser.id, 'friend-2']);
            });

            it('should reject sharing with a non-friend id (403)', async () => {
                await expect(
                    listService.addList('New List Rejected', new Date('2023-01-01'), mockUser, ['not-a-friend'])
                ).rejects.toMatchObject({ status: 403 });
            });
        });

        describe('When a caller-provided id is given', () => {
            it('should use the caller-provided id as the new list id', async () => {
                const result = await listService.addList(
                    'Groceries',
                    new Date('2023-01-01'),
                    mockUser,
                    [],
                    undefined,
                    'client-list-uuid'
                );

                expect(result.id).toBe('client-list-uuid');
            });

            it('should be idempotent: existing list with same title and id is returned without re-insert', async () => {
                const existing: List = {
                    id: 'client-list-uuid',
                    title: 'Groceries',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                    listType: ListType.SHOPPING,
                    ownerId: mockUser.id,
                };
                await mockRepository.insert(existing);
                const insertSpy = vi.spyOn(mockRepository, 'insert');

                const result = await listService.addList(
                    'Groceries',
                    new Date('2023-01-02'),
                    mockUser,
                    [],
                    undefined,
                    'client-list-uuid'
                );

                expect(result).toBe(existing);
                expect(insertSpy).not.toHaveBeenCalled();
            });
        });

        describe('When no friend service is configured', () => {
            it('should silently seed the owner only, ignoring any selected friend ids', async () => {
                const serviceWithoutFriends = new ListService(mockRepository, mockIdGenerator, mockAuthClient);

                const result = await serviceWithoutFriends.addList('New List', new Date('2023-01-01'), mockUser, [
                    'friend-2',
                ]);

                expect(result.users).toEqual([mockUser]);
            });
        });
    });

    describe('Adding items to a list', () => {
        describe('When adding an item to an existing list', () => {
            it('should add the item with a generated ID', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.addItem('Test List', 'New Item', new Date('2023-01-01'));

                expect(result.name).toBe('New Item');
                expect(result.id).toBe('id-1');
                expect(result.isSelected).toBe(false);
            });
        });

        describe('When adding an item with quantity and unit', () => {
            it('should add the item with quantity and unit', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.addItem('Test List', 'New Item', new Date('2023-01-01'), 2, 'kg');

                expect(result.name).toBe('New Item');
                expect(result.id).toBe('id-1');
                expect(result.isSelected).toBe(false);
                expect(result.quantity).toBe(2);
                expect(result.unit).toBe('kg');
            });
        });

        describe('When adding an item without quantity and unit', () => {
            it('should add the item without quantity and unit fields', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.addItem('Test List', 'New Item', new Date('2023-01-01'));

                expect(result.name).toBe('New Item');
                expect(result.quantity).toBeUndefined();
                expect(result.unit).toBeUndefined();
            });
        });

        describe('When adding a duplicate item', () => {
            it('should throw an error indicating the item already exists', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Existing Item',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await expect(listService.addItem('Test List', 'Existing Item', new Date('2023-01-01'))).rejects.toThrow(
                    'An item with that name already exists in this list'
                );
            });
        });

        describe('When adding a duplicate item with different case', () => {
            it('should throw an error (case-insensitive check)', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Existing Item',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await expect(listService.addItem('Test List', 'existing item', new Date('2023-01-01'))).rejects.toThrow(
                    'An item with that name already exists in this list'
                );
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.addItem('Non-existent', 'Item', new Date('2023-01-01'))).rejects.toThrow(
                    'List not found'
                );
            });
        });
    });

    describe('Updating item names', () => {
        describe('When updating an item name to a valid new name', () => {
            it('should update the item name successfully', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Old Name',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.updateItemName('Test List', 'item-1', 'New Name');

                expect(result.message).toBe('Item updated successfully');
                expect(result.newItemName).toBe('New Name');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.updateItemName('Non-existent', 'item-1', 'New')).rejects.toThrow(
                    'List not found'
                );
            });
        });

        describe('When the new name is empty', () => {
            it('should throw an error indicating the new title cannot be empty', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Old Name',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateItemName('Test List', 'item-1', '')).rejects.toThrow(
                    'New title cannot be empty'
                );
            });
        });

        describe('When the new name is the same as the current name', () => {
            it('should throw an error indicating the names must be different', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Old Name',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateItemName('Test List', 'item-1', 'Old Name')).rejects.toThrow(
                    'New item name must be different from current name'
                );
            });
        });

        describe('When an item with the new name already exists', () => {
            it('should throw an error indicating the name is already taken', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Existing Item',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                        {
                            id: 'item-2',
                            name: 'Old Name',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateItemName('Test List', 'item-2', 'Existing Item')).rejects.toThrow(
                    'An item with that name already exists in this list'
                );
            });
        });
    });

    describe('Setting item selection status', () => {
        describe('When updating an item selection status', () => {
            it('should update the item selection successfully', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Item 1',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.setItemSelected('Test List', 'item-1', true);

                expect(result.message).toBe('Updated Successfully');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.setItemSelected('Non-existent', 'item-1', true)).rejects.toThrow(
                    'List not found'
                );
            });
        });

        describe('When the item does not exist', () => {
            it('should throw a 404 indicating the item was not found', async () => {
                await mockRepository.insert({
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [{ id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false }],
                    users: [mockUser],
                });

                await expect(listService.setItemSelected('Test List', 'missing-id', true)).rejects.toThrow(
                    'Item not found'
                );
            });
        });
    });

    describe('Updating item quantities', () => {
        describe('When updating an item with quantity and unit', () => {
            it('should update the quantity and unit successfully', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Item 1',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.updateItemQuantity('Test List', 'item-1', 3, 'ml');

                expect(result.message).toBe('Quantity updated successfully');

                const updatedList = await mockRepository.getByTitle('Test List');
                expect(updatedList?.items[0].quantity).toBe(3);
                expect(updatedList?.items[0].unit).toBe('ml');
            });
        });

        describe('When updating only quantity', () => {
            it('should update only the quantity', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Item 1',
                            dateAdded: new Date(),
                            isSelected: false,
                            quantity: 5,
                            unit: 'kg',
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await listService.updateItemQuantity('Test List', 'item-1', 10, undefined);

                const updatedList = await mockRepository.getByTitle('Test List');
                expect(updatedList?.items[0].quantity).toBe(10);
                expect(updatedList?.items[0].unit).toBe('kg');
            });
        });

        describe('When updating only unit', () => {
            it('should update only the unit', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Item 1',
                            dateAdded: new Date(),
                            isSelected: false,
                            quantity: 5,
                            unit: 'kg',
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await listService.updateItemQuantity('Test List', 'item-1', undefined, 'L');

                const updatedList = await mockRepository.getByTitle('Test List');
                expect(updatedList?.items[0].quantity).toBe(5);
                expect(updatedList?.items[0].unit).toBe('L');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.updateItemQuantity('Non-existent', 'item-1', 1, 'pcs')).rejects.toThrow(
                    'List not found'
                );
            });
        });

        describe('When the item does not exist', () => {
            it('should throw a 404 indicating the item was not found', async () => {
                await mockRepository.insert({
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [{ id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false }],
                    users: [mockUser],
                });

                await expect(listService.updateItemQuantity('Test List', 'missing-id', 1, 'pcs')).rejects.toThrow(
                    'Item not found'
                );
            });
        });
    });

    describe('Clearing selected items', () => {
        describe('When clearing selected items from a list', () => {
            it('should remove all selected items and return the updated list', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Item 1',
                            dateAdded: new Date(),
                            isSelected: true,
                        },
                        {
                            id: 'item-2',
                            name: 'Item 2',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.clearSelectedItems('Test List');

                expect(result.items).toHaveLength(1);
                expect(result.items[0].name).toBe('Item 2');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.clearSelectedItems('Non-existent')).rejects.toThrow('List not found');
            });
        });
    });

    describe('Deleting items from a list', () => {
        describe('When deleting an item from a list', () => {
            it('should remove the item and return the updated list', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Item 1',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                        {
                            id: 'item-2',
                            name: 'Item 2',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.deleteItem('Test List', 'item-1');

                expect(result.items).toHaveLength(1);
                expect(result.items[0].name).toBe('Item 2');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.deleteItem('Non-existent', 'item-1')).rejects.toThrow('List not found');
            });
        });

        describe('When the item does not exist', () => {
            it('should throw a 404 indicating the item was not found', async () => {
                await mockRepository.insert({
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date(),
                    items: [{ id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false }],
                    users: [mockUser],
                });

                await expect(listService.deleteItem('Test List', 'missing-id')).rejects.toThrow('Item not found');
            });
        });
    });

    describe('Updating list titles', () => {
        describe('When updating a list title to a valid new title', () => {
            it('should update the list title successfully', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Old Title',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.updateListTitle('Old Title', 'New Title');

                expect(result.message).toBe('List updated successfully');
                expect(result.newTitle).toBe('New Title');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.updateListTitle('Non-existent', 'New Title')).rejects.toThrow(
                    'List not found'
                );
            });
        });

        describe('When the new title is empty', () => {
            it('should throw an error indicating the new title cannot be empty', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Old Title',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateListTitle('Old Title', '')).rejects.toThrow('New title cannot be empty');
            });
        });

        describe('When a list with the new title already exists', () => {
            it('should throw an error indicating the title is already taken', async () => {
                const mockList1: List = {
                    id: 'list-1',
                    title: 'Existing Title',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };
                const mockList2: List = {
                    id: 'list-2',
                    title: 'Old Title',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList1);
                await mockRepository.insert(mockList2);

                await expect(listService.updateListTitle('Old Title', 'Existing Title')).rejects.toThrow(
                    'A list with that name already exists'
                );
            });
        });
    });

    describe('Deleting lists', () => {
        describe('When deleting a list', () => {
            it('should delete the list successfully', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.deleteList('Test List');

                expect(result.message).toBe('List deleted successfully');
            });
        });
    });

    describe('Clearing all items from a list', () => {
        describe('When clearing all items from a list', () => {
            it('should remove all items and return the updated list', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Item 1',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.clearList('Test List');

                expect(result.items).toHaveLength(0);
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.clearList('Non-existent')).rejects.toThrow('List not found');
            });
        });
    });

    describe('Adding a user to a list', () => {
        describe('When the list does not exist', () => {
            it('should throw a 404 error', async () => {
                await expect(listService.addUserToList('Non-existent', 'friend-2', mockUser.id)).rejects.toMatchObject({
                    message: 'List not found',
                    status: 404,
                });
            });
        });

        describe('When the requesting user is not the owner', () => {
            it('should throw a 403 error', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(listService.addUserToList('Test List', 'friend-2', 'non-owner-id')).rejects.toMatchObject({
                    message: 'Only the list owner can manage users',
                    status: 403,
                });
            });
        });

        describe('When no friend service is configured', () => {
            it('should throw a 403 error', async () => {
                const serviceWithoutFriends = new ListService(mockRepository, mockIdGenerator, mockAuthClient);
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(
                    serviceWithoutFriends.addUserToList('Test List', 'friend-2', mockUser.id)
                ).rejects.toMatchObject({ message: 'Can only share with friends', status: 403 });
            });
        });

        describe('When the target id is not a friend', () => {
            it('should throw a 403 error', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(listService.addUserToList('Test List', 'not-a-friend', mockUser.id)).rejects.toMatchObject(
                    { message: 'Can only share with friends', status: 403 }
                );
            });
        });

        describe('When the user is already in the list', () => {
            it('should throw a 400 error', async () => {
                const existingUser: User = { id: 'friend-alice', username: 'user-friend-alice' };
                friends.add(mockUser.id, existingUser.id);
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser, existingUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(
                    listService.addUserToList('Test List', existingUser.id, mockUser.id)
                ).rejects.toMatchObject({
                    message: 'User is already in this list',
                    status: 400,
                });
            });
        });

        describe('When everything is valid', () => {
            it('should add the friend and return the updated list', async () => {
                friends.add(mockUser.id, 'friend-2');
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                const result = await listService.addUserToList('Test List', 'friend-2', mockUser.id);

                expect(result.users).toHaveLength(2);
                expect(result.users[1].id).toBe('friend-2');
            });

            it('rejects a non-friend by id (403) after allowing a friend', async () => {
                friends.add(mockUser.id, 'friend-2');
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await listService.addUserToList('Test List', 'friend-2', mockUser.id);
                const list = await listService.getList('Test List');
                expect(list.users.some((u) => u.id === 'friend-2')).toBe(true);

                await expect(listService.addUserToList('Test List', 'friend-9', mockUser.id)).rejects.toMatchObject({
                    status: 403,
                });
            });
        });
    });

    describe('Removing a user from a list', () => {
        describe('When the list does not exist', () => {
            it('should throw a 404 error', async () => {
                await expect(
                    listService.removeUserFromList('Non-existent', 'user-2', mockUser.id)
                ).rejects.toMatchObject({ message: 'List not found', status: 404 });
            });
        });

        describe('When the requesting user is not the owner', () => {
            it('should throw a 403 error', async () => {
                const otherUser: User = { id: 'user-2', username: 'user2' };
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser, otherUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(
                    listService.removeUserFromList('Test List', mockUser.id, otherUser.id)
                ).rejects.toMatchObject({ message: 'Only the list owner can manage users', status: 403 });
            });
        });

        describe('When trying to remove the owner', () => {
            it('should throw a 400 error', async () => {
                const otherUser: User = { id: 'user-2', username: 'user2' };
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser, otherUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(
                    listService.removeUserFromList('Test List', mockUser.id, mockUser.id)
                ).rejects.toMatchObject({ message: 'Cannot remove the list owner', status: 400 });
            });
        });

        describe('When the list has only one user', () => {
            it('should throw a 400 error', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(listService.removeUserFromList('Test List', 'someone', mockUser.id)).rejects.toMatchObject(
                    { message: 'Cannot remove the last user from the list', status: 400 }
                );
            });
        });

        describe('When the user to remove is not in the list', () => {
            it('should throw a 400 error', async () => {
                const otherUser: User = { id: 'user-2', username: 'user2' };
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser, otherUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                await expect(
                    listService.removeUserFromList('Test List', 'user-not-in-list', mockUser.id)
                ).rejects.toMatchObject({ message: 'User is not in this list', status: 400 });
            });
        });

        describe('When everything is valid', () => {
            it('should remove the user and return the updated list', async () => {
                const otherUser: User = { id: 'user-2', username: 'user2' };
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser, otherUser],
                    ownerId: mockUser.id,
                };

                await mockRepository.insert(mockList);

                const result = await listService.removeUserFromList('Test List', otherUser.id, mockUser.id);

                expect(result.users).toHaveLength(1);
                expect(result.users[0].id).toBe(mockUser.id);
            });
        });
    });

    describe('Adding items in bulk', () => {
        describe('When list does not exist', () => {
            it('should throw a 404 error', async () => {
                await expect(
                    listService.addItems(
                        'Nonexistent List',
                        [
                            { itemName: 'Item 1', dateAdded: new Date() },
                            { itemName: 'Item 2', dateAdded: new Date() },
                        ],
                        'user-1'
                    )
                ).rejects.toMatchObject({ message: 'List not found', status: 404 });
            });
        });

        describe('When items array is empty', () => {
            it('should still process without error', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.addItems('Test List', [], 'user-1');

                expect(result.added).toBe(0);
                expect(result.skipped).toBe(0);
            });
        });

        describe('When adding items with duplicates', () => {
            it('should skip duplicates and return correct counts', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        {
                            id: 'item-1',
                            name: 'Existing Item',
                            dateAdded: new Date(),
                            isSelected: false,
                        },
                    ],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.addItems(
                    'Test List',
                    [
                        { itemName: 'New Item 1', quantity: 5, unit: 'kg', dateAdded: new Date() },
                        { itemName: 'Existing Item', dateAdded: new Date() }, // Duplicate (case-insensitive)
                        { itemName: 'New Item 2', dateAdded: new Date() },
                    ],
                    'user-1'
                );

                expect(result.added).toBe(2);
                expect(result.skipped).toBe(1);

                const updatedList = await mockRepository.getByTitle('Test List');
                expect(updatedList?.items).toHaveLength(3);
            });
        });

        describe('When adding items with correct quantity and unit', () => {
            it('should preserve quantity and unit fields', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser],
                };

                await mockRepository.insert(mockList);

                const result = await listService.addItems(
                    'Test List',
                    [
                        { itemName: 'Milk', quantity: 2, unit: 'liters', dateAdded: new Date() },
                        { itemName: 'Bread', dateAdded: new Date() },
                    ],
                    'user-1'
                );

                expect(result.added).toBe(2);
                expect(result.skipped).toBe(0);

                const updatedList = await mockRepository.getByTitle('Test List');
                const milkItem = updatedList?.items.find((i) => i.name === 'Milk');
                expect(milkItem?.quantity).toBe(2);
                expect(milkItem?.unit).toBe('liters');

                const breadItem = updatedList?.items.find((i) => i.name === 'Bread');
                expect(breadItem?.quantity).toBeUndefined();
                expect(breadItem?.unit).toBeUndefined();
            });
        });
    });
});

describe('Item id-addressing', () => {
    let service: ListService;
    let repo: {
        getByTitle: ReturnType<typeof vi.fn>;
        replaceByTitle: ReturnType<typeof vi.fn>;
        pushItem: ReturnType<typeof vi.fn>;
    };

    const makeList = (overrides: Partial<List> = {}): List => ({
        id: 'list-1',
        title: 'Test List',
        dateAdded: new Date(),
        items: [],
        users: [{ id: 'user-1', username: 'testuser' }],
        ...overrides,
    });

    beforeEach(() => {
        repo = {
            getByTitle: vi.fn(),
            replaceByTitle: vi.fn().mockResolvedValue(undefined),
            pushItem: vi.fn().mockResolvedValue(undefined),
        };
        service = new ListService(repo as never, { generate: () => 'generated-id' } as never);
    });

    it('setItemSelected matches by item id, not name', async () => {
        const list = makeList({
            items: [
                { id: 'a1', name: 'Milk', isSelected: false, dateAdded: new Date() },
                { id: 'a2', name: 'Milk', isSelected: false, dateAdded: new Date() },
            ],
        });
        repo.getByTitle.mockResolvedValue(list);
        await service.setItemSelected('Test List', 'a2', true);
        const saved = repo.replaceByTitle.mock.calls[0][1] as List;
        expect(saved.items.find((i: Item) => i.id === 'a2')?.isSelected).toBe(true);
        expect(saved.items.find((i: Item) => i.id === 'a1')?.isSelected).toBe(false);
    });

    it('deleteItem removes by id', async () => {
        const list = makeList({
            items: [
                { id: 'a1', name: 'Milk', isSelected: false, dateAdded: new Date() },
                { id: 'a2', name: 'Bread', isSelected: false, dateAdded: new Date() },
            ],
        });
        repo.getByTitle.mockResolvedValue(list);
        await service.deleteItem('Test List', 'a1');
        const saved = repo.replaceByTitle.mock.calls[0][1] as List;
        expect(saved.items.map((i: Item) => i.id)).toEqual(['a2']);
    });

    it('addItem uses caller-provided id when given', async () => {
        repo.getByTitle.mockResolvedValue(makeList({ items: [] }));
        const item = await service.addItem(
            'Test List',
            'Eggs',
            new Date(),
            undefined,
            undefined,
            undefined,
            'client-uuid'
        );
        expect(item.id).toBe('client-uuid');
    });

    it('addItem with an already-present id returns the existing item (idempotent replay)', async () => {
        const existing: Item = { id: 'dup', name: 'Eggs', isSelected: false, dateAdded: new Date() };
        repo.getByTitle.mockResolvedValue(makeList({ items: [existing] }));
        const item = await service.addItem('Test List', 'Eggs', new Date(), undefined, undefined, undefined, 'dup');
        expect(item.id).toBe('dup');
        expect(repo.pushItem).not.toHaveBeenCalled();
    });
});

describe('ListService notifications', () => {
    it('notifies members when an item is added', async () => {
        const list = {
            id: 'l1',
            title: 'Groceries',
            dateAdded: new Date(),
            items: [],
            users: [
                { id: 'u1', username: 'owner' },
                { id: 'u2', username: 'member' },
            ],
            listType: ListType.SHOPPING,
            ownerId: 'u1',
        };
        const repo = {
            getByTitle: async () => list,
            pushItem: async () => {},
        } as never;
        const idGenerator = { generate: () => 'i1' } as never;
        const notify = { notifyItemAdded: mock(async () => {}), notifyItemsAdded: mock(async () => {}) };

        const service = new ListService(repo, idGenerator, undefined, undefined, undefined, notify as never);
        await service.addItem('Groceries', 'Milk', new Date(), undefined, undefined, {
            id: 'u1',
            username: 'owner',
        });

        // fan-out is fire-and-forget — allow the microtask queue to drain
        await Promise.resolve();
        expect(notify.notifyItemAdded).toHaveBeenCalledTimes(1);
    });
});
