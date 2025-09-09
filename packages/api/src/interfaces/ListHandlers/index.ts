import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { ListService } from '../../domain/ListService';

const getListService = (): ListService =>
    dependencyContainer.resolve(DependencyToken.ListService);

export const getList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

    try {
        const items = await getListService().getListItems(title);

        ctx.set('Cache-Control', 'no-store');
        ctx.status = 200;
        ctx.body = items;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const getLists = async (ctx: Context) => {
    const { userId } = ctx.params as { userId: string };

    try {
        const lists = await getListService().getListsForUser(userId);

        ctx.status = 200;
        ctx.body = lists;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

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

    try {
        const list = await getListService().addList(title, dateAdded, user as any, selectedUsers);

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const addItem = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { itemName, dateAdded } = ctx.request.body as { itemName: string; dateAdded: Date };

    try {
        const item = await getListService().addItem(title, itemName, dateAdded);

        ctx.status = 200;
        ctx.body = item;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const updateItem = async (ctx: Context) => {
    const { title, itemName } = ctx.params as { title: string; itemName: string };
    const { isSelected, newItemName } = ctx.request.body as { isSelected?: boolean; newItemName?: string };

    try {
        let result;

        if (newItemName !== undefined) {
            result = await getListService().updateItemName(title, itemName, newItemName);
        } else if (typeof isSelected === 'boolean') {
            result = await getListService().setItemSelected(title, itemName, isSelected);
        } else {
            ctx.status = 400;
            ctx.body = { error: 'Either isSelected (boolean) or newItemName (string) must be provided' };

            return;
        }

        ctx.status = 200;
        ctx.body = result;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteItem = async (ctx: Context) => {
    const { title, itemName } = ctx.params as { title: string; itemName: string };

    try {
        const list = await getListService().deleteItem(title, itemName);

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

    try {
        const result = await getListService().deleteList(title);

        ctx.status = 200;
        ctx.body = result;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const updateList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { newTitle } = ctx.request.body as { newTitle?: string };

    try {
        const result = await getListService().updateListTitle(title, newTitle!);

        ctx.status = 200;
        ctx.body = result;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const clearList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

    try {
        const list = await getListService().clearList(title);

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export const deleteSelected = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

    try {
        const list = await getListService().clearSelectedItems(title);

        ctx.status = 200;
        ctx.body = list;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};
