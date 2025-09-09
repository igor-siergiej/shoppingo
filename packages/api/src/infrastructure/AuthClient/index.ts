import { User } from '@shoppingo/types';

import { config } from '../../config';
import { AuthClient } from '../../domain/ListService';

export class HttpAuthClient implements AuthClient {
    async getUsersByUsernames(usernames: Array<string>): Promise<Array<User>> {
        const authUrl = config.get('authUrl');

        if (!authUrl) {
            throw Object.assign(new Error('Auth service not configured'), { status: 502 });
        }

        const response = await fetch(`${authUrl}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usernames })
        });

        if (!response.ok) {
            const errorText = await response.text();

            console.error('Auth service error response:', errorText);
            throw Object.assign(new Error(`Auth service error: ${response.status}`), { status: 502 });
        }

        const data = await response.json();

        console.log('Auth service response:', data);

        if (!data.success) {
            console.error('Auth service returned success: false', data);
            throw Object.assign(new Error('Auth service returned error'), {
                status: 502,
                details: data.message
            });
        }

        const users = data.users || [];

        if (!users || users.length === 0) {
            console.warn('No users found for usernames:', usernames);
            throw Object.assign(new Error('No users found for the provided usernames'), { status: 400 });
        }

        console.log(`Successfully fetched ${users.length} users`);

        return users;
    }
}
