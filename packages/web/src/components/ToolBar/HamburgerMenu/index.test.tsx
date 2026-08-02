import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HamburgerMenu } from './index';

// Mock the useTheme hook
vi.mock('../../../contexts/ThemeContext', () => ({
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

vi.mock('../../../hooks/usePushNotifications', () => ({
    usePushNotifications: () => ({
        isSupported: true,
        permission: 'default',
        isSubscribed: false,
        isBusy: false,
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
    }),
}));

describe('HamburgerMenu', () => {
    const mockOnClose = vi.fn();
    const mockOnLogout = vi.fn();

    beforeEach(() => {
        mockOnClose.mockClear();
        mockOnLogout.mockClear();
    });

    it('renders logout button', () => {
        render(<HamburgerMenu onClose={mockOnClose} onLogout={mockOnLogout} />);

        expect(screen.getByText('Log out')).toBeInTheDocument();
    });

    it('renders dark mode toggle', () => {
        render(<HamburgerMenu onClose={mockOnClose} onLogout={mockOnLogout} />);

        expect(screen.getByText(/dark mode|light mode/i)).toBeInTheDocument();
    });

    it('calls onLogout when logout button is clicked', async () => {
        const user = userEvent.setup();
        render(<HamburgerMenu onClose={mockOnClose} onLogout={mockOnLogout} />);

        const logoutButton = screen.getByText('Log out');
        await user.click(logoutButton);

        expect(mockOnLogout).toHaveBeenCalled();
    });

    it('renders the notifications toggle when push is supported', () => {
        render(<HamburgerMenu onClose={() => {}} onLogout={() => {}} />);
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
    });

    it('has proper button variants', () => {
        render(<HamburgerMenu onClose={mockOnClose} onLogout={mockOnLogout} />);

        const logoutButton = screen.getByText('Log out').closest('button');
        expect(logoutButton).toHaveClass('bg-destructive', 'text-white');
    });
});
