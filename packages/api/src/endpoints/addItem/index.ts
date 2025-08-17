import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { ObjectId } from 'mongodb';

const addItem = async (req: Request, res: Response) => {
    const { title } = req.params;
    const { itemName, dateAdded } = req.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });
        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

    const list = await collection.findOneAndUpdate({ title },
        { $push: { items: { id: (new ObjectId()).toString(), name: itemName, dateAdded, isSelected: false } } });

    res.send(list).status(200);
};

export default addItem;
