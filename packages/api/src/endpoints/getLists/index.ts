import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const getLists = async (req: Request, res: Response) => {
    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    // TODO: do some actual error handling maybe lol

    const collection = database.getCollection(CollectionName.Lists);

    const results = await collection.find({}).toArray();

    res.send(results).status(200);
};

export default getLists;
