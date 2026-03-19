import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { AuthorizationService } from '../../domain/AuthorizationService';
import type { ListService } from '../../domain/ListService';

interface HttpError {
    status?: number;
    [key: string]: unknown;
}

const getListService = (): ListService => dependencyContainer.resolve(DependencyToken.ListService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);
const getAuthorizationService = (): AuthorizationService =>
    dependencyContainer.resolve(DependencyToken.AuthorizationService);

// Helper function to verify user has access to a list
const verifyListAccess = async (
    title: string,
    authenticatedUser: { id: string; username: string },
    _ctx: Context
): Promise<boolean> => {
    try {
        const list = await getListService().getList(title);
        // Check if authenticated user is in the list's users array
        return list.users?.some((u: { id: string; username: string }) => u.id === authenticatedUser.id) || false;
    } catch {
        return false;
    }
};

// Helper to resolve which service method to call based on request body
const resolveItemOperation = (body: {
    isSelected?: boolean;
    newItemName?: string;
    quantity?: number;
    unit?: string;
    dueDate?: Date;
}): {
    type: 'name' | 'selection' | 'quantity' | 'dueDate';
    execute: (service: ReturnType<typeof getListService>, title: string, itemName: string) => Promise<unknown>;
} | null => {
    if (body.newItemName !== undefined) {
        return {
            type: 'name',
            execute: (service, title, itemName) => service.updateItemName(title, itemName, body.newItemName),
        };
    }

    if (typeof body.isSelected === 'boolean') {
        return {
            type: 'selection',
            execute: (service, title, itemName) => service.setItemSelected(title, itemName, body.isSelected),
        };
    }

    if (body.quantity !== undefined || body.unit !== undefined) {
        return {
            type: 'quantity',
            execute: (service, title, itemName) =>
                service.updateItemQuantity(title, itemName, body.quantity, body.unit),
        };
    }

    if (body.dueDate !== undefined) {
        return {
            type: 'dueDate',
            execute: (service, title, itemName) => service.updateItemDueDate(title, itemName, body.dueDate),
        };
    }

    return null;
};

