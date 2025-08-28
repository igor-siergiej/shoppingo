import { ListResponse } from '@shoppingo/types';
import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const getLists = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        res.status(400).json({ error: 'userId is required' });

        return;
    }

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const results = await collection.find({ 'users.id': userId }).toArray();

    const maskedResults: Array<ListResponse> = results.map(list => ({
        id: list.id,
        title: list.title,
        dateAdded: list.dateAdded,
        items: list.items,
        users: list.users.map(user => ({ username: user.username }))
    }));

    res.send(maskedResults).status(200);
};

export default getLists;
