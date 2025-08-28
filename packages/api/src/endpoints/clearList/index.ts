
import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const clearList = async (req: Request, res: Response) => {
    const { title } = req.params;

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const result = await collection.findOneAndUpdate({ title }, { $set: { items: [] } });

    res.send(result).status(200);
};

export default clearList;
