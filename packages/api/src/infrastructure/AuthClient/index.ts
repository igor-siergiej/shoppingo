import type { User } from '@shoppingo/types';

import { config } from '../../config';
import type { AuthClient } from '../../domain/ListService';

interface ConfigLike {
    get(key: string): any;
}

export class HttpAuthClient implements AuthClient {
    constructor(private configService: ConfigLike = config) {}

    async getUsersByUsernames(usernames: Array<string>): Promise<Array<User>> {
        const authUrl = this.configService.get('authUrl');

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

            throw Object.assign(new Error(`Auth service error: ${response.status} - ${errorText}`), {
                status: 502,
                authServiceError: true,
            });
        }

        const data = await response.json();

        if (!data.success) {
            throw Object.assign(new Error('Auth service returned error'), {
                status: 502,
                details: data.message,
                authServiceError: true,
            });
        }

        const users = data.users || [];
        const notFoundUsernames = data.notFoundUsernames || [];

        if (notFoundUsernames.length > 0) {
            throw Object.assign(new Error(`Users not found: ${notFoundUsernames.join(', ')}`), {
                status: 400,
                notFoundUsernames,
                usersNotFound: true,
            });
        }

        if (!users || users.length === 0) {
            throw Object.assign(new Error('No users found for the provided usernames'), {
                status: 400,
                usersNotFound: true,
            });
        }

        return users;
    }
}
