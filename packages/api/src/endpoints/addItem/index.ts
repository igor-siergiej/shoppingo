import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const addItem = async (req: Request, res: Response) => {
    const { title } = req.params;
    const { itemName, dateAdded } = req.body;

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.findOneAndUpdate({ title },
        { $push: { items: { id: (new ObjectId()).toString(), name: itemName, dateAdded, isSelected: false } } });

    res.send(list).status(200);
};

export default addItem;
