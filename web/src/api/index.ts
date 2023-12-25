import { type Item } from '../types';

const URLPath = 'https://shoppingo-api.onrender.com';
//const URLPath = 'http://localhost:3001';

export const getItemsQuery = () => ({
    queryKey: ['items'],
    queryFn: async () => await getItems(),
});

export const getItems = async (): Promise<Item[]> => {
    try {
        const response = await fetch(`${URLPath}/items`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            throw new Error(
                `Failed to add item: ${response.status}: ${response.statusText}`
            );
        }
    } catch (error) {
        throw new Error(`Error adding item: ${error}`);
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

export const addItem = async (itemName: string) => {
    try {
        const dateAdded = generateTimestamp(new Date());

        const response = await fetch(`${URLPath}/items`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                itemName,
                dateAdded,
            }),
        });

        if (!response.ok) {
            console.error(
                'Failed to add item:',
                response.status,
                response.statusText
            );
        }
    } catch (error) {
        console.error('Error adding item:', error);
    }
};

export const updateSelected = async (itemName: string, isSelected: boolean) => {
    try {
        const response = await fetch(`${URLPath}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                itemName,
                isSelected,
            }),
        });

        if (!response.ok) {
            console.error(
                'Failed to update item:',
                response.status,
                response.statusText
            );
        }
    } catch (error) {
        console.error('Error updating item:', error);
    }
};

export const deleteItem = async (itemName: string) => {
    try {
        const response = await fetch(`${URLPath}/items/${itemName}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(
                'Failed to delete item:',
                response.status,
                response.statusText
            );
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
};

export const deleteAll = async () => {
    try {
        const response = await fetch(`${URLPath}/items`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(
                'Failed to delete items:',
                response.status,
                response.statusText
            );
        }
    } catch (error) {
        console.error('Error deleting items:', error);
    }
};
