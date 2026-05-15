import type { User } from '@shoppingo/types';

export const MOCK_USER: User = { id: 'user-testuser', username: 'testuser' };
export const MOCK_USER_2: User = { id: 'user-other', username: 'otheruser' };

export const makeUser = (overrides?: Partial<User>): User => ({
    ...MOCK_USER,
    ...overrides,
});
