import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const updateItem = async (ctx: Context) => {
    const { title, itemName } = ctx.params as { title: string; itemName: string };
    const { isSelected, newItemName } = ctx.request.body as { isSelected?: boolean; newItemName?: string };

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

    // If updating item name (when newItemName is provided)
    if (newItemName && newItemName.trim() !== '') {
        if (newItemName.trim() === itemName) {
            ctx.status = 400;
            ctx.body = { error: 'New item name must be different from current name' };

            return;
        }

        // Check if an item with the new name already exists in this list
        const existingItem = list.items.find(item => item.name === newItemName.trim());

        if (existingItem) {
            ctx.status = 409;
            ctx.body = { error: 'An item with that name already exists in this list' };

            return;
        }

        const updatedItems = list.items.map((item) => {
            if (item.name === itemName) {
                return {
                    ...item,
                    name: newItemName.trim()
                };
            } else {
                return item;
            }
        });

        const updatedList = {
            ...list,
            items: updatedItems
        };

        await collection.findOneAndReplace({ title }, updatedList);
        ctx.status = 200;
        ctx.body = { message: 'Item updated successfully', newItemName: newItemName.trim() };

        return;
    }

    // Otherwise, update item selection status as usual
    if (typeof isSelected !== 'boolean') {
        ctx.status = 400;
        ctx.body = { error: 'isSelected must be a boolean' };
        return;
    }
    const updatedItems = list.items.map((item) => {
        if (item.name === itemName) {
            return {
                ...item,
                isSelected
            };
        } else {
            return item;
        }
    });

    const updatedList = {
        ...list,
        items: updatedItems
    };

    await collection.findOneAndReplace({ title }, updatedList);

    ctx.status = 200;
    ctx.body = { message: 'Item selection updated successfully', itemName, isSelected };
};

export default updateItem;
