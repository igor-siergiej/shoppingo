import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageUsersMembersList } from './index';

const mockOnRemoveClick = vi.fn();
const mockOnRemoveConfirm = vi.fn();
const mockOnRemoveCancel = vi.fn();

vi.mock('../UserListItem', () => ({
    UserListItem: ({ user, onRemoveClick }: any) => (
        <div data-testid={`user-item-${user.id}`}>
            <span>{user.username}</span>
            <button type="button" onClick={onRemoveClick}>
                Remove
            </button>
        </div>
    ),
}));

describe('ManageUsersMembersList', () => {
    const mockUsers = [
        { id: 'user-1', username: 'john' },
        { id: 'user-2', username: 'jane' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders members header with count', () => {
        render(
            <ManageUsersMembersList
                currentUsers={mockUsers}
                ownerId="user-1"
                currentUserId="user-1"
                isRemoving={false}
                confirmRemoveUserId={null}
                onRemoveClick={mockOnRemoveClick}
                onRemoveConfirm={mockOnRemoveConfirm}
                onRemoveCancel={mockOnRemoveCancel}
            />
        );

        expect(screen.getByText('Members (2)')).toBeInTheDocument();
    });

    it('renders all user list items', () => {
        render(
            <ManageUsersMembersList
                currentUsers={mockUsers}
                ownerId="user-1"
                currentUserId="user-1"
                isRemoving={false}
                confirmRemoveUserId={null}
                onRemoveClick={mockOnRemoveClick}
                onRemoveConfirm={mockOnRemoveConfirm}
                onRemoveCancel={mockOnRemoveCancel}
            />
        );

        expect(screen.getByTestId('user-item-user-1')).toBeInTheDocument();
        expect(screen.getByTestId('user-item-user-2')).toBeInTheDocument();
    });

    it('renders empty list when no users', () => {
        render(
            <ManageUsersMembersList
                currentUsers={[]}
                ownerId="user-1"
                currentUserId="user-1"
                isRemoving={false}
                confirmRemoveUserId={null}
                onRemoveClick={mockOnRemoveClick}
                onRemoveConfirm={mockOnRemoveConfirm}
                onRemoveCancel={mockOnRemoveCancel}
            />
        );

        expect(screen.getByText('Members (0)')).toBeInTheDocument();
    });

    it('passes correct props to UserListItem components', () => {
        render(
            <ManageUsersMembersList
                currentUsers={mockUsers}
                ownerId="user-1"
                currentUserId="user-2"
                isRemoving={false}
                confirmRemoveUserId={null}
                onRemoveClick={mockOnRemoveClick}
                onRemoveConfirm={mockOnRemoveConfirm}
                onRemoveCancel={mockOnRemoveCancel}
            />
        );

        expect(screen.getByTestId('user-item-user-1')).toBeInTheDocument();
        expect(screen.getByTestId('user-item-user-2')).toBeInTheDocument();
    });
});
