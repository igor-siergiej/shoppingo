import { ListResponse } from '@shoppingo/types';
import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const getLists = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        res.status(400).json({ error: 'userId is required' });

        return;
    }

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

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
