import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { ListService } from '../../domain/ListService';

const getListService = (): ListService => dependencyContainer.resolve(DependencyToken.ListService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

export const getList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const logger = getLogger();

    try {
        const items = await getListService().getListItems(title);

        logger.info('API: List items retrieved', { listTitle: title, itemCount: items.length });

        ctx.set('Cache-Control', 'no-store');
        ctx.status = 200;
        ctx.body = items;
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
    const { title, dateAdded, user, selectedUsers } = ctx.request.body as {
        title: string;
        dateAdded: Date;
        user: unknown;
        selectedUsers?: Array<string>;
    };
    const logger = getLogger();
    const userObj = user as any;

    try {
        const list = await getListService().addList(title, dateAdded, userObj, selectedUsers);

        logger.info('API: List created', {
            userId: userObj.id,
            username: userObj.username,
            listId: list.id,
            listTitle: title,
        });

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to create list', {
            userId: userObj?.id,
            username: userObj?.username,
            listTitle: title,
            error: err.message,
        });

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const addItem = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { itemName, dateAdded, quantity, unit } = ctx.request.body as {
        itemName: string;
        dateAdded: Date;
        quantity?: number;
        unit?: string;
    };
    const logger = getLogger();

    try {
        const item = await getListService().addItem(title, itemName, dateAdded, quantity, unit);

        logger.info('API: Item added to list', {
            listTitle: title,
            itemName,
            itemId: item.id,
            quantity,
            unit,
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
    const { isSelected, newItemName, quantity, unit } = ctx.request.body as {
        isSelected?: boolean;
        newItemName?: string;
        quantity?: number;
        unit?: string;
    };
    const logger = getLogger();
    ctx.status = 200;

    try {
        if (newItemName !== undefined) {
            ctx.body = await getListService().updateItemName(title, itemName, newItemName);
            logger.info('API: Item name updated', {
                listTitle: title,
                oldItemName: itemName,
                newItemName,
            });
        } else if (typeof isSelected === 'boolean') {
            ctx.body = await getListService().setItemSelected(title, itemName, isSelected);
            logger.info('API: Item selection updated', {
                listTitle: title,
                itemName,
                isSelected,
            });
        } else if (quantity !== undefined || unit !== undefined) {
            ctx.body = await getListService().updateItemQuantity(title, itemName, quantity, unit);
            logger.info('API: Item quantity updated', {
                listTitle: title,
                itemName,
                quantity,
                unit,
            });
        } else {
            ctx.status = 400;
            ctx.body = {
                error: 'Either isSelected (boolean), newItemName (string), or quantity/unit must be provided',
            };

            logger.warn('API: Invalid item update request', {
                listTitle: title,
                itemName,
                providedFields: { isSelected, newItemName, quantity, unit },
            });
            return;
        }
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to update item', {
            listTitle: title,
            itemName,
            updateType: newItemName ? 'name' : isSelected !== undefined ? 'selection' : 'quantity',
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteItem = async (ctx: Context) => {
    const { title, itemName } = ctx.params as { title: string; itemName: string };
    const logger = getLogger();

    try {
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

    try {
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

    try {
        const result = await getListService().updateListTitle(title, newTitle!);

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

    try {
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

    try {
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
