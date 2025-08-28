import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const getList = async (req: Request, res: Response) => {
    const { title } = req.params;

    const database = dependencyContainer.resolve(DependencyToken.Database);

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.findOne({ title });

    if (!list) {
        res.status(404).json({ error: 'List not found' });

        return;
    }

    res.send(list.items).status(200);
};

export default getList;
