import type { User } from '@shoppingo/types';

import { config } from '../../config';
import type { AuthClient } from '../../domain/ListService';

export class HttpAuthClient implements AuthClient {
    async getUsersByUsernames(usernames: Array<string>): Promise<Array<User>> {
        const authUrl = config.get('authUrl');

        if (!authUrl) {
            throw Object.assign(new Error('Auth service not configured'), {
                status: 502,
            });
        }

        const response = await fetch(`${authUrl}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ usernames }),
        });

        if (!response.ok) {
            const errorText = await response.text();

            console.error('Auth service error response:', errorText);
            throw Object.assign(new Error(`Auth service error: ${response.status}`), {
                status: 502,
                authServiceError: true,
            });
        }

        const data = await response.json();

        console.log('Auth service response:', data);

        if (!data.success) {
            console.error('Auth service returned success: false', data);
            throw Object.assign(new Error('Auth service returned error'), {
                status: 502,
                details: data.message,
                authServiceError: true,
            });
        }

        const users = data.users || [];
        const notFoundUsernames = data.notFoundUsernames || [];

        if (notFoundUsernames.length > 0) {
            console.warn('Some users not found:', notFoundUsernames);
            throw Object.assign(new Error(`Users not found: ${notFoundUsernames.join(', ')}`), {
                status: 400,
                notFoundUsernames,
                usersNotFound: true,
            });
        }

        if (!users || users.length === 0) {
            console.warn('No users found for usernames:', usernames);
            throw Object.assign(new Error('No users found for the provided usernames'), {
                status: 400,
                usersNotFound: true,
            });
        }

        console.log(`Successfully fetched ${users.length} users`);

        return users;
    }
}
