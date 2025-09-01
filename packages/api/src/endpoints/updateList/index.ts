import { Request, Response } from 'express';

import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const updateList = async (req: Request, res: Response) => {
    const { title } = req.params;
    const { newTitle } = req.body;

    if (!newTitle || newTitle.trim() === '') {
        res.status(400).json({ error: 'New title cannot be empty' });

        return;
    }

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    const list = await collection.findOne({ title });

    if (!list) {
        res.status(404).json({ error: 'List not found' });

        return;
    }

    // Check if a list with the new title already exists
    const existingList = await collection.findOne({ title: newTitle.trim() });

    if (existingList) {
        res.status(409).json({ error: 'A list with that name already exists' });

        return;
    }

    const updatedList = {
        ...list,
        title: newTitle.trim()
    };

    await collection.findOneAndReplace({ title }, updatedList);
    res.status(200).json({ message: 'List updated successfully', newTitle: newTitle.trim() });
};

export default updateList;
