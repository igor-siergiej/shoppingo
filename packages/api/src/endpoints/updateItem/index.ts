import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const updateItem = async (req: Request, res: Response) => {
    const { title, itemName } = req.params;
    const { isSelected } = req.body;

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
