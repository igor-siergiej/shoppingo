import { type Item, type ListResponse, ListType } from '@shoppingo/types';
import { MOCK_USER } from './users';

export const makeItem = (overrides?: Partial<Item>): Item => ({
    id: `item-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Test Item',
    isSelected: false,
    dateAdded: new Date('2024-01-01').toISOString() as unknown as Date,
    ...overrides,
});

export const makeList = (overrides?: Partial<ListResponse>): ListResponse => ({
    id: `list-${Math.random().toString(36).slice(2, 9)}`,
    title: 'Test List',
    dateAdded: new Date('2024-01-01').toISOString() as unknown as Date,
    items: [],
    users: [{ id: MOCK_USER.id, username: MOCK_USER.username }],
    listType: ListType.SHOPPING,
    ownerId: MOCK_USER.id,
    ...overrides,
});
