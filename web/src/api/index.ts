import { Item, List } from '../types';
import { MethodType, MakeRequestProps } from './types';

const { VITE_API_URL } = import.meta.env;

export const getListQuery = (listName: string) => ({
    queryKey: [listName],
    queryFn: async () => await getList(listName),
});

export const getList = async (listName: string): Promise<Item[]> => {
    return await makeRequest({
        URL: `${VITE_API_URL}/lists/${listName}`,
        method: MethodType.GET,
        operationString: 'get list',
    });
};

export const getListsQuery = () => ({
    queryKey: ['lists'],
    queryFn: async () => await getLists(),
});

export const getLists = async (): Promise<List[]> => {
    return await makeRequest({
        URL: `${VITE_API_URL}/lists`,
        method: MethodType.GET,
        operationString: 'get lists',
    });
};

export const addList = async (listName: string): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());
    return await makeRequest({
        URL: `${VITE_API_URL}/lists`,
        method: MethodType.PUT,
        operationString: 'add list',
        body: JSON.stringify({
            name: listName,
            dateAdded,
        }),
    });
};

export const addItem = async (
    itemName: string,
    listName: string
): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());
    return await makeRequest({
        URL: `${VITE_API_URL}/lists/${listName}/items`,
        method: MethodType.PUT,
        operationString: 'add item',
        body: JSON.stringify({
            itemName,
            dateAdded,
        }),
    });
};

export const updateItem = async (
    itemName: string,
    isSelected: boolean,
    listName: string
) => {
    return await makeRequest({
        URL: `${VITE_API_URL}/lists/${listName}/items/${itemName}`,
        method: MethodType.POST,
        operationString: 'update item',
        body: JSON.stringify({
            isSelected,
        }),
    });
};

export const deleteItem = async (itemName: string, listName: string) => {
    return await makeRequest({
        URL: `${VITE_API_URL}/lists/${listName}/items/${itemName}`,
        method: MethodType.DELETE,
        operationString: 'delete item',
    });
};

export const deleteList = async (listName: string) => {
    return await makeRequest({
        URL: `${VITE_API_URL}/lists/${listName}`,
        method: MethodType.DELETE,
        operationString: 'delete list',
    });
};

export const clearList = async (listName: string) => {
    return await makeRequest({
        URL: `${VITE_API_URL}/lists/${listName}/clear`,
        method: MethodType.DELETE,
        operationString: 'clear the list',
    });
};

export const makeRequest = async ({
    URL,
    method,
    operationString,
    body,
}: MakeRequestProps) => {
    try {
        const response = await fetch(URL, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data);
            return data;
        } else {
            console.error(
                `Failed to ${operationString}:`,
                response.status,
                response.statusText
            );
            throw new Error(
                `Response was not ok ${response.status}: ${response.statusText}`
            );
        }
    } catch (error: any) {
        throw new Error(
            `Error while trying to ${operationString}: ${error.message}`
        );
    }
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
