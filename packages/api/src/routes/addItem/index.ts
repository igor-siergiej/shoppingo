import { Context } from 'koa';
import { ObjectId } from 'mongodb';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const addItem = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { itemName, dateAdded } = ctx.request.body as { itemName: string; dateAdded: Date };

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database not available' };

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.findOneAndUpdate({ title },
        { $push: { items: { id: (new ObjectId()).toString(), name: itemName, dateAdded, isSelected: false } } });

    ctx.status = 200;
    ctx.body = list;
};

export default addItem;
