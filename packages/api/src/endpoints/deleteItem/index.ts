import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const deleteItem = async (req: Request, res: Response) => {
    const { listTitle, itemName } = req.params;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });
        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

    const list = await collection.findOne({ title: listTitle });

    if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
    }

    const updatedItems = list.items.filter(item => item.name !== itemName);

    const updatedList = {
        ...list,
        items: updatedItems
    };

    const replacedList = await collection.findOneAndReplace({ title: listTitle }, updatedList);

    res.send(replacedList).status(200);
};

export default deleteItem;
