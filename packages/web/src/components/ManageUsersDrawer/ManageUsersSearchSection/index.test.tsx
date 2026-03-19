import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageUsersSearchSection } from './index';

describe('ManageUsersSearchSection', () => {
    const mockOnSearchChange = vi.fn();
    const mockOnAddUser = vi.fn();

    const mockAvailableUsers = [
        { id: 'user-1', username: 'alice' },
        { id: 'user-2', username: 'bob' },
    ];

    const defaultProps = {
        searchInput: '',
        onSearchChange: mockOnSearchChange,
        availableUsers: [],
        isSearching: false,
        isAdding: false,
        onAddUser: mockOnAddUser,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders add members label', () => {
        render(<ManageUsersSearchSection {...defaultProps} />);

        expect(screen.getByText('Add Members')).toBeInTheDocument();
    });

    it('renders search input', () => {
        render(<ManageUsersSearchSection {...defaultProps} />);

        expect(screen.getByPlaceholderText('Search for users...')).toBeInTheDocument();
    });

    it('calls onSearchChange when input changes', async () => {
        const user = userEvent.setup();
        render(<ManageUsersSearchSection {...defaultProps} />);

        const input = screen.getByPlaceholderText('Search for users...');
        await user.type(input, 'test');

        expect(mockOnSearchChange).toHaveBeenCalled();
    });

    it('shows available users when search input is not empty', () => {
        render(
            <ManageUsersSearchSection
                {...defaultProps}
                searchInput="a"
                availableUsers={mockAvailableUsers}
            />
        );

        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('hides available users when search input is empty', () => {
        render(
            <ManageUsersSearchSection
                {...defaultProps}
                searchInput=""
                availableUsers={mockAvailableUsers}
            />
        );

        expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });

    it('shows no users found message when available users is empty', () => {
        render(
            <ManageUsersSearchSection
                {...defaultProps}
                searchInput="xyz"
                availableUsers={[]}
            />
        );

        expect(screen.getByText('No users found or already added')).toBeInTheDocument();
    });

    it('shows searching message when isSearching is true and no users found', () => {
        render(
            <ManageUsersSearchSection
                {...defaultProps}
                searchInput="xyz"
                availableUsers={[]}
                isSearching={true}
            />
        );

        expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('calls onAddUser when user button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <ManageUsersSearchSection
                {...defaultProps}
                searchInput="a"
                availableUsers={mockAvailableUsers}
            />
        );

        const addButton = screen.getByRole('button', { name: /alice/i });
        await user.click(addButton);

        expect(mockOnAddUser).toHaveBeenCalledWith('alice');
    });

    it('disables add buttons when isAdding is true', () => {
        render(
            <ManageUsersSearchSection
                {...defaultProps}
                searchInput="a"
                availableUsers={mockAvailableUsers}
                isAdding={true}
            />
        );

        const buttons = screen.getAllByRole('button', { name: /alice|bob/i });
        buttons.forEach((button) => {
            expect(button).toBeDisabled();
        });
    });
});
