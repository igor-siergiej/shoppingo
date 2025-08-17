import { List } from '@shoppingo/types';
import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';
import { ObjectId } from 'mongodb';

const addList = async (req: Request, res: Response) => {
    const { title, dateAdded } = req.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    const collection = database.getCollection(CollectionName.Lists);

    const list: List = {
        id: (new ObjectId()).toString(),
        title,
        dateAdded,
        items: [],
        users: []
    };

    const result = await collection.insertOne(list);
    res.send(result).status(200);
};

export default addList;
