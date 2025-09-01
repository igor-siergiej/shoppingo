import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const deleteList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database not available' };

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.deleteOne({ title });

    ctx.status = 200;
    ctx.body = list;
};

export default deleteList;
