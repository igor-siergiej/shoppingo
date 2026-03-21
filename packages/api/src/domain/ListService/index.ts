import type { Logger } from '@imapps/api-utils';

import type { Item, List, ListType, User } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { AuthorizationService } from '../AuthorizationService';
import type { IdGenerator } from '../IdGenerator';
import type { ListRepository } from '../ListRepository';
import type { AuthClient } from './types';

export class ListService {
    private readonly authorizationService: AuthorizationService;

    constructor(
        private readonly repo: ListRepository,
        private readonly idGenerator: IdGenerator,
        private readonly auth?: AuthClient,
        private readonly logger?: Logger,
        authorizationService?: AuthorizationService
    ) {
        this.authorizationService = authorizationService ?? new AuthorizationService();
    }

    private async resolveSharedUsers(title: string, owner: User, usernames?: Array<string>): Promise<Array<User>> {
        if (!usernames || usernames.length === 0) {
            return [owner];
        }

        if (!this.auth) {
            throw Object.assign(new Error('Auth service not configured'), { status: 502 });
        }

        try {
            const fetched = await this.auth.getUsersByUsernames(usernames);

            if (!fetched || fetched.length === 0) {
                throw Object.assign(new Error('No users found for the provided usernames'), { status: 400 });
            }

            this.logger?.info('List shared with users', {
                listTitle: title,
                owner: owner.username,
                sharedWithCount: fetched.length,
                sharedWith: fetched.map((u) => u.username),
            });

            return [owner, ...fetched];
        } catch (error) {
            const errorWithStatus = error as {
                status?: number;
                usersNotFound?: boolean;
                authServiceError?: boolean;
            };

            if (errorWithStatus.usersNotFound) {
                this.logger?.warn('Attempted to share list with non-existent users', {
                    listTitle: title,
                    owner: owner.username,
                    selectedUsernames: usernames,
                    message: (error as Error).message,
                });
                throw error;
            } else if (errorWithStatus.authServiceError) {
                this.logger?.error('Auth service unavailable when sharing list', {
                    listTitle: title,
                    owner: owner.username,
                    selectedUsernames: usernames,
                    message: (error as Error).message,
                });
                throw Object.assign(new Error('Auth service unavailable. Please try again later.'), {
                    status: 502,
                });
            } else {
                this.logger?.error('Failed to share list with users', {
                    listTitle: title,
                    owner: owner.username,
                    selectedUsernames: usernames,
                    error,
                });
                throw Object.assign(new Error('Failed to share list. Please try again.'), { status: 500 });
            }
        }
    }

    async getList(title: string): Promise<List> {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        // Backward compatibility: default to SHOPPING if listType is missing
        if (!list.listType) {
            this.logger?.warn('List missing listType field, defaulting to SHOPPING', {
                listTitle: title,
            });
            list.listType = ListTypeEnum.SHOPPING;
        }

        return list;
    }

    async getListItems(title: string): Promise<Array<Item>> {
        const list = await this.getList(title);
        return list.items;
    }

    async getListsForUser(userId: string) {
        if (!userId) {
            throw Object.assign(new Error('userId is required'), { status: 400 });
        }

        try {
            const lists = await this.repo.findByUserId(userId);
            this.logger?.info('Retrieved lists for user', { userId, count: lists.length });

            return lists.map((list) => ({
                id: list.id,
                title: list.title,
                dateAdded: list.dateAdded,
                items: list.items,
                users: list.users.map((user) => ({ username: user.username })),
                listType: list.listType || ListTypeEnum.SHOPPING,
                ownerId: this.authorizationService.getEffectiveOwnerId(list),
            }));
        } catch (error) {
            this.logger?.error('Failed to retrieve lists for user', { userId, error });
            throw error;
        }
    }

