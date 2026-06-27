import { getStorageItem } from '@imapps/web-utils';
import type { Item, Label, ListResponse, ListType, Recipe, Todo, User } from '@shoppingo/types';

import { getAuthConfig } from '../config/auth';
import { makeRequest } from './makeRequest';
import { MethodType } from './types';

export const getListQuery = (listTitle: string) => ({
    queryKey: [listTitle],
    queryFn: async () => await getList(listTitle),
});

const getList = async (
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

const getLists = async (userId: string): Promise<Array<ListResponse>> => {
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
    id?: string
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
            ...(id !== undefined && { id }),
        }),
    });

    void fetch(`/api/image/${encodeURIComponent(itemName)}`, { method: 'GET' }).catch(() => {});

    return result;
};

export const addItemsBulk = async (
    listTitle: string,
    items: Array<{ itemName: string; quantity?: number; unit?: string }>
): Promise<{ added: number; skipped: number }> => {
    const dateAdded = generateTimestamp(new Date());

    const result = await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/bulk`,
        method: MethodType.PUT,
        operationString: 'add items in bulk',
        body: JSON.stringify({
            items: items.map((item) => ({
                itemName: item.itemName,
                dateAdded,
                ...(item.quantity !== undefined && { quantity: item.quantity }),
                ...(item.unit !== undefined && { unit: item.unit }),
            })),
        }),
    });

    return result;
};

export const updateItem = async (itemId: string, isSelected: boolean, listTitle: string) =>
    makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`,
        method: MethodType.POST,
        operationString: 'update item',
        body: JSON.stringify({ isSelected }),
    });

export const deleteItem = async (itemId: string, listTitle: string) =>
    makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`,
        method: MethodType.DELETE,
        operationString: 'delete item',
    });

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

export const updateItemName = async (listTitle: string, itemId: string, newItemName: string) =>
    makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`,
        method: MethodType.POST,
        operationString: 'update item name',
        body: JSON.stringify({ newItemName }),
    });

