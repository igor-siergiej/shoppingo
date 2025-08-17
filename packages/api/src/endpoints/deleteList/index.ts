import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const deleteList = async (req: Request, res: Response) => {
    const { listTitle } = req.params;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    // TODO: do some actual error handling maybe lol

    const collection = database.getCollection(CollectionName.Lists);

    const list = await collection.deleteOne({ title: listTitle });

    res.send(list).status(200);
};

export default deleteList;
