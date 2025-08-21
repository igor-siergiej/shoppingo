import { List, User } from '@shoppingo/types';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { CollectionName } from '../../database/types';
import { DependencyContainer } from '../../lib/dependencyContainer';
import { DependencyToken } from '../../lib/dependencyContainer/types';

const addList = async (req: Request, res: Response) => {
    const { title, dateAdded, user, selectedUsers } = req.body;

    const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

    if (!database) {
        res.status(500).json({ error: 'Database not available' });

        return;
    }

    const collection = database.getCollection(CollectionName.Lists);

    let users: Array<User> = [];

    if (selectedUsers && selectedUsers.length > 0) {
        users = await fetch(`${process.env.AUTH_URL}/users`, {
            method: 'POST',
            body: JSON.stringify({ usernames: selectedUsers }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(data => data.users) as Array<User>;

        if (!users || users.length === 0) {
            res.status(500).json({ error: 'Failed to fetch users' });

            return;
        }
    }

    const list: List = {
        id: (new ObjectId()).toString(),
        title,
        dateAdded,
        items: [],
        users: users.length > 0 ? [...users, user] : [user]
    };

    const result = await collection.insertOne(list);

    res.send(result).status(200);
};

export default addList;
