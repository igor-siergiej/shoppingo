import type { User } from '@shoppingo/types';

// Seeded into Better Auth by global-setup with these exact ids (Mongo ObjectIds, like real accounts),
// so specs can reference a user's id without asking the api first.
export const MOCK_USER: User = { id: '6e2e00000000000000000001', username: 'testuser' };
export const MOCK_USER_2: User = { id: '6e2e00000000000000000002', username: 'otheruser' };

export const PASSWORDS: Record<string, string> = {
    testuser: 'password123',
    otheruser: 'password123',
};

export const makeUser = (overrides?: Partial<User>): User => ({
    ...MOCK_USER,
    ...overrides,
});
