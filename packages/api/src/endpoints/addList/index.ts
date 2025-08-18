import { List } from '@shoppingo/types';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const addList = async (req: Request, res: Response) => {
    const { title, dateAdded, user } = req.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

    const list: List = {
        id: (new ObjectId()).toString(),
        title,
        dateAdded,
        items: [],
        users: user ? [user] : []
    };

    const result = await collection.insertOne(list);

    res.send(result).status(200);
};

export default addList;
