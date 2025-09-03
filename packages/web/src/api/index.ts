import { Item, ListResponse, User } from '@shoppingo/types';

import { makeRequest } from './makeRequest';
import { MethodType } from './types';

export const getListQuery = (listTitle: string) => ({
    queryKey: [listTitle],
    queryFn: async () => await getList(listTitle),
});

export const getList = async (listTitle: string): Promise<Array<Item>> => {
    return await makeRequest({
        pathname: `/api/lists/title/${encodeURIComponent(listTitle)}`,
        method: MethodType.GET,
        operationString: 'get list',
    });
};

export const getListsQuery = (userId: string) => ({
    queryKey: ['lists', userId],
    queryFn: async () => await getLists(userId),
});

export const getLists = async (userId: string): Promise<Array<ListResponse>> => {
    return await makeRequest({
        pathname: `/api/lists/user/${userId}`,
        method: MethodType.GET,
        operationString: 'get lists',
    });
};

export const addList = async (listTitle: string, user: User, selectedUsers?: Array<string>): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());
    const requestBody = {
        title: listTitle,
        dateAdded,
        user,
        selectedUsers: selectedUsers || [],
    };

    const result = await makeRequest({
        pathname: '/api/lists',
        method: MethodType.PUT,
        operationString: 'add list',
        body: JSON.stringify(requestBody)
    });

    return result;
};

export const addItem = async (
    itemName: string,
    listTitle: string
): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());

    const result = await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items`,
        method: MethodType.PUT,
        operationString: 'add item',
        body: JSON.stringify({
            itemName,
            dateAdded,
        }),
    });

    // Trigger image generation/fetch for the item in the background (fire-and-forget)
    void fetch(`/api/image/${encodeURIComponent(itemName)}`, { method: 'GET' })
        .catch(() => { /* ignore errors, do not block addItem */ });

    return result;
};

export const updateItem = async (
    itemName: string,
    isSelected: boolean,
    listTitle: string
) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemName)}`,
        method: MethodType.POST,
        operationString: 'update item',
        body: JSON.stringify({
            isSelected,
        }),
    });
};

export const deleteItem = async (itemName: string, listTitle: string) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemName)}`,
        method: MethodType.DELETE,
        operationString: 'delete item',
    });
};

export const deleteList = async (listTitle: string) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}`,
        method: MethodType.DELETE,
        operationString: 'delete list',
    });
};

export const clearList = async (listTitle: string) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/clear`,
        method: MethodType.DELETE,
        operationString: 'clear the list',
    });
};

export const clearSelected = async (listTitle: string) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/clearSelected`,
        method: MethodType.DELETE,
        operationString: 'clear selected items'
    });
};

export const updateListName = async (listTitle: string, newTitle: string) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}`,
        method: MethodType.POST,
        operationString: 'update list name',
        body: JSON.stringify({
            newTitle,
        }),
    });
};

export const updateItemName = async (listTitle: string, itemName: string, newItemName: string) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemName)}`,
        method: MethodType.POST,
        operationString: 'update item name',
        body: JSON.stringify({
            newItemName,
        }),
    });
};

const generateTimestamp = (now: Date): string => {
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
