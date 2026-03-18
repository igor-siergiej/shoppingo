import { beforeEach, describe, expect, it } from 'bun:test';
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Item, List } from '@shoppingo/types';

import { MongoListRepository } from './index';

class MockCollection {
    calls: Record<string, Array<Array<unknown>>> = {
        findOne: [],
        find: [],
        insertOne: [],
        deleteOne: [],
        replaceOne: [],
        updateOne: [],
        findOneAndReplace: [],
        findOneAndUpdate: [],
    };

    resolvedValues: Record<string, unknown> = {
        findOne: null,
        find: { toArray: async () => [] },
        insertOne: { insertedId: null },
        deleteOne: { deletedCount: 0 },
        replaceOne: { modifiedCount: 0 },
        updateOne: { modifiedCount: 0 },
        findOneAndReplace: { modifiedCount: 0 },
        findOneAndUpdate: { modifiedCount: 0 },
    };

    async findOne(query: unknown) {
        this.calls.findOne.push([query]);
        return this.resolvedValues.findOne;
    }

    find(query: unknown) {
        this.calls.find.push([query]);
        return this.resolvedValues.find;
    }

    async insertOne(doc: unknown) {
        this.calls.insertOne.push([doc]);
        return this.resolvedValues.insertOne;
    }

    async deleteOne(query: unknown) {
        this.calls.deleteOne.push([query]);
        return this.resolvedValues.deleteOne;
    }

    async replaceOne(query: unknown, replacement: unknown) {
        this.calls.replaceOne.push([query, replacement]);
        return this.resolvedValues.replaceOne;
    }

    async updateOne(query: unknown, update: unknown) {
        this.calls.updateOne.push([query, update]);
        return this.resolvedValues.updateOne;
    }

    async findOneAndReplace(query: unknown, replacement: unknown) {
        this.calls.findOneAndReplace.push([query, replacement]);
        return this.resolvedValues.findOneAndReplace;
    }

    async findOneAndUpdate(query: unknown, update: unknown) {
        this.calls.findOneAndUpdate.push([query, update]);
        return this.resolvedValues.findOneAndUpdate;
    }

    reset() {
        this.calls = {
            findOne: [],
            find: [],
            insertOne: [],
            deleteOne: [],
            replaceOne: [],
            updateOne: [],
            findOneAndReplace: [],
            findOneAndUpdate: [],
        };
        this.resolvedValues = {
            findOne: null,
            find: { toArray: async () => [] },
            insertOne: { insertedId: null },
            deleteOne: { deletedCount: 0 },
            replaceOne: { modifiedCount: 0 },
            updateOne: { modifiedCount: 0 },
            findOneAndReplace: { modifiedCount: 0 },
            findOneAndUpdate: { modifiedCount: 0 },
        };
    }
}

const mockCollection = new MockCollection();
const mockConnection = {
    getCollection: () => mockCollection,
} as unknown as MongoDbConnection<{ list: List }>;

describe('MongoListRepository', () => {
    let repository: MongoListRepository;

    beforeEach(() => {
        mockCollection.reset();
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
                    users: [{ id: 'user-1', username: 'testuser' }],
                };

                mockCollection.resolvedValues.findOne = mockList;

                const result = await repository.getByTitle('Test List');

                expect(mockCollection.calls.findOne[0]).toEqual([{ title: 'Test List' }]);
                expect(result).toEqual(mockList);
            });
        });

        describe('When no list with the given title exists', () => {
            it('should return null', async () => {
                mockCollection.resolvedValues.findOne = null;

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
                        users: [{ id: 'user-1', username: 'testuser' }],
                    },
                ];
                const mockCursor = {
                    toArray: async () => mockLists,
                };

                mockCollection.resolvedValues.find = mockCursor;

                const result = await repository.findByUserId('user-1');

                expect(mockCollection.calls.find[0]).toEqual([{ 'users.id': 'user-1' }]);
                expect(result).toEqual(mockLists);
            });
        });

        describe('When a user has no lists', () => {
            it('should return an empty array', async () => {
                const mockCursor = {
                    toArray: async () => [],
                };

                mockCollection.resolvedValues.find = mockCursor;

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
                    users: [{ id: 'user-1', username: 'testuser' }],
                };

                mockCollection.resolvedValues.insertOne = { insertedId: 'list-1' };

                await repository.insert(mockList);

                expect(mockCollection.calls.insertOne[0]).toEqual([mockList]);
            });
        });
    });

    describe('Deleting lists by title', () => {
        describe('When deleting a list by title', () => {
            it('should remove the list from the database', async () => {
                mockCollection.resolvedValues.deleteOne = { deletedCount: 1 };

                await repository.deleteByTitle('Test List');

                expect(mockCollection.calls.deleteOne[0]).toEqual([{ title: 'Test List' }]);
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
                    users: [{ id: 'user-1', username: 'testuser' }],
                };

                mockCollection.resolvedValues.findOneAndReplace = { modifiedCount: 1 };

                await repository.replaceByTitle('Test List', mockList);

                expect(mockCollection.calls.findOneAndReplace[0]).toEqual([{ title: 'Test List' }, mockList]);
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
                    isSelected: false,
                };

                mockCollection.resolvedValues.findOneAndUpdate = { modifiedCount: 1 };

                await repository.pushItem('Test List', mockItem);

                expect(mockCollection.calls.findOneAndUpdate[0]).toEqual([
                    { title: 'Test List' },
                    { $push: { items: mockItem } },
                ]);
            });
        });
    });
});
