import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const updateItem = async (req: Request, res: Response) => {
    const { title, itemName } = req.params;
    const { isSelected } = req.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });
        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

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
