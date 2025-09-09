import { Item, List, User } from '@shoppingo/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { IdGenerator } from '../IdGenerator';
import { ListRepository } from '../ListRepository';
import { ListService } from './index';
import { AuthClient } from './types';

class MockListRepository implements ListRepository {
    private lists: Array<List> = [];

    async getByTitle(title: string): Promise<List | null> {
        return this.lists.find(list => list.title === title) || null;
    }

    async findByUserId(userId: string): Promise<Array<List>> {
        return this.lists.filter(list =>
            list.users.some(user => user.id === userId)
        );
    }

    async insert(list: List): Promise<void> {
        this.lists.push(list);
    }

    async deleteByTitle(title: string): Promise<void> {
        this.lists = this.lists.filter(list => list.title !== title);
    }

    async replaceByTitle(title: string, list: List): Promise<void> {
        const index = this.lists.findIndex(l => l.title === title);

        if (index !== -1) {
            this.lists[index] = list;
        }
    }

    async pushItem(title: string, item: Item): Promise<void> {
        const list = this.lists.find(l => l.title === title);

        if (list) {
            list.items.push(item);
        }
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
        return usernames.map(username => ({
            id: `user-${username}`,
            username
        }));
    }
}

describe('ListService', () => {
    let listService: ListService;
    let mockRepository: MockListRepository;
    let mockIdGenerator: MockIdGenerator;
    let mockAuthClient: MockAuthClient;
    let mockUser: User;

    beforeEach(() => {
        mockRepository = new MockListRepository();
        mockIdGenerator = new MockIdGenerator();
        mockAuthClient = new MockAuthClient();
        mockUser = { id: 'user-1', username: 'testuser' };

        listService = new ListService(mockRepository, mockIdGenerator, mockAuthClient);
    });

    describe('Getting list items', () => {
        describe('When a list exists', () => {
            it('should return the items from that list', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        { id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.getListItems('Test List');

                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('Item 1');
            });
        });

        describe('When a list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.getListItems('Non-existent List'))
                    .rejects.toThrow('List not found');
            });
        });
    });

    describe('Getting lists for a user', () => {
        describe('When a user has lists', () => {
            it('should return all lists belonging to that user', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser]
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
                await expect(listService.getListsForUser(''))
                    .rejects.toThrow('userId is required');
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
            it('should create a list with all specified users', async () => {
                const title = 'New List';
                const dateAdded = new Date('2023-01-01');
                const selectedUsers = ['user2', 'user3'];

                const result = await listService.addList(title, dateAdded, mockUser, selectedUsers);

                expect(result.users).toHaveLength(3);
                expect(result.users[0].username).toBe('user2');
                expect(result.users[1].username).toBe('user3');
                expect(result.users[2]).toEqual(mockUser);
            });
        });

        describe('When auth service is not configured', () => {
            it('should throw an error when trying to add additional users', async () => {
                const serviceWithoutAuth = new ListService(mockRepository, mockIdGenerator);

                await expect(serviceWithoutAuth.addList(
                    'New List',
                    new Date('2023-01-01'),
                    mockUser,
                    ['user2']
                )).rejects.toThrow('Auth service not configured');
            });
        });

        describe('When no users are found for the provided usernames', () => {
            it('should throw an error indicating no users were found', async () => {
                const mockAuthClientEmpty = {
                    async getUsersByUsernames(): Promise<Array<User>> {
                        return [];
                    }
                };
                const serviceWithEmptyAuth = new ListService(mockRepository, mockIdGenerator, mockAuthClientEmpty);

                await expect(serviceWithEmptyAuth.addList(
                    'New List',
                    new Date('2023-01-01'),
                    mockUser,
                    ['user2']
                )).rejects.toThrow('Failed to fetch users from auth service');
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
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.addItem('Test List', 'New Item', new Date('2023-01-01'));

                expect(result.name).toBe('New Item');
                expect(result.id).toBe('id-1');
                expect(result.isSelected).toBe(false);
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
                        { id: 'item-1', name: 'Old Name', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.updateItemName('Test List', 'Old Name', 'New Name');

                expect(result.message).toBe('Item updated successfully');
                expect(result.newItemName).toBe('New Name');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.updateItemName('Non-existent', 'Old', 'New'))
                    .rejects.toThrow('List not found');
            });
        });

        describe('When the new name is empty', () => {
            it('should throw an error indicating the new title cannot be empty', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        { id: 'item-1', name: 'Old Name', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateItemName('Test List', 'Old Name', ''))
                    .rejects.toThrow('New title cannot be empty');
            });
        });

        describe('When the new name is the same as the current name', () => {
            it('should throw an error indicating the names must be different', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        { id: 'item-1', name: 'Old Name', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateItemName('Test List', 'Old Name', 'Old Name'))
                    .rejects.toThrow('New item name must be different from current name');
            });
        });

        describe('When an item with the new name already exists', () => {
            it('should throw an error indicating the name is already taken', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [
                        { id: 'item-1', name: 'Existing Item', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateItemName('Test List', 'Old Name', 'Existing Item'))
                    .rejects.toThrow('An item with that name already exists in this list');
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
                        { id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.setItemSelected('Test List', 'Item 1', true);

                expect(result.message).toBe('Updated Successfully');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.setItemSelected('Non-existent', 'Item', true))
                    .rejects.toThrow('List not found');
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
                        { id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: true },
                        { id: 'item-2', name: 'Item 2', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.clearSelectedItems('Test List');

                expect(result.items).toHaveLength(1);
                expect(result.items[0].name).toBe('Item 2');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.clearSelectedItems('Non-existent'))
                    .rejects.toThrow('List not found');
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
                        { id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false },
                        { id: 'item-2', name: 'Item 2', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.deleteItem('Test List', 'Item 1');

                expect(result.items).toHaveLength(1);
                expect(result.items[0].name).toBe('Item 2');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.deleteItem('Non-existent', 'Item'))
                    .rejects.toThrow('List not found');
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
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.updateListTitle('Old Title', 'New Title');

                expect(result.message).toBe('List updated successfully');
                expect(result.newTitle).toBe('New Title');
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.updateListTitle('Non-existent', 'New Title'))
                    .rejects.toThrow('List not found');
            });
        });

        describe('When the new title is empty', () => {
            it('should throw an error indicating the new title cannot be empty', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Old Title',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                await expect(listService.updateListTitle('Old Title', ''))
                    .rejects.toThrow('New title cannot be empty');
            });
        });

        describe('When a list with the new title already exists', () => {
            it('should throw an error indicating the title is already taken', async () => {
                const mockList1: List = {
                    id: 'list-1',
                    title: 'Existing Title',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser]
                };
                const mockList2: List = {
                    id: 'list-2',
                    title: 'Old Title',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList1);
                await mockRepository.insert(mockList2);

                await expect(listService.updateListTitle('Old Title', 'Existing Title'))
                    .rejects.toThrow('A list with that name already exists');
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
                    users: [mockUser]
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
                        { id: 'item-1', name: 'Item 1', dateAdded: new Date(), isSelected: false }
                    ],
                    users: [mockUser]
                };

                await mockRepository.insert(mockList);

                const result = await listService.clearList('Test List');

                expect(result.items).toHaveLength(0);
            });
        });

        describe('When the list does not exist', () => {
            it('should throw an error indicating the list was not found', async () => {
                await expect(listService.clearList('Non-existent'))
                    .rejects.toThrow('List not found');
            });
        });
    });
});
