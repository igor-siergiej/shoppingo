import { Item, List, User } from '@shoppingo/types';

export const mockUser: User = {
    id: 'test-user-1',
    username: 'testuser',
};

export const mockItems: Array<Item> = [
    {
        id: 'item-1',
        name: 'Milk',
        isSelected: false,
        dateAdded: new Date('2024-01-01T10:00:00Z'),
    },
    {
        id: 'item-2',
        name: 'Bread',
        isSelected: true,
        dateAdded: new Date('2024-01-01T10:05:00Z'),
    },
    {
        id: 'item-3',
        name: 'Eggs',
        isSelected: false,
        dateAdded: new Date('2024-01-01T10:10:00Z'),
    },
];

export const mockList: List = {
    id: 'list-1',
    title: 'Grocery List',
    dateAdded: new Date('2024-01-01T09:00:00Z'),
    items: mockItems,
    users: [mockUser],
};

export const mockLists: Array<List> = [
    mockList,
    {
        id: 'list-2',
        title: 'Weekend Shopping',
        dateAdded: new Date('2024-01-02T09:00:00Z'),
        items: [
            {
                id: 'item-4',
                name: 'Coffee',
                isSelected: false,
                dateAdded: new Date('2024-01-02T10:00:00Z'),
            },
        ],
        users: [mockUser],
    },
];

export const mockAuthResponse = {
    token: 'mock-jwt-token',
    user: mockUser,
    message: 'Login successful',
};

export const mockRefreshResponse = {
    accessToken: 'new-mock-jwt-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 3600,
};
