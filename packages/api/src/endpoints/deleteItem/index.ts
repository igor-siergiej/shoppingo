import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const deleteItem = async (req: Request, res: Response) => {
    const { title, itemName } = req.params;

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

    const updatedItems = list.items.filter(item => item.name !== itemName);

    const updatedList = {
        ...list,
        items: updatedItems
    };

    const replacedList = await collection.findOneAndReplace({ title }, updatedList);

    res.send(replacedList).status(200);
};

export default deleteItem;
