import { List, User } from '@shoppingo/types';
import { Context } from 'koa';
import { ObjectId } from 'mongodb';

import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { CollectionNames, DependencyToken } from '../../dependencies/types';

const addList = async (ctx: Context) => {
    const { title, dateAdded, user, selectedUsers } = ctx.request.body as { title: string; dateAdded: Date; user: User; selectedUsers?: Array<string> };

    const database = dependencyContainer.resolve(DependencyToken.Database);

    if (!database) {
        ctx.status = 500;
        ctx.body = { error: 'Database not available' };

        return;
    }

    const collection = database.getCollection(CollectionNames.List);

    let users: Array<User> = [];

    if (selectedUsers && selectedUsers.length > 0) {
        try {
            const response = await fetch(`${config.get('authUrl')}/users`, {
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

                ctx.status = 502;
                ctx.body = { error: `Auth service error: ${response.status}` };

                return;
            }

            const data = await response.json();

            console.log('Auth service response:', data);

            if (!data.success) {
                console.error('Auth service returned success: false', data);

                ctx.status = 502;
                ctx.body = { error: 'Auth service returned error', details: data.message };

                return;
            }

            users = data.users || [];

            if (!users || users.length === 0) {
                console.warn('No users found for usernames:', selectedUsers);

                ctx.status = 400;
                ctx.body = { error: 'No users found for the provided usernames' };

                return;
            }

            console.log(`Successfully fetched ${users.length} users`);
        } catch (error) {
            console.error('Error fetching users from auth service:', error);

            ctx.status = 502;
            ctx.body = { error: 'Failed to fetch users from auth service' };

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

    ctx.status = 200;
    ctx.body = result;
};

export default addList;
