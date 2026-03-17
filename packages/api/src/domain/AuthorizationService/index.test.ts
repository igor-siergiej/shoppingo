import { describe, it, expect, beforeEach } from 'vitest';
import type { List, User } from '@shoppingo/types';
import { AuthorizationService } from './index';

describe('AuthorizationService', () => {
    let authService: AuthorizationService;

    beforeEach(() => {
        authService = new AuthorizationService();
    });

    describe('isListOwner', () => {
        it('returns true when user is list owner', () => {
            const userId = 'user-123';
            const list: Partial<List> = {
                ownerId: userId,
            };

            expect(authService.isListOwner(list as List, userId)).toBe(true);
        });

        it('returns false when user is not list owner', () => {
            const list: Partial<List> = {
                ownerId: 'owner-123',
            };

            expect(authService.isListOwner(list as List, 'user-456')).toBe(false);
        });

        it('returns false when list has no owner', () => {
            const list: Partial<List> = {};

            expect(authService.isListOwner(list as List, 'user-123')).toBe(false);
        });

        it('returns false when userId is empty', () => {
            const list: Partial<List> = {
                ownerId: 'owner-123',
            };

            expect(authService.isListOwner(list as List, '')).toBe(false);
        });
    });

    describe('canManageUsers', () => {
        it('returns true when user is list owner', () => {
            const userId = 'user-123';
            const list: Partial<List> = {
                ownerId: userId,
            };

            expect(authService.canManageUsers(list as List, userId)).toBe(true);
        });

        it('returns false when user is not list owner', () => {
            const list: Partial<List> = {
                ownerId: 'owner-123',
            };

            expect(authService.canManageUsers(list as List, 'user-456')).toBe(false);
        });

        it('returns false for unauthorized user', () => {
            const list: Partial<List> = {
                ownerId: 'owner-123',
            };

            expect(authService.canManageUsers(list as List, 'intruder')).toBe(false);
        });
    });

    describe('getEffectiveOwnerId', () => {
        it('returns ownerId when it exists', () => {
            const list: Partial<List> = {
                ownerId: 'owner-123',
                users: [
                    { id: 'user-1', username: 'user1' },
                    { id: 'user-2', username: 'user2' },
                ],
            };

            expect(authService.getEffectiveOwnerId(list as List)).toBe('owner-123');
        });

        it('returns first user ID when ownerId is not set', () => {
            const list: Partial<List> = {
                ownerId: undefined,
                users: [
                    { id: 'user-1', username: 'user1' },
                    { id: 'user-2', username: 'user2' },
                ],
            };

            expect(authService.getEffectiveOwnerId(list as List)).toBe('user-1');
        });

        it('returns undefined when list has no owner or users', () => {
            const list: Partial<List> = {
                ownerId: undefined,
                users: [],
            };

            expect(authService.getEffectiveOwnerId(list as List)).toBeUndefined();
        });

        it('returns undefined when list has no users array', () => {
            const list: Partial<List> = {
                ownerId: undefined,
            };

            expect(authService.getEffectiveOwnerId(list as List)).toBeUndefined();
        });

        it('handles backward compatibility correctly', () => {
            const oldList: Partial<List> = {
                users: [
                    { id: 'legacy-owner', username: 'owner' },
                    { id: 'user-2', username: 'user2' },
                ],
            };

            expect(authService.getEffectiveOwnerId(oldList as List)).toBe('legacy-owner');
        });
    });

    describe('multiple lists', () => {
        it('correctly identifies owner across different lists', () => {
            const userId = 'user-123';

            const list1: Partial<List> = { ownerId: userId };
            const list2: Partial<List> = { ownerId: 'other-owner' };

            expect(authService.isListOwner(list1 as List, userId)).toBe(true);
            expect(authService.isListOwner(list2 as List, userId)).toBe(false);
        });

        it('handles permission checks for multiple users', () => {
            const list: Partial<List> = { ownerId: 'owner-id' };

            expect(authService.canManageUsers(list as List, 'owner-id')).toBe(true);
            expect(authService.canManageUsers(list as List, 'user-1')).toBe(false);
            expect(authService.canManageUsers(list as List, 'user-2')).toBe(false);
        });
    });
});
