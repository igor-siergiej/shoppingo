import { Request, Response } from 'express';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { CollectionName } from '../../database/types';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const clearList = async (req: Request, res: Response) => {
    const { listName } = req.params;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    const collection = database.getCollection(CollectionName.Lists);

    const result = await collection.findOneAndUpdate({ name: listName }, { $set: { items: [] } });

    res.send(result).status(200);
};

export default clearList;
