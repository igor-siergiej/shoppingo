import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const getList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

    const database = dependencyContainer.resolve(DependencyToken.Database);

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.findOne({ title });

    if (!list) {
        ctx.status = 404;
        ctx.body = { error: 'List not found' };

        return;
    }

    ctx.status = 200;
    ctx.body = list.items;
};

export default getList;
