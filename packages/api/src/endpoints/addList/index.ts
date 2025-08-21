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
        try {
            console.log(`Fetching users from ${process.env.AUTH_URL}/users with usernames:`, selectedUsers);

            const response = await fetch(`${process.env.AUTH_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usernames: selectedUsers })
            });

            if (!response.ok) {
                console.error(`Auth service responded with status: ${response.status}`);

                const errorText = await response.text();

                console.error('Auth service error response:', errorText);

                res.status(502).json({ error: `Auth service error: ${response.status}` });

                return;
            }

            const data = await response.json();

            console.log('Auth service response:', data);

            if (!data.success) {
                console.error('Auth service returned success: false', data);

                res.status(502).json({ error: 'Auth service returned error', details: data.message });

                return;
            }

            users = data.users || [];

            if (!users || users.length === 0) {
                console.warn('No users found for usernames:', selectedUsers);

                res.status(400).json({ error: 'No users found for the provided usernames' });

                return;
            }

            console.log(`Successfully fetched ${users.length} users`);
        } catch (error) {
            console.error('Error fetching users from auth service:', error);

            res.status(502).json({ error: 'Failed to fetch users from auth service' });

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
