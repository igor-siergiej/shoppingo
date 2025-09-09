import { Item, List, User } from '@shoppingo/types';

import { IdGenerator } from '../IdGenerator';
import { ListRepository } from '../ListRepository';
import { AuthClient } from './types';

export class ListService {
    constructor(
        private readonly repo: ListRepository,
        private readonly idGenerator: IdGenerator,
        private readonly auth?: AuthClient
    ) {}

    async getListItems(title: string): Promise<Array<Item>> {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        return list.items;
    }

    async getListsForUser(userId: string) {
        if (!userId) {
            throw Object.assign(new Error('userId is required'), { status: 400 });
        }

        const lists = await this.repo.findByUserId(userId);

        return lists.map(list => ({
            id: list.id,
            title: list.title,
            dateAdded: list.dateAdded,
            items: list.items,
            users: list.users.map(user => ({ username: user.username }))
        }));
    }

    async addList(title: string, dateAdded: Date, owner: User, selectedUsernames?: Array<string>) {
        let users: Array<User> = [owner];

        if (selectedUsernames && selectedUsernames.length > 0) {
            if (!this.auth) {
                throw Object.assign(new Error('Auth service not configured'), { status: 502 });
            }

            try {
                const fetched = await this.auth.getUsersByUsernames(selectedUsernames);

                if (!fetched || fetched.length === 0) {
                    throw Object.assign(new Error('No users found for the provided usernames'), { status: 400 });
                }

                users = [...fetched, owner];
            } catch {
                throw Object.assign(new Error('Failed to fetch users from auth service'), { status: 502 });
            }
        }

        const list: List = {
            id: this.idGenerator.generate(),
            title,
            dateAdded,
            items: [],
            users
        };

        await this.repo.insert(list);

        return list;
    }

    async addItem(title: string, itemName: string, dateAdded: Date) {
        const item: Item = {
            id: this.idGenerator.generate(),
            name: itemName,
            dateAdded,
            isSelected: false
        };

        await this.repo.pushItem(title, item);

        return item;
    }

    async updateItemName(title: string, itemName: string, newItemName: string) {
        if (!newItemName || newItemName.trim() === '') {
            throw Object.assign(new Error('New title cannot be empty'), { status: 400 });
        }

        if (newItemName.trim() === itemName) {
            throw Object.assign(new Error('New item name must be different from current name'), { status: 400 });
        }

        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        const existingItem = list.items.find(item => item.name === newItemName.trim());

        if (existingItem) {
            throw Object.assign(new Error('An item with that name already exists in this list'), { status: 409 });
        }

        list.items = list.items.map(item =>
            item.name === itemName
                ? { ...item, name: newItemName.trim() }
                : item
        );

        await this.repo.replaceByTitle(title, list);

        return { message: 'Item updated successfully', newItemName: newItemName.trim() };
    }

    async setItemSelected(title: string, itemName: string, isSelected: boolean) {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        list.items = list.items.map(item =>
            item.name === itemName
                ? { ...item, isSelected }
                : item
        );

        await this.repo.replaceByTitle(title, list);

        return { message: 'Updated Successfully' };
    }

    async clearSelectedItems(title: string) {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        list.items = list.items.filter(item => !item.isSelected);
        await this.repo.replaceByTitle(title, list);

        return list;
    }

    async deleteItem(title: string, itemName: string) {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        list.items = list.items.filter(item => item.name !== itemName);
        await this.repo.replaceByTitle(title, list);

        return list;
    }

    async updateListTitle(title: string, newTitle: string) {
        if (!newTitle || newTitle.trim() === '') {
            throw Object.assign(new Error('New title cannot be empty'), { status: 400 });
        }

        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        const existingList = await this.repo.getByTitle(newTitle.trim());

        if (existingList) {
            throw Object.assign(new Error('A list with that name already exists'), { status: 409 });
        }

        list.title = newTitle.trim();
        await this.repo.replaceByTitle(title, list);

        return { message: 'List updated successfully', newTitle: newTitle.trim() };
    }

    async deleteList(title: string) {
        await this.repo.deleteByTitle(title);

        return { message: 'List deleted successfully' };
    }

    async clearList(title: string) {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        list.items = [];
        await this.repo.replaceByTitle(title, list);

        return list;
    }
}
