import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const deleteList = async (req: Request, res: Response) => {
    const { title } = req.params;

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.deleteOne({ title });

    res.send(list).status(200);
};

export default deleteList;
