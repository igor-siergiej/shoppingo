import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const deleteSelected = async (ctx: Context) => {
    const { title } = ctx.params as { title: string };

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

    const updatedItems = list.items.filter(item => !item.isSelected);

    const updatedList = {
        ...list,
        items: updatedItems
    };

    const replacedList = await collection.findOneAndReplace({ title }, updatedList);

    ctx.status = 200;
    ctx.body = replacedList;
};

export default deleteSelected;