    async addList(
        title: string,
        dateAdded: Date,
        owner: User,
        selectedUsernames?: Array<string>,
        listType: ListType = ListTypeEnum.SHOPPING
    ) {
        try {
            const users = await this.resolveSharedUsers(title, owner, selectedUsernames);

            const list: List = {
                id: this.idGenerator.generate(),
                title,
                dateAdded,
                items: [],
                users,
                listType,
                ownerId: owner.id,
            };

            await this.repo.insert(list);
            this.logger?.info('List created', {
                listId: list.id,
                listTitle: title,
                owner: owner.username,
                userCount: users.length,
                listType,
            });

            return list;
        } catch (error) {
            this.logger?.error('Failed to create list', {
                listTitle: title,
                owner: owner.username,
                error,
            });
            throw error;
        }
    }

    async addItem(title: string, itemName: string, dateAdded: Date, quantity?: number, unit?: string, dueDate?: Date) {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            // Validate list type constraints
            if (list.listType === ListTypeEnum.TODO && (quantity !== undefined || unit !== undefined)) {
                throw Object.assign(new Error('TODO lists cannot have quantity or unit'), { status: 400 });
            }

            if (list.listType === ListTypeEnum.SHOPPING && dueDate !== undefined) {
                throw Object.assign(new Error('Shopping lists cannot have due dates'), { status: 400 });
            }

            // Check if an item with the same name already exists (case-insensitive)
            const existingItem = list.items.find((item) => item.name.toLowerCase() === itemName.toLowerCase());

            if (existingItem) {
                throw Object.assign(new Error('An item with that name already exists in this list'), { status: 409 });
            }

            const item: Item = {
                id: this.idGenerator.generate(),
                name: itemName,
                dateAdded,
                isSelected: false,
                ...(quantity !== undefined && { quantity }),
                ...(unit !== undefined && { unit }),
                ...(dueDate !== undefined && { dueDate }),
            };

            await this.repo.pushItem(title, item);
            this.logger?.info('Item added to list', {
                listTitle: title,
                itemName,
                itemId: item.id,
                quantity,
                unit,
            });

            return item;
        } catch (error) {
            this.logger?.error('Failed to add item to list', { listTitle: title, itemName, error });
            throw error;
        }
    }

    async updateItemDueDate(title: string, itemName: string, dueDate?: Date) {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            if (list.listType !== ListTypeEnum.TODO) {
                throw Object.assign(new Error('Due dates only available for TODO lists'), { status: 400 });
            }

            list.items = list.items.map((item) => (item.name === itemName ? { ...item, dueDate } : item));

            await this.repo.replaceByTitle(title, list);

            this.logger?.info('Item due date updated', {
                listTitle: title,
                itemName,
                dueDate,
            });

            return { message: 'Due date updated successfully' };
        } catch (error) {
            this.logger?.error('Failed to update item due date', {
                listTitle: title,
                itemName,
                dueDate,
                error,
            });
            throw error;
        }
    }

    async updateItemName(title: string, itemName: string, newItemName: string) {
        try {
            if (!newItemName || newItemName.trim() === '') {
                throw Object.assign(new Error('New title cannot be empty'), {
                    status: 400,
                });
            }

            if (newItemName.trim() === itemName) {
                throw Object.assign(new Error('New item name must be different from current name'), { status: 400 });
            }

            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            const existingItem = list.items.find((item) => item.name === newItemName.trim());

            if (existingItem) {
                throw Object.assign(new Error('An item with that name already exists in this list'), { status: 409 });
            }

            list.items = list.items.map((item) =>
                item.name === itemName ? { ...item, name: newItemName.trim() } : item
            );

            await this.repo.replaceByTitle(title, list);

            this.logger?.info('Item name updated', {
                listTitle: title,
                oldItemName: itemName,
                newItemName: newItemName.trim(),
            });

            return {
                message: 'Item updated successfully',
                newItemName: newItemName.trim(),
            };
        } catch (error) {
            this.logger?.error('Failed to update item name', {
                listTitle: title,
                oldItemName: itemName,
                newItemName,
                error,
            });
            throw error;
        }
    }

    async setItemSelected(title: string, itemName: string, isSelected: boolean) {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            list.items = list.items.map((item) => (item.name === itemName ? { ...item, isSelected } : item));

            await this.repo.replaceByTitle(title, list);

            this.logger?.info('Item selection updated', {
                listTitle: title,
                itemName,
                isSelected,
            });

            return { message: 'Updated Successfully' };
        } catch (error) {
            this.logger?.error('Failed to update item selection', {
                listTitle: title,
                itemName,
                isSelected,
                error,
            });
            throw error;
        }
    }

    async updateItemQuantity(title: string, itemName: string, quantity?: number, unit?: string) {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            list.items = list.items.map((item) =>
                item.name === itemName
                    ? {
                          ...item,
                          ...(quantity !== undefined && { quantity }),
                          ...(unit !== undefined && { unit }),
                      }
                    : item
            );

            await this.repo.replaceByTitle(title, list);

            this.logger?.info('Item quantity updated', {
                listTitle: title,
                itemName,
                quantity,
                unit,
            });

            return { message: 'Quantity updated successfully' };
        } catch (error) {
            this.logger?.error('Failed to update item quantity', {
                listTitle: title,
                itemName,
                quantity,
                unit,
                error,
            });
            throw error;
        }
    }

    async clearSelectedItems(title: string) {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            const selectedCount = list.items.filter((item) => item.isSelected).length;
            list.items = list.items.filter((item) => !item.isSelected);
            await this.repo.replaceByTitle(title, list);

            this.logger?.info('Selected items cleared from list', {
                listTitle: title,
                clearedItemCount: selectedCount,
                remainingItemCount: list.items.length,
            });

            return list;
        } catch (error) {
            this.logger?.error('Failed to clear selected items', { listTitle: title, error });
            throw error;
        }
    }

    async deleteItem(title: string, itemName: string) {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            list.items = list.items.filter((item) => item.name !== itemName);
            await this.repo.replaceByTitle(title, list);

            this.logger?.info('Item deleted from list', {
                listTitle: title,
                itemName,
                remainingItemCount: list.items.length,
            });

            return list;
        } catch (error) {
            this.logger?.error('Failed to delete item', { listTitle: title, itemName, error });
            throw error;
        }
    }

    async updateListTitle(title: string, newTitle: string) {
        try {
            if (!newTitle || newTitle.trim() === '') {
                throw Object.assign(new Error('New title cannot be empty'), {
                    status: 400,
                });
            }

            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            const existingList = await this.repo.getByTitle(newTitle.trim());

            if (existingList) {
                throw Object.assign(new Error('A list with that name already exists'), {
                    status: 409,
                });
            }

            list.title = newTitle.trim();
            await this.repo.replaceByTitle(title, list);

            this.logger?.info('List renamed', {
                oldTitle: title,
                newTitle: newTitle.trim(),
                itemCount: list.items.length,
            });

            return { message: 'List updated successfully', newTitle: newTitle.trim() };
        } catch (error) {
            this.logger?.error('Failed to update list title', {
                oldTitle: title,
                newTitle,
                error,
            });
            throw error;
        }
    }

    async deleteList(title: string) {
        try {
            await this.repo.deleteByTitle(title);

            this.logger?.info('List deleted', { listTitle: title });

            return { message: 'List deleted successfully' };
        } catch (error) {
            this.logger?.error('Failed to delete list', { listTitle: title, error });
            throw error;
        }
    }

    async clearList(title: string) {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            const clearedCount = list.items.length;
            list.items = [];
            await this.repo.replaceByTitle(title, list);

            this.logger?.info('List cleared', { listTitle: title, clearedItemCount: clearedCount });

            return list;
        } catch (error) {
            this.logger?.error('Failed to clear list', { listTitle: title, error });
            throw error;
        }
    }

    /**
     * Add a user to an existing list
     * Only the list owner can add users
     */
    async addUserToList(title: string, username: string, requestingUserId: string): Promise<List> {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        // Authorization: only owner can add users
        if (!this.authorizationService.canManageUsers(list, requestingUserId)) {
            throw Object.assign(new Error('Only the list owner can manage users'), { status: 403 });
        }

        // Validate username exists via auth service
        if (!this.auth) {
            throw Object.assign(new Error('Auth service not configured'), { status: 502 });
        }

        const fetchedUsers = await this.auth.getUsersByUsernames([username]);

        if (!fetchedUsers || fetchedUsers.length === 0) {
            throw Object.assign(new Error(`User not found: ${username}`), { status: 400 });
        }

        const userToAdd = fetchedUsers[0];

        // Check if user is already in the list
        if (list.users.some((u) => u.id === userToAdd.id)) {
            throw Object.assign(new Error('User is already in this list'), { status: 400 });
        }

        // Add user to list
        list.users.push(userToAdd);
        await this.repo.replaceByTitle(title, list);

        this.logger?.info('User added to list', {
            listTitle: title,
            addedUser: username,
            addedBy: requestingUserId,
        });

        return list;
    }

    /**
     * Remove a user from an existing list
     * Only the list owner can remove users
     */
    async removeUserFromList(title: string, userIdToRemove: string, requestingUserId: string): Promise<List> {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        // Authorization: only owner can remove users
        if (!this.authorizationService.canManageUsers(list, requestingUserId)) {
            throw Object.assign(new Error('Only the list owner can manage users'), { status: 403 });
        }

        // Cannot remove the owner
        const effectiveOwnerId = this.authorizationService.getEffectiveOwnerId(list);
        if (userIdToRemove === effectiveOwnerId) {
            throw Object.assign(new Error('Cannot remove the list owner'), { status: 400 });
        }

        // Cannot remove the last user
        if (list.users.length <= 1) {
            throw Object.assign(new Error('Cannot remove the last user from the list'), { status: 400 });
        }

        // Check if user is in the list
        const userExists = list.users.some((u) => u.id === userIdToRemove);
        if (!userExists) {
            throw Object.assign(new Error('User is not in this list'), { status: 400 });
        }

        // Remove user from list
        list.users = list.users.filter((u) => u.id !== userIdToRemove);
        await this.repo.replaceByTitle(title, list);

        this.logger?.info('User removed from list', {
            listTitle: title,
            removedUserId: userIdToRemove,
            removedBy: requestingUserId,
        });

        return list;
    }

    async addItems(
        title: string,
        rawItems: Array<{ itemName: string; quantity?: number; unit?: string; dateAdded: Date }>,
        userId: string
    ): Promise<{ added: number; skipped: number }> {
        try {
            const list = await this.repo.getByTitle(title);

            if (!list) {
                throw Object.assign(new Error('List not found'), { status: 404 });
            }

            // Collect existing item names (lowercased)
            const existingNames = new Set(list.items.map((item) => item.name.toLowerCase()));

            // Filter duplicates and create Item objects
            const newItems: Item[] = [];
            let skipped = 0;

            for (const raw of rawItems) {
                if (existingNames.has(raw.itemName.toLowerCase())) {
                    skipped++;
                } else {
                    const item: Item = {
                        id: this.idGenerator.generate(),
                        name: raw.itemName,
                        dateAdded: raw.dateAdded,
                        isSelected: false,
                        ...(raw.quantity !== undefined && { quantity: raw.quantity }),
                        ...(raw.unit !== undefined && { unit: raw.unit }),
                    };
                    newItems.push(item);
                    existingNames.add(raw.itemName.toLowerCase());
                }
            }

            // Push new items to list
            if (newItems.length > 0) {
                await this.repo.pushItems(title, newItems);
            }

            this.logger?.info('Items bulk added to list', {
                listTitle: title,
                userId,
                addedCount: newItems.length,
                skippedCount: skipped,
            });

            return { added: newItems.length, skipped };
        } catch (error) {
            this.logger?.error('Failed to add items to list', { listTitle: title, userId, error });
            throw error;
        }
    }
}
