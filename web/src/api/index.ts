import { type Item } from '../types';

//const URLPath = 'https://shoppingo-api.onrender.com';
const URLPath = 'http://localhost:3001';

export const getItemsQuery = () => ({
    queryKey: ['items'],
    queryFn: async () => await getItems(),
});

export const getItems = async (): Promise<Item[]> => {
    return await makeRequest({
        URL: `${URLPath}/items`,
        method: MethodType.GET,
        operationString: 'get items',
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

export const addItem = async (itemName: string) => {
    const dateAdded = generateTimestamp(new Date());
    return await makeRequest({
        URL: `${URLPath}/items`,
        method: MethodType.PUT,
        operationString: 'add item',
        body: JSON.stringify({
            itemName,
            dateAdded,
        }),
    });
};

export const updateSelected = async (itemName: string, isSelected: boolean) => {
    return await makeRequest({
        URL: `${URLPath}/items`,
        method: MethodType.POST,
        operationString: 'update item',
        body: JSON.stringify({
            itemName,
            isSelected,
        }),
    });
};

export const deleteItem = async (itemName: string) => {
    return await makeRequest({
        URL: `${URLPath}/items/${itemName}`,
        method: MethodType.DELETE,
        operationString: 'delete item',
    });
};

export const deleteAll = async () => {
    return await makeRequest({
        URL: `${URLPath}/items`,
        method: MethodType.DELETE,
        operationString: 'delete items',
    });
};

enum MethodType {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    DELETE = 'DELETE',
}

interface MakeRequestProps {
    URL: string;
    method: MethodType;
    operationString: string;
    body?: BodyInit;
}

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
        }
    } catch (error) {
        throw new Error(`Error while trying to ${operationString}: ${error}`);
    }
};
