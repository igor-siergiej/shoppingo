import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const updateList = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };
    const { newTitle } = ctx.request.body as { newTitle?: string };

    if (!newTitle || newTitle.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'New title cannot be empty' };

        return;
    }

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database not available' };

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.findOne({ title });

    if (!list) {
        ctx.status = 404;
        ctx.body = { error: 'List not found' };

        return;
    }

    // Check if a list with the new title already exists
    const existingList = await collection.findOne({ title: newTitle.trim() });

    if (existingList) {
        ctx.status = 409;
        ctx.body = { error: 'A list with that name already exists' };

        return;
    }

    const updatedList = {
        ...list,
        title: newTitle.trim()
    };

    await collection.findOneAndReplace({ title }, updatedList);
    ctx.status = 200;
    ctx.body = { message: 'List updated successfully', newTitle: newTitle.trim() };
};

export default updateList;
