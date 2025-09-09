import { User } from '@shoppingo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpAuthClient } from './index';

vi.mock('../../config', () => ({
    config: {
        get: vi.fn().mockReturnValue('http://auth-service.com')
    }
}));

const mockFetch = vi.fn();

global.fetch = mockFetch;

describe('HttpAuthClient', () => {
    let authClient: HttpAuthClient;

    beforeEach(() => {
        vi.clearAllMocks();
        authClient = new HttpAuthClient();
    });

    describe('getUsersByUsernames', () => {
        it('should return users when API call succeeds', async () => {
            const mockUsers: Array<User> = [
                { id: 'user-1', username: 'testuser1' },
                { id: 'user-2', username: 'testuser2' }
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    users: mockUsers
                })
            });

            const result = await authClient.getUsersByUsernames(['testuser1', 'testuser2']);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://auth-service.com/users',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usernames: ['testuser1', 'testuser2'] })
                }
            );
            expect(result).toEqual(mockUsers);
        });

        it('should throw error when no users found', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    users: []
                })
            });

            await expect(authClient.getUsersByUsernames([]))
                .rejects.toMatchObject({
                    message: 'No users found for the provided usernames',
                    status: 400
                });

            expect(mockFetch).toHaveBeenCalledWith(
                'http://auth-service.com/users',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usernames: [] })
                }
            );
        });

        it('should throw error when API call fails', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: vi.fn().mockResolvedValue('Internal Server Error')
            });

            await expect(authClient.getUsersByUsernames(['testuser']))
                .rejects.toMatchObject({
                    message: 'Auth service error: 500',
                    status: 502
                });
        });

        it('should throw error when fetch throws', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(authClient.getUsersByUsernames(['testuser']))
                .rejects.toThrow('Network error');
        });

        it('should handle malformed JSON response', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
            });

            await expect(authClient.getUsersByUsernames(['testuser']))
                .rejects.toThrow('Invalid JSON');
        });

        it('should work without logger', async () => {
            const clientWithoutLogger = new HttpAuthClient();
            const mockUsers: Array<User> = [{ id: 'user-1', username: 'testuser' }];

            mockFetch.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    users: mockUsers
                })
            });

            const result = await clientWithoutLogger.getUsersByUsernames(['testuser']);

            expect(result).toEqual(mockUsers);
        });
    });
});
