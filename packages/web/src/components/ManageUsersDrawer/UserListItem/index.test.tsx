import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserListItem } from './index';

describe('UserListItem', () => {
    const mockUser = {
        id: 'user1',
        username: 'alice',
    };

    const mockCallbacks = {
        onRemoveClick: vi.fn(),
        onRemoveConfirm: vi.fn(),
        onRemoveCancel: vi.fn(),
    };

    beforeEach(() => {
        Object.values(mockCallbacks).forEach((fn) => void fn.mockClear());
    });

    it('displays username', () => {
        render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={false}
                {...mockCallbacks}
            />
        );

        expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('shows "Owner" badge with Crown icon when isOwner=true', () => {
        render(
            <UserListItem
                user={mockUser}
                isOwner={true}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={false}
                {...mockCallbacks}
            />
        );

        expect(screen.getByText('Owner')).toBeInTheDocument();
    });

    it('does not show remove button when isOwner=true', () => {
        const { container } = render(
            <UserListItem
                user={mockUser}
                isOwner={true}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={false}
                {...mockCallbacks}
            />
        );

        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBe(0);
    });

    it('shows remove (X) button when isOwner=false and user.id !== currentUserId', () => {
        render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={false}
                {...mockCallbacks}
            />
        );

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(1);
    });

    it('does not show remove button when user.id === currentUserId', () => {
        const { container } = render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user1"
                isRemoving={false}
                isConfirming={false}
                {...mockCallbacks}
            />
        );

        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBe(0);
    });

    it('calls onRemoveClick when clicking X button', async () => {
        const user = userEvent.setup();
        render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={false}
                {...mockCallbacks}
            />
        );

        const removeButton = screen.getByRole('button');
        await user.click(removeButton);

        expect(mockCallbacks.onRemoveClick).toHaveBeenCalledOnce();
    });

    it('shows Cancel and Remove confirmation buttons when isConfirming=true', () => {
        render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={true}
                {...mockCallbacks}
            />
        );

        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('shows spinner in Remove button when isRemoving=true during confirm', () => {
        const { container } = render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={true}
                isConfirming={true}
                {...mockCallbacks}
            />
        );

        const spinner = container.querySelector('svg');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('animate-spin');
    });

    it('disables buttons when isRemoving=true', () => {
        const { container } = render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={true}
                isConfirming={true}
                {...mockCallbacks}
            />
        );

        const buttons = container.querySelectorAll('button');
        buttons.forEach((btn) => {
            expect(btn).toBeDisabled();
        });
    });

    it('calls onRemoveCancel when clicking Cancel in confirm state', async () => {
        const user = userEvent.setup();
        render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={true}
                {...mockCallbacks}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        expect(mockCallbacks.onRemoveCancel).toHaveBeenCalledOnce();
    });

    it('calls onRemoveConfirm when clicking Remove in confirm state', async () => {
        const user = userEvent.setup();
        render(
            <UserListItem
                user={mockUser}
                isOwner={false}
                currentUserId="user2"
                isRemoving={false}
                isConfirming={true}
                {...mockCallbacks}
            />
        );

        const removeButton = screen.getByRole('button', { name: /remove/i });
        await user.click(removeButton);

        expect(mockCallbacks.onRemoveConfirm).toHaveBeenCalledOnce();
    });
});
