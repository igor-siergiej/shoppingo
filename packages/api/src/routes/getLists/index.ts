import { ListResponse } from '@shoppingo/types';
import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const getLists = async (ctx: Context) => {
    const { userId } = ctx.params as { userId: string };

    if (!userId) {
        ctx.status = 400;
        ctx.body = { error: 'userId is required' };

        return;
    }

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database not available' };

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const results = await collection.find({ 'users.id': userId }).toArray();

    const maskedResults: Array<ListResponse> = results.map(list => ({
        id: list.id,
        title: list.title,
        dateAdded: list.dateAdded,
        items: list.items,
        users: list.users.map(user => ({ username: user.username }))
    }));

    ctx.status = 200;
    ctx.body = maskedResults;
};

export default getLists;
