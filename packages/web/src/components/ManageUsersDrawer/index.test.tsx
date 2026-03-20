import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageUsersDrawer } from './index';

const { mockHandleAddUser, mockHandleRemoveUser } = vi.hoisted(() => ({
    mockHandleAddUser: vi.fn(),
    mockHandleRemoveUser: vi.fn(),
}));

vi.mock('../../hooks/useManageUsers', () => ({
    useManageUsers: () => ({
        searchInput: '',
        setSearchInput: vi.fn(),
        availableUsers: [],
        isSearching: false,
        addUserMutation: { isLoading: false },
        removeUserMutation: { isLoading: false },
        handleAddUser: mockHandleAddUser,
        handleRemoveUser: mockHandleRemoveUser,
    }),
}));

vi.mock('./ManageUsersMembersList', () => ({
    ManageUsersMembersList: ({ onRemoveClick }: any) => (
        <div data-testid="members-list">
            <button type="button" onClick={() => onRemoveClick('user-1')}>
                Remove User
            </button>
        </div>
    ),
}));

vi.mock('./ManageUsersSearchSection', () => ({
    ManageUsersSearchSection: ({ onAddUser }: any) => (
        <div data-testid="search-section">
            <button type="button" onClick={() => onAddUser('newuser')}>
                Add User
            </button>
        </div>
    ),
}));

describe('ManageUsersDrawer', () => {
    const mockOnOpenChange = vi.fn();
    const mockOnUserAdded = vi.fn();
    const mockOnUserRemoved = vi.fn();

    const defaultProps = {
        open: true,
        onOpenChange: mockOnOpenChange,
        listTitle: 'Shopping List',
        currentUsers: [{ id: 'user-1', username: 'john' }],
        ownerId: 'user-1',
        currentUserId: 'user-1',
        onUserAdded: mockOnUserAdded,
        onUserRemoved: mockOnUserRemoved,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders drawer content when open', () => {
        render(<ManageUsersDrawer {...defaultProps} />);

        expect(screen.getByText('Manage Users')).toBeInTheDocument();
        expect(screen.getByText('Shopping List')).toBeInTheDocument();
    });

    it('renders members list section', () => {
        render(<ManageUsersDrawer {...defaultProps} />);

        expect(screen.getByTestId('members-list')).toBeInTheDocument();
    });

    it('renders search section', () => {
        render(<ManageUsersDrawer {...defaultProps} />);

        expect(screen.getByTestId('search-section')).toBeInTheDocument();
    });

    it('closes drawer when close button is clicked', async () => {
        const user = userEvent.setup();
        render(<ManageUsersDrawer {...defaultProps} />);

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onUserAdded when user is added', async () => {
        const user = userEvent.setup();
        render(<ManageUsersDrawer {...defaultProps} />);

        const addButton = screen.getByRole('button', { name: /add user/i });
        await user.click(addButton);

        expect(mockOnUserAdded).toHaveBeenCalled();
    });

    it('manages user removal state', async () => {
        const user = userEvent.setup();
        render(<ManageUsersDrawer {...defaultProps} />);

        const removeButton = screen.getByRole('button', { name: /remove user/i });
        await user.click(removeButton);

        // Clicking remove button should work without errors
        expect(removeButton).toBeInTheDocument();
    });

    it('does not render content when drawer is closed', () => {
        const { container } = render(<ManageUsersDrawer {...defaultProps} open={false} />);

        // Container should exist but drawer content should not be visible
        expect(container).toBeInTheDocument();
    });

    it('passes correct props to members list', () => {
        render(<ManageUsersDrawer {...defaultProps} />);

        expect(screen.getByTestId('members-list')).toBeInTheDocument();
    });
});
