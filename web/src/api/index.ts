import { type Item } from '../types';

const URLPath = 'https://shoppingo-api.onrender.com';

export const getItemsQuery = () => ({
    queryKey: ['items'],
    queryFn: async () => await getItems()
});

export const getItems = async (): Promise<Item[]> => {
    const response = await fetch(`${URLPath}/items`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json();
};

export const addItem = async (itemName: string, isSelected: boolean) => {
    const response = await fetch(`${URLPath}/add/${itemName}/${isSelected}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json();
};
