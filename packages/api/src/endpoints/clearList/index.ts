import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const clearList = async (req: Request, res: Response) => {
    const { title } = req.params;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });
        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

    const result = await collection.findOneAndUpdate({ title }, { $set: { items: [] } });

    res.send(result).status(200);
};

export default clearList;