export const updateItemQuantity = async (listTitle: string, itemId: string, quantity?: number, unit?: string) =>
    makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`,
        method: MethodType.POST,
        operationString: 'update item quantity',
        body: JSON.stringify({
            ...(quantity !== undefined && { quantity }),
            ...(unit !== undefined && { unit }),
        }),
    });

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

const getRecipes = async (_userId: string): Promise<Array<Recipe>> => {
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

const getRecipe = async (recipeId: string): Promise<Recipe> => {
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
    ingredients?: Array<{ name: string; quantity?: number; unit?: string }>,
    link?: string,
    instructions?: string[]
): Promise<Recipe> => {
    const dateAdded = generateTimestamp(new Date());
    const requestBody = {
        title,
        dateAdded,
        user,
        selectedUsers: selectedUsers || [],
        ...(ingredients !== undefined && { ingredients }),
        ...(link !== undefined && { link }),
        ...(instructions !== undefined && { instructions }),
    };

    const result = await makeRequest({
        pathname: '/api/recipes',
        method: MethodType.PUT,
        operationString: 'add recipe',
        body: JSON.stringify(requestBody),
    });

    return result as Recipe;
};

export const updateRecipe = async (
    recipeId: string,
    title: string,
    ingredients: Array<{ name: string; quantity?: number; unit?: string }>,
    coverImageKey?: string,
    link?: string,
    instructions?: string[]
): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}`,
        method: MethodType.PUT,
        operationString: 'update recipe',
        body: JSON.stringify({
            title,
            ingredients,
            ...(coverImageKey !== undefined && { coverImageKey }),
            ...(link !== undefined && { link }),
            ...(instructions !== undefined && { instructions }),
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

export const generateRecipeAiImage = async (recipeId: string): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}/image/generate`,
        method: MethodType.POST,
        operationString: 'generate recipe ai image',
    });
};

export const revertRecipeAiImage = async (recipeId: string): Promise<Recipe> => {
    return await makeRequest({
        pathname: `/api/recipes/${encodeURIComponent(recipeId)}/image/revert`,
        method: MethodType.POST,
        operationString: 'revert recipe ai image',
    });
};

export const uploadRecipeImage = async (recipeId: string, file: File): Promise<{ imageKey: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const authConfig = getAuthConfig();
    const accessToken = getStorageItem(
        authConfig.accessTokenKey || 'accessToken',
        authConfig.storageType || 'localStorage'
    );

    const headers: Record<string, string> = {};
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}/image/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to upload image');
    }

    return await response.json();
};

export interface CreateTodoBody {
    title: string;
    dueDate?: Date;
    time?: string;
    labelId?: string;
    recurrence?: Todo['recurrence'];
}

export const getTodosQuery = () => ({
    queryKey: ['todos'],
    queryFn: async () => await getTodos(),
});

const getTodos = async (): Promise<Array<Todo>> => {
    return await makeRequest({
        pathname: '/api/todos',
        method: MethodType.GET,
        operationString: 'get todos',
    });
};

export const createTodo = async (body: CreateTodoBody): Promise<Todo> => {
    return await makeRequest({
        pathname: '/api/todos',
        method: MethodType.PUT,
        operationString: 'create todo',
        body: JSON.stringify(body),
    });
};

export const updateTodo = async (id: string, body: Partial<Todo>): Promise<Todo> => {
    return await makeRequest({
        pathname: `/api/todos/${encodeURIComponent(id)}`,
        method: MethodType.POST,
        operationString: 'update todo',
        body: JSON.stringify(body),
    });
};

export const deleteTodo = async (id: string): Promise<void> => {
    return await makeRequest({
        pathname: `/api/todos/${encodeURIComponent(id)}`,
        method: MethodType.DELETE,
        operationString: 'delete todo',
    });
};

export const completeTodo = async (id: string, date?: string): Promise<Todo> => {
    return await makeRequest({
        pathname: `/api/todos/${encodeURIComponent(id)}/complete`,
        method: MethodType.POST,
        operationString: 'complete todo',
        body: JSON.stringify(date !== undefined ? { date } : {}),
    });
};

export const getLabelsQuery = () => ({
    queryKey: ['labels'],
    queryFn: async () => await getLabels(),
});

const getLabels = async (): Promise<Array<Label>> => {
    return await makeRequest({
        pathname: '/api/labels',
        method: MethodType.GET,
        operationString: 'get labels',
    });
};

export const createLabel = async (body: { name: string; color: string }): Promise<Label> => {
    return await makeRequest({
        pathname: '/api/labels',
        method: MethodType.PUT,
        operationString: 'create label',
        body: JSON.stringify(body),
    });
};

export const updateLabel = async (id: string, body: { name?: string; color?: string }): Promise<Label> => {
    return await makeRequest({
        pathname: `/api/labels/${encodeURIComponent(id)}`,
        method: MethodType.POST,
        operationString: 'update label',
        body: JSON.stringify(body),
    });
};

export const deleteLabel = async (id: string): Promise<void> => {
    return await makeRequest({
        pathname: `/api/labels/${encodeURIComponent(id)}`,
        method: MethodType.DELETE,
        operationString: 'delete label',
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

export const getVapidPublicKey = async (): Promise<{ publicKey: string | null }> => {
    return await makeRequest({
        pathname: '/api/push/vapid-public-key',
        method: MethodType.GET,
        operationString: 'get vapid public key',
    });
};

export const subscribeToPush = async (subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}): Promise<void> => {
    return await makeRequest({
        pathname: '/api/push/subscribe',
        method: MethodType.POST,
        operationString: 'subscribe to push',
        body: JSON.stringify(subscription),
    });
};

export const unsubscribeFromPush = async (endpoint: string): Promise<void> => {
    return await makeRequest({
        pathname: '/api/push/subscribe',
        method: MethodType.DELETE,
        operationString: 'unsubscribe from push',
        body: JSON.stringify({ endpoint }),
    });
};
