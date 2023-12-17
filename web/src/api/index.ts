import { type Item } from '../types';

//const URLPath = 'https://shoppingo-api.onrender.com';
const URLPath = 'http://localhost:3001';

export const getItemsQuery = () => ({
    queryKey: ['items'],
    queryFn: async () => await getItems(),
});

export const getItems = async (): Promise<Item[]> => {
    const response = await fetch(`${URLPath}/items`);
    if (!response.ok) {
        console.log(response);
        throw new Error('Network response was not ok');
    }
    return await response.json();
};

const generateTimestamp = (): string => {
    const now = new Date();
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
        const dateAdded = generateTimestamp();

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

        if (response.ok) {
            const data = await response.json();
            console.log(data);
            // Handle success, e.g., update state or show a success message
        } else {
            console.error(
                'Failed to add item:',
                response.status,
                response.statusText
            );
            // Handle failure, e.g., show an error message
        }
    } catch (error) {
        console.error('Error adding item:', error);
        // Handle unexpected errors
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

        if (response.ok) {
            const data = await response.json();
            console.log(data);
            // Handle success, e.g., update state or show a success message
        } else {
            console.error(
                'Failed to update item:',
                response.status,
                response.statusText
            );
            // Handle failure, e.g., show an error message
        }
    } catch (error) {
        console.error('Error updating item:', error);
        // Handle unexpected errors
    }
};
