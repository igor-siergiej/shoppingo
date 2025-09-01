import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const updateItem = async (req: Request, res: Response) => {
    const { title, itemName } = req.params;
    const { isSelected, newItemName } = req.body;

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.findOne({ title });

    if (!list) {
        res.status(404).json({ error: 'List not found' });

        return;
    }

    // If updating item name (when newItemName is provided)
    if (newItemName && newItemName.trim() !== '') {
        if (newItemName.trim() === itemName) {
            res.status(400).json({ error: 'New item name must be different from current name' });

            return;
        }

        // Check if an item with the new name already exists in this list
        const existingItem = list.items.find(item => item.name === newItemName.trim());

        if (existingItem) {
            res.status(409).json({ error: 'An item with that name already exists in this list' });

            return;
        }

        const updatedItems = list.items.map((item) => {
            if (item.name === itemName) {
                return {
                    ...item,
                    name: newItemName.trim()
                };
            } else {
                return item;
            }
        });

        const updatedList = {
            ...list,
            items: updatedItems
        };

        await collection.findOneAndReplace({ title }, updatedList);
        res.status(200).json({ message: 'Item updated successfully', newItemName: newItemName.trim() });

        return;
    }

    // Otherwise, update item selection status as usual
    const updatedItems = list.items.map((item) => {
        if (item.name === itemName) {
            return {
                ...item,
                isSelected
            };
        } else {
            return item;
        }
    });

    const updatedList = {
        ...list,
        items: updatedItems
    };

    await collection.findOneAndReplace({ title }, updatedList);

    res.status(200).send(JSON.stringify('Updated Successfully'));
};

export default updateItem;
