import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { ObjectId } from 'mongodb';

const addItem = async (req: Request, res: Response) => {
    const { listTitle } = req.params;
    const { itemName, dateAdded } = req.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    // TODO: do some actual error handling maybe lol

    const collection = database.getCollection(CollectionName.Lists);

    const list = await collection.findOneAndUpdate({ title: listTitle },
        { $push: { items: { id: (new ObjectId()).toString(), name: itemName, dateAdded, isSelected: false } } });

    res.send(list).status(200);
};

export default addItem;
