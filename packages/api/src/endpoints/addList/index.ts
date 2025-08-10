import { List } from '@shoppingo/types';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const addList = async (req: Request, res: Response) => {
    const { name, dateAdded } = req.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    const collection = database.getCollection(CollectionName.Lists);

    const list: List = {
        _id: new ObjectId(),
        name,
        dateAdded,
        items: []
    };

    const result = await collection.insertOne(list);
    res.send(result).status(200);
};

export default addList;
