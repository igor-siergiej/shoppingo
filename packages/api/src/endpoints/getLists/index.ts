import { ListResponse } from '@shoppingo/types';
import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const getLists = async (req: Request, res: Response) => {
    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

    const results = await collection.find({}).toArray();

    const maskedResults: Array<ListResponse> = results.map(list => ({
        ...list,
        users: list.users.map(user => ({ username: user.username }))
    }));

    res.send(maskedResults).status(200);
};

export default getLists;
