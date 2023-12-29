import { Item, List } from '../types';
import { MethodType, MakeRequestProps } from './types';

const URLPath = 'https://shoppingo-api.onrender.com';
//const URLPath = 'http://localhost:3001';

export const getItemsQuery = (listName: string) => ({
    queryKey: [listName],
    queryFn: async () => await getItems(listName),
});

export const getItems = async (listName: string): Promise<Item[]> => {
    return await makeRequest({
        URL: `${URLPath}/items/${listName}`,
        method: MethodType.GET,
        operationString: 'get items',
    });
};

export const getListsQuery = () => ({
    queryKey: ['lists'],
    queryFn: async () => await getLists(),
});

export const getLists = async (): Promise<List[]> => {
    return await makeRequest({
        URL: `${URLPath}/lists`,
        method: MethodType.GET,
        operationString: 'get lists',
    });
};

export const addList = async (listName: string): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());
    return await makeRequest({
        URL: `${URLPath}/lists`,
        method: MethodType.PUT,
        operationString: 'add item',
        body: JSON.stringify({
            listName,
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
        URL: `${URLPath}/items`,
        method: MethodType.PUT,
        operationString: 'add item',
        body: JSON.stringify({
            itemName,
            dateAdded,
            listName,
        }),
    });
};

export const updateSelected = async (
    itemName: string,
    isSelected: boolean,
    listName: string
) => {
    return await makeRequest({
        URL: `${URLPath}/items`,
        method: MethodType.POST,
        operationString: 'update item',
        body: JSON.stringify({
            itemName,
            isSelected,
            listName,
        }),
    });
};

export const deleteItem = async (itemName: string, listName: string) => {
    return await makeRequest({
        URL: `${URLPath}/items/${itemName}/${listName}`,
        method: MethodType.DELETE,
        operationString: 'delete item',
    });
};

export const deleteList = async (listName: string) => {
    return await makeRequest({
        URL: `${URLPath}/lists/${listName}`,
        method: MethodType.DELETE,
        operationString: 'delete list',
    });
};

export const clearList = async (listName: string) => {
    return await makeRequest({
        URL: `${URLPath}/clear/${listName}`,
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
