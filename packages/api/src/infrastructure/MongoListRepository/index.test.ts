import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Item, List } from '@shoppingo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MongoListRepository } from './index';

const mockCollection = {
    findOne: vi.fn(),
    find: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    replaceOne: vi.fn(),
    updateOne: vi.fn(),
    findOneAndReplace: vi.fn(),
    findOneAndUpdate: vi.fn()
};

const mockConnection = {
    getCollection: vi.fn().mockReturnValue(mockCollection)
} as unknown as MongoDbConnection<{ list: List }>;

describe('MongoListRepository', () => {
    let repository: MongoListRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new MongoListRepository(mockConnection);
    });

    describe('Finding lists by title', () => {
        describe('When a list with the given title exists', () => {
            it('should return the list', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [{ id: 'user-1', username: 'testuser' }]
                };

                mockCollection.findOne.mockResolvedValue(mockList);

                const result = await repository.getByTitle('Test List');

                expect(mockCollection.findOne).toHaveBeenCalledWith({ title: 'Test List' });
                expect(result).toEqual(mockList);
            });
        });

        describe('When no list with the given title exists', () => {
            it('should return null', async () => {
                mockCollection.findOne.mockResolvedValue(null);

                const result = await repository.getByTitle('Non-existent List');

                expect(result).toBeNull();
            });
        });
    });

    describe('Finding lists by user ID', () => {
        describe('When a user has lists', () => {
            it('should return all lists belonging to that user', async () => {
                const mockLists: Array<List> = [
                    {
                        id: 'list-1',
                        title: 'List 1',
                        dateAdded: new Date('2023-01-01'),
                        items: [],
                        users: [{ id: 'user-1', username: 'testuser' }]
                    }
                ];
                const mockCursor = {
                    toArray: vi.fn().mockResolvedValue(mockLists)
                };

                mockCollection.find.mockReturnValue(mockCursor);

                const result = await repository.findByUserId('user-1');

                expect(mockCollection.find).toHaveBeenCalledWith({
                    'users.id': 'user-1'
                });
                expect(result).toEqual(mockLists);
            });
        });

        describe('When a user has no lists', () => {
            it('should return an empty array', async () => {
                const mockCursor = {
                    toArray: vi.fn().mockResolvedValue([])
                };

                mockCollection.find.mockReturnValue(mockCursor);

                const result = await repository.findByUserId('non-existent-user');

                expect(result).toEqual([]);
            });
        });
    });

    describe('Inserting new lists', () => {
        describe('When inserting a new list', () => {
            it('should save the list to the database', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Test List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [{ id: 'user-1', username: 'testuser' }]
                };

                mockCollection.insertOne.mockResolvedValue({ insertedId: 'list-1' });

                await repository.insert(mockList);

                expect(mockCollection.insertOne).toHaveBeenCalledWith(mockList);
            });
        });
    });

    describe('Deleting lists by title', () => {
        describe('When deleting a list by title', () => {
            it('should remove the list from the database', async () => {
                mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

                await repository.deleteByTitle('Test List');

                expect(mockCollection.deleteOne).toHaveBeenCalledWith({ title: 'Test List' });
            });
        });
    });

    describe('Replacing lists by title', () => {
        describe('When replacing a list by title', () => {
            it('should update the list in the database', async () => {
                const mockList: List = {
                    id: 'list-1',
                    title: 'Updated List',
                    dateAdded: new Date('2023-01-01'),
                    items: [],
                    users: [{ id: 'user-1', username: 'testuser' }]
                };

                mockCollection.findOneAndReplace.mockResolvedValue({ modifiedCount: 1 });

                await repository.replaceByTitle('Test List', mockList);

                expect(mockCollection.findOneAndReplace).toHaveBeenCalledWith(
                    { title: 'Test List' },
                    mockList
                );
            });
        });
    });

    describe('Adding items to lists', () => {
        describe('When adding an item to a list', () => {
            it('should add the item to the list in the database', async () => {
                const mockItem: Item = {
                    id: 'item-1',
                    name: 'Test Item',
                    dateAdded: new Date('2023-01-01'),
                    isSelected: false
                };

                mockCollection.findOneAndUpdate.mockResolvedValue({ modifiedCount: 1 });

                await repository.pushItem('Test List', mockItem);

                expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
                    { title: 'Test List' },
                    { $push: { items: mockItem } }
                );
            });
        });
    });
});
