import type { Item, ListResponse, ListType, Recipe, User } from '@shoppingo/types';

import { makeRequest } from './makeRequest';
import { MethodType } from './types';

export const getListQuery = (listTitle: string) => ({
    queryKey: [listTitle],
    queryFn: async () => await getList(listTitle),
});

export const getList = async (
    listTitle: string
): Promise<{
    listType: ListType;
    items: Array<Item>;
    users: Array<{ id: string; username: string }>;
    ownerId?: string;
}> => {
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

export const addList = async (
    listTitle: string,
    user: User,
    selectedUsers?: Array<string>,
    listType?: ListType
): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());
    const requestBody = {
        title: listTitle,
        dateAdded,
        user,
        selectedUsers: selectedUsers || [],
        ...(listType !== undefined && { listType }),
    };

    const result = await makeRequest({
        pathname: '/api/lists',
        method: MethodType.PUT,
        operationString: 'add list',
        body: JSON.stringify(requestBody),
    });

    return result;
};

export const addItem = async (
    itemName: string,
    listTitle: string,
    quantity?: number,
    unit?: string,
    dueDate?: Date
): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());

    const result = await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items`,
        method: MethodType.PUT,
        operationString: 'add item',
        body: JSON.stringify({
            itemName,
            dateAdded,
            ...(quantity !== undefined && { quantity }),
            ...(unit !== undefined && { unit }),
            ...(dueDate !== undefined && { dueDate }),
        }),
    });

    // Trigger image generation/fetch for the item in the background (fire-and-forget)
    void fetch(`/api/image/${encodeURIComponent(itemName)}`, {
        method: 'GET',
    }).catch(() => {
        /* ignore errors, do not block addItem */
    });

    return result;
};

export const updateItem = async (itemName: string, isSelected: boolean, listTitle: string) => {
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
        operationString: 'clear selected items',
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

export const updateItemQuantity = async (listTitle: string, itemName: string, quantity?: number, unit?: string) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemName)}`,
        method: MethodType.POST,
        operationString: 'update item quantity',
        body: JSON.stringify({
            ...(quantity !== undefined && { quantity }),
            ...(unit !== undefined && { unit }),
        }),
    });
};

export const updateItemDueDate = async (listTitle: string, itemName: string, dueDate?: Date) => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemName)}`,
        method: MethodType.POST,
        operationString: 'update item due date',
        body: JSON.stringify({
            ...(dueDate !== undefined && { dueDate }),
        }),
    });
};

export const addUserToList = async (listTitle: string, username: string): Promise<ListResponse> => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/users`,
        method: MethodType.POST,
        operationString: 'add user to list',
        body: JSON.stringify({ username }),
    });
};

export const removeUserFromList = async (listTitle: string, userId: string): Promise<ListResponse> => {
    return await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/users/${encodeURIComponent(userId)}`,
        method: MethodType.DELETE,
        operationString: 'remove user from list',
    });
};

export const getRecipesQuery = (userId: string) => ({
    queryKey: ['recipes', userId],
    queryFn: async () => await getRecipes(userId),
});

export const getRecipes = async (userId: string): Promise<Array<Recipe>> => {
    return await makeRequest({
        pathname: '/api/recipes',
        method: MethodType.GET,
        operationString: 'get recipes',
    });
};

export const getRecipeQuery = (recipeId: string) => ({
    queryKey: ['recipe', recipeId],
    queryFn: async () => await getRecipe(recipeId),
});

export const getRecipe = async (recipeId: string): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}`,
        method: MethodType.GET,
        operationString: 'get recipe',
    });
};

export const addRecipe = async (
    title: string,
    user: User,
    selectedUsers?: Array<string>,
    ingredients?: Array<{ name: string; quantity?: number; unit?: string }>
): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());
    const requestBody = {
        title,
        dateAdded,
        user,
        selectedUsers: selectedUsers || [],
        ...(ingredients !== undefined && { ingredients }),
    };

    const result = await makeRequest({
        pathname: '/api/recipes',
        method: MethodType.PUT,
        operationString: 'add recipe',
        body: JSON.stringify(requestBody),
    });

    return result;
};

export const updateRecipe = async (
    recipeId: string,
    title: string,
    ingredients: Array<{ name: string; quantity?: number; unit?: string }>,
    coverImageKey?: string
): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}`,
        method: MethodType.PUT,
        operationString: 'update recipe',
        body: JSON.stringify({
            title,
            ingredients,
            ...(coverImageKey !== undefined && { coverImageKey }),
        }),
    });
};

export const deleteRecipe = async (recipeId: string): Promise<void> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}`,
        method: MethodType.DELETE,
        operationString: 'delete recipe',
    });
};

export const addUserToRecipe = async (recipeId: string, username: string): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}/users`,
        method: MethodType.POST,
        operationString: 'add user to recipe',
        body: JSON.stringify({ username }),
    });
};

export const removeUserFromRecipe = async (recipeId: string, userId: string): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}/users/${encodeURIComponent(userId)}`,
        method: MethodType.DELETE,
        operationString: 'remove user from recipe',
    });
};

export const setCoverImageKey = async (recipeId: string, coverImageKey: string): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}/image`,
        method: MethodType.PUT,
        operationString: 'set recipe cover image',
        body: JSON.stringify({ imageKey: coverImageKey }),
    });
};

export const deleteCoverImageKey = async (recipeId: string): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}/image`,
        method: MethodType.PUT,
        operationString: 'delete recipe cover image',
        body: JSON.stringify({ imageKey: undefined }),
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