export const getList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const list = await getListService().getList(title);
        const effectiveOwnerId = getAuthorizationService().getEffectiveOwnerId(list);

        logger.info('API: List retrieved', {
            listTitle: title,
            itemCount: list.items.length,
            listType: list.listType,
        });

        ctx.set('Cache-Control', 'no-store');
        ctx.status = 200;
        ctx.body = {
            listType: list.listType,
            items: list.items,
            users: list.users.map((u) => ({ id: u.id, username: u.username })),
            ownerId: effectiveOwnerId,
        };
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to retrieve list items', { listTitle: title, error: err.message });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const getLists = async (ctx: Context) => {
    const { userId } = ctx.params as { userId: string };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    // Verify user is only accessing their own lists
    if (userId !== authenticatedUser.id) {
        logger.warn('Unauthorized list access attempt', {
            authenticatedUserId: authenticatedUser.id,
            requestedUserId: userId,
        });
        ctx.status = 403;
        ctx.body = { error: 'Forbidden' };
        return;
    }

    try {
        const lists = await getListService().getListsForUser(userId);

        logger.info('User accessed their lists', { userId, listCount: lists.length });

        ctx.status = 200;
        ctx.body = lists;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('Failed to get lists for user', { userId, error: err.message });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const addList = async (ctx: Context) => {
    const { title, dateAdded, selectedUsers, listType } = ctx.request.body as {
        title: string;
        dateAdded: Date;
        selectedUsers?: Array<string>;
        listType?: string;
    };
    const logger = getLogger();
    // Use authenticated user from context, not from request body
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    // Minimal input validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'Title is required and must be a non-empty string' };
        return;
    }

    try {
        const list = await getListService().addList(
            title,
            dateAdded,
            authenticatedUser,
            selectedUsers,
            // @ts-expect-error - listType can be undefined from request body
            listType
        );

        logger.info('API: List created', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            listId: list.id,
            listTitle: title,
            listType: list.listType,
        });

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to create list', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            listTitle: title,
            error: err.message,
        });

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const addItem = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { itemName, dateAdded, quantity, unit, dueDate } = ctx.request.body as {
        itemName: string;
        dateAdded: Date;
        quantity?: number;
        unit?: string;
        dueDate?: Date;
    };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    // Minimal input validation
    if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'Item name is required and must be a non-empty string' };
        return;
    }

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const item = await getListService().addItem(title, itemName, dateAdded, quantity, unit, dueDate);

        logger.info('API: Item added to list', {
            listTitle: title,
            itemName,
            itemId: item.id,
            quantity,
            unit,
            dueDate,
        });

        ctx.status = 200;
        ctx.body = item;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to add item to list', {
            listTitle: title,
            itemName,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const updateItem = async (ctx: Context) => {
    const { title, itemName } = ctx.params as { title: string; itemName: string };
    const requestBody = ctx.request.body as {
        isSelected?: boolean;
        newItemName?: string;
        quantity?: number;
        unit?: string;
        dueDate?: Date;
    };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };
    ctx.status = 200;

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        // Validate newItemName if provided
        if (requestBody.newItemName !== undefined) {
            if (typeof requestBody.newItemName !== 'string' || requestBody.newItemName.trim() === '') {
                ctx.status = 400;
                ctx.body = { error: 'New item name must be a non-empty string' };
                return;
            }
        }

        const operation = resolveItemOperation(requestBody);
        if (!operation) {
            ctx.status = 400;
            ctx.body = {
                error: 'Either isSelected (boolean), newItemName (string), quantity/unit, or dueDate must be provided',
            };
            logger.warn('API: Invalid item update request', {
                listTitle: title,
                itemName,
                providedFields: requestBody,
            });
            return;
        }

        ctx.body = await operation.execute(getListService(), title, itemName);
        logger.info(`API: Item ${operation.type} updated`, {
            listTitle: title,
            itemName,
            ...requestBody,
        });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to update item', {
            listTitle: title,
            itemName,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteItem = async (ctx: Context) => {
    const { title, itemName } = ctx.params as { title: string; itemName: string };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const list = await getListService().deleteItem(title, itemName);

        logger.info('API: Item deleted from list', {
            listTitle: title,
            itemName,
            remainingItemCount: list.items.length,
        });

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to delete item', {
            listTitle: title,
            itemName,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        // Check ownership - only owner can delete list
        const list = await getListService().getList(title);

        if (!getAuthorizationService().isListOwner(list, authenticatedUser.id)) {
            logger.warn('Non-owner attempted to delete list', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Only the list owner can delete this list' };
            return;
        }

        const result = await getListService().deleteList(title);

        logger.info('API: List deleted', { listTitle: title });

        ctx.status = 200;
        ctx.body = result;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to delete list', {
            listTitle: title,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const updateList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { newTitle } = ctx.request.body as { newTitle?: string };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        // Validate newTitle
        if (!newTitle || typeof newTitle !== 'string' || newTitle.trim() === '') {
            ctx.status = 400;
            ctx.body = { error: 'New title is required and must be a non-empty string' };
            return;
        }

        const result = await getListService().updateListTitle(title, newTitle);

        logger.info('API: List title updated', {
            oldTitle: title,
            newTitle,
        });

        ctx.status = 200;
        ctx.body = result;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to update list title', {
            oldTitle: title,
            newTitle,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const clearList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const list = await getListService().clearList(title);

        logger.info('API: List cleared', {
            listTitle: title,
            clearedItemCount: list.items.length,
        });

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to clear list', {
            listTitle: title,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteSelected = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const logger = getLogger();
    const authenticatedUser = ctx.state.user as { id: string; username: string };

    try {
        // Verify user has access to this list
        const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
        if (!hasAccess) {
            logger.warn('Unauthorized list access attempt', {
                authenticatedUserId: authenticatedUser.id,
                listTitle: title,
            });
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
        }

        const list = await getListService().clearSelectedItems(title);

        logger.info('API: Selected items cleared from list', {
            listTitle: title,
            remainingItemCount: list.items.length,
        });

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to clear selected items', {
            listTitle: title,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const addUserToList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { username } = ctx.request.body as { username: string };
    const authenticatedUser = ctx.state.user as { id: string; username: string };
    const logger = getLogger();

    // Validate input
    if (!username || typeof username !== 'string' || username.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'Username is required' };
        return;
    }

    // Verify list access
    const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
    if (!hasAccess) {
        logger.warn('Unauthorized list access attempt', {
            authenticatedUserId: authenticatedUser.id,
            listTitle: title,
        });
        ctx.status = 403;
        ctx.body = { error: 'Forbidden' };
        return;
    }

    try {
        const list = await getListService().addUserToList(title, username.trim(), authenticatedUser.id);

        logger.info('API: User added to list', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            listTitle: title,
            addedUser: username,
        });

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to add user to list', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            listTitle: title,
            addedUser: username,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};

export const removeUserFromList = async (ctx: Context) => {
    const { title, userId } = ctx.params as { title: string; userId: string };
    const authenticatedUser = ctx.state.user as { id: string; username: string };
    const logger = getLogger();

    // Verify list access
    const hasAccess = await verifyListAccess(title, authenticatedUser, ctx);
    if (!hasAccess) {
        logger.warn('Unauthorized list access attempt', {
            authenticatedUserId: authenticatedUser.id,
            listTitle: title,
        });
        ctx.status = 403;
        ctx.body = { error: 'Forbidden' };
        return;
    }

    try {
        const list = await getListService().removeUserFromList(title, userId, authenticatedUser.id);

        logger.info('API: User removed from list', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            listTitle: title,
            removedUserId: userId,
        });

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = (error as HttpError)?.status ?? 500;
        const errorMessage = err.message || 'Internal Server Error';

        logger.error('API: Failed to remove user from list', {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            listTitle: title,
            removedUserId: userId,
            error: errorMessage,
            status,
        });

        ctx.status = status;
        ctx.body = { error: errorMessage };
    }
};
