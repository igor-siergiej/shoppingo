import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HamburgerMenu } from './index';

// Mock the useTheme hook
vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
        toggleTheme: vi.fn(),
    }),
}));

// Mock the usePWA hook
vi.mock('../../../hooks/usePWA', () => ({
    usePWA: () => ({
        canInstall: false,
        isInstalled: false,
        installApp: vi.fn(),
    }),
}));

describe('HamburgerMenu', () => {
    const mockOnManageUsers = vi.fn();
    const mockOnClose = vi.fn();
    const mockOnLogout = vi.fn();

    beforeEach(() => {
        mockOnManageUsers.mockClear();
        mockOnClose.mockClear();
        mockOnLogout.mockClear();
    });

    it('renders logout button', () => {
        render(
            <HamburgerMenu
                currentList={undefined}
                userId="user-123"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        expect(screen.getByText('Log out')).toBeInTheDocument();
    });

    it('renders dark mode toggle', () => {
        render(
            <HamburgerMenu
                currentList={undefined}
                userId="user-123"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        expect(screen.getByText(/dark mode|light mode/i)).toBeInTheDocument();
    });

    it('shows manage users button when user is list owner', () => {
        render(
            <HamburgerMenu
                currentList={{
                    title: 'Test List',
                    ownerId: 'user-123',
                }}
                userId="user-123"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });

    it('hides manage users button when user is not list owner', () => {
        render(
            <HamburgerMenu
                currentList={{
                    title: 'Test List',
                    ownerId: 'owner-123',
                }}
                userId="user-456"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
    });

    it('hides manage users button when there is no current list', () => {
        render(
            <HamburgerMenu
                currentList={undefined}
                userId="user-123"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
    });

    it('calls onManageUsers when manage users button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <HamburgerMenu
                currentList={{
                    title: 'Test List',
                    ownerId: 'user-123',
                }}
                userId="user-123"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        const manageButton = screen.getByText('Manage Users');
        await user.click(manageButton);

        expect(mockOnManageUsers).toHaveBeenCalled();
    });

    it('calls onLogout when logout button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <HamburgerMenu
                currentList={undefined}
                userId="user-123"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        const logoutButton = screen.getByText('Log out');
        await user.click(logoutButton);

        expect(mockOnLogout).toHaveBeenCalled();
    });

    it('has proper button variants', () => {
        render(
            <HamburgerMenu
                currentList={undefined}
                userId="user-123"
                onManageUsers={mockOnManageUsers}
                onClose={mockOnClose}
                onLogout={mockOnLogout}
            />
        );

        const logoutButton = screen.getByText('Log out').closest('button');
        expect(logoutButton).toHaveClass('destructive');
    });
});
