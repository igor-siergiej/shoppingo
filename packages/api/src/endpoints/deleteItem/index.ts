import { Request, Response } from 'express';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const deleteItem = async (req: Request, res: Response) => {
    const { listName, itemName } = req.params;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    const collection = database.getCollection(CollectionName.Lists);

    const list = await collection.findOne({ name: listName });

    const updatedItems = list.items.reduce((acc, item) => {
        if (item.name === itemName) {
            return acc;
        } else {
            return [...acc, item];
        }
    }, []);

    const updatedList = {
        ...list,
        items: updatedItems
    };

    const replacedList = await collection.findOneAndReplace({ name: listName }, updatedList);

    res.send(replacedList).status(200);
};

export default deleteItem;
