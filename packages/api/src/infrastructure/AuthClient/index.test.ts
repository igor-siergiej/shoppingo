import { beforeEach, describe, expect, it } from 'bun:test';
import type { User } from '@shoppingo/types';

import '../../test-setup';
import { HttpAuthClient } from './index';

class MockConfig {
    configValues: Record<string, any> = {
        authUrl: 'http://auth-service.com',
    };

    get(key: string) {
        return this.configValues[key];
    }

    set(key: string, value: any) {
        this.configValues[key] = value;
    }

    reset() {
        this.configValues = {
            authUrl: 'http://auth-service.com',
        };
    }
}

class MockFetch {
    calls: Array<Array<any>> = [];
    response: any = {
        ok: true,
        json: async () => ({ success: true, users: [] }),
        text: async () => '',
    };

    rejectedError: Error | null = null;

    async fn(...args: any[]) {
        this.calls.push(args);
        if (this.rejectedError) {
            throw this.rejectedError;
        }
        return this.response;
    }

    mockResolvedValue(value: any) {
        this.response = value;
        this.rejectedError = null;
    }

    mockRejectedValue(error: Error) {
        this.rejectedError = error;
    }

    reset() {
        this.calls = [];
        this.response = {
            ok: true,
            json: async () => ({ success: true, users: [] }),
            text: async () => '',
        };
        this.rejectedError = null;
    }
}

const mockConfig = new MockConfig();
const mockFetch = new MockFetch();

// Mock global fetch
const _originalFetch = global.fetch;
global.fetch = mockFetch.fn.bind(mockFetch) as any;

describe('HttpAuthClient', () => {
    let authClient: HttpAuthClient;

    beforeEach(() => {
        mockConfig.reset();
        mockFetch.reset();
        authClient = new HttpAuthClient(mockConfig as any);
    });

    describe('getUsersByUsernames', () => {
        it('should return users when API call succeeds', async () => {
            const mockUsers: Array<User> = [
                { id: 'user-1', username: 'testuser1' },
                { id: 'user-2', username: 'testuser2' },
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    users: mockUsers,
                }),
            });

            const result = await authClient.getUsersByUsernames(['testuser1', 'testuser2']);

            expect(mockFetch.calls[0][0]).toBe('http://auth-service.com/users');
            expect(mockFetch.calls[0][1]).toEqual({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usernames: ['testuser1', 'testuser2'] }),
            });
            expect(result).toEqual(mockUsers);
        });

        it('should throw error when no users found', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    users: [],
                }),
            });

            await expect(authClient.getUsersByUsernames([])).rejects.toMatchObject({
                message: 'No users found for the provided usernames',
                status: 400,
            });

            expect(mockFetch.calls[0][0]).toBe('http://auth-service.com/users');
            expect(mockFetch.calls[0][1]).toEqual({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usernames: [] }),
            });
        });

        it('should throw error when API call fails', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: async () => 'Internal Server Error',
            });

            await expect(authClient.getUsersByUsernames(['testuser'])).rejects.toMatchObject({
                message: 'Auth service error: 500 - Internal Server Error',
                status: 502,
            });
        });

        it('should throw error when fetch throws', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(authClient.getUsersByUsernames(['testuser'])).rejects.toThrow('Network error');
        });

        it('should handle malformed JSON response', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => {
                    throw new Error('Invalid JSON');
                },
            });

            await expect(authClient.getUsersByUsernames(['testuser'])).rejects.toThrow('Invalid JSON');
        });

        it('should work without logger', async () => {
            const clientWithoutLogger = new HttpAuthClient(mockConfig as any);
            const mockUsers: Array<User> = [{ id: 'user-1', username: 'testuser' }];

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    users: mockUsers,
                }),
            });

            const result = await clientWithoutLogger.getUsersByUsernames(['testuser']);

            expect(result).toEqual(mockUsers);
        });
    });
});
