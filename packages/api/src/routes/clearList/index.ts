import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const clearList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database not available' };

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const result = await collection.findOneAndUpdate({ title }, { $set: { items: [] } });

    ctx.status = 200;
    ctx.body = result;
};

export default clearList;
