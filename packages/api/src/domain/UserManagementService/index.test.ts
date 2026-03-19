import { beforeEach, describe, expect, it } from 'bun:test';
import type { List, User } from '@shoppingo/types';
import { ListType } from '@shoppingo/types';
import { UserManagementService } from './index';

class MockRepository {
    items: Map<string, List> = new Map();

    async getByTitle(title: string): Promise<List | null> {
        return this.items.get(title) || null;
    }

    async replaceByTitle(title: string, list: List): Promise<void> {
        this.items.set(title, list);
    }

    reset() {
        this.items.clear();
    }
}

class MockAuthClient {
    users: Map<string, User> = new Map();
    failedUsernames: Set<string> = new Set();

    async getUsersByUsernames(usernames: string[]): Promise<User[]> {
        const result: User[] = [];
        for (const username of usernames) {
            if (!this.failedUsernames.has(username)) {
                const user = this.users.get(username);
                if (user) {
                    result.push(user);
                }
            }
        }
        return result;
    }

    reset() {
        this.users.clear();
        this.failedUsernames.clear();
    }
}

class MockLogger {
    calls = {
        info: [] as any[],
        error: [] as any[],
    };

    info(...args: any[]) {
        this.calls.info.push(args);
    }

    error(...args: any[]) {
        this.calls.error.push(args);
    }

    reset() {
        this.calls = { info: [], error: [] };
    }
}

const mockRepository = new MockRepository();
const mockAuthClient = new MockAuthClient();
const mockLogger = new MockLogger();

describe('UserManagementService', () => {
    let userManagementService: UserManagementService;
    const owner: User = { id: 'user-1', username: 'owner' };
    const member: User = { id: 'user-2', username: 'member' };
    const nonMember: User = { id: 'user-3', username: 'nonmember' };
    const newUser: User = { id: 'user-4', username: 'newuser' };

    beforeEach(() => {
        mockRepository.reset();
        mockAuthClient.reset();
        mockLogger.reset();
        userManagementService = new UserManagementService(mockRepository, mockAuthClient, mockLogger);

        // Setup auth client with test users
        mockAuthClient.users.set('newuser', newUser);
    });

    describe('addUserToList', () => {
        it('should add user to list when owner requests', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            const result = await userManagementService.addUserToList('Test List', 'newuser', owner.id);

            expect(result.users).toHaveLength(3);
            expect(result.users.some((u) => u.id === newUser.id)).toBe(true);
        });

        it('should throw 403 when non-owner tries to add user', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            try {
                await userManagementService.addUserToList('Test List', 'newuser', member.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('Only the list owner can manage users');
                expect(error.status).toBe(403);
            }
        });

        it('should throw 404 when list not found', async () => {
            try {
                await userManagementService.addUserToList('Nonexistent', 'newuser', owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });

        it('should throw 502 when auth service not configured', async () => {
            const service = new UserManagementService(mockRepository, undefined, mockLogger);
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            try {
                await service.addUserToList('Test List', 'newuser', owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('Auth service not configured');
                expect(error.status).toBe(502);
            }
        });

        it('should throw 400 when user not found', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            try {
                await userManagementService.addUserToList('Test List', 'nonexistentuser', owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toContain('User not found');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 400 when user already in list', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);
            mockAuthClient.users.set('member', member);

            try {
                await userManagementService.addUserToList('Test List', 'member', owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('User is already in this list');
                expect(error.status).toBe(400);
            }
        });

        it('should allow first user (backward compat) to add members', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                // No ownerId - owner is first in array
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            const result = await userManagementService.addUserToList('Test List', 'newuser', owner.id);

            expect(result.users).toHaveLength(3);
        });
    });

    describe('removeUserFromList', () => {
        it('should remove user from list when owner requests', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            const result = await userManagementService.removeUserFromList('Test List', member.id, owner.id);

            expect(result.users).toHaveLength(1);
            expect(result.users[0].id).toBe(owner.id);
        });

        it('should throw 403 when non-owner tries to remove user', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            try {
                await userManagementService.removeUserFromList('Test List', member.id, member.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('Only the list owner can manage users');
                expect(error.status).toBe(403);
            }
        });

        it('should throw 404 when list not found', async () => {
            try {
                await userManagementService.removeUserFromList('Nonexistent', member.id, owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('List not found');
                expect(error.status).toBe(404);
            }
        });

        it('should throw 400 when trying to remove owner', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            try {
                await userManagementService.removeUserFromList('Test List', owner.id, owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('Cannot remove the list owner');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 400 when list has only one user', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            try {
                await userManagementService.removeUserFromList('Test List', owner.id, owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('Cannot remove the list owner');
                expect(error.status).toBe(400);
            }
        });

        it('should throw 400 when user not in list', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            try {
                await userManagementService.removeUserFromList('Test List', nonMember.id, owner.id);
                expect.unreachable();
            } catch (error: any) {
                expect(error.message).toBe('User is not in this list');
                expect(error.status).toBe(400);
            }
        });

        it('should handle backward compat - first user is owner', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                // No ownerId - owner is first
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            const result = await userManagementService.removeUserFromList('Test List', member.id, owner.id);

            expect(result.users).toHaveLength(1);
        });
    });

    describe('logging', () => {
        it('should log when user is added', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            await userManagementService.addUserToList('Test List', 'newuser', owner.id);

            expect(mockLogger.calls.info.length).toBeGreaterThan(0);
        });

        it('should log when user is removed', async () => {
            const list: List = {
                id: 'list-1',
                title: 'Test List',
                dateAdded: new Date(),
                items: [],
                users: [owner, member],
                ownerId: owner.id,
                listType: ListType.SHOPPING,
            };
            await mockRepository.replaceByTitle('Test List', list);

            await userManagementService.removeUserFromList('Test List', member.id, owner.id);

            expect(mockLogger.calls.info.length).toBeGreaterThan(0);
        });
    });
});
