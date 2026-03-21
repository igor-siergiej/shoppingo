import { act, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppInitializer from './index';

vi.mock('@imapps/web-utils', () => ({
    useAuth: vi.fn(),
    tryRefreshToken: vi.fn(),
}));

vi.mock('../../config/auth', () => ({
    getAuthConfig: vi.fn().mockReturnValue({}),
}));

import { tryRefreshToken, useAuth } from '@imapps/web-utils';

const mockLogin = vi.fn();
const mockLogout = vi.fn();

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AppInitializer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ login: mockLogin, logout: mockLogout });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders children when initialization is complete', async () => {
        (tryRefreshToken as any).mockResolvedValue('token');

        renderWithRouter(<AppInitializer>Test Content</AppInitializer>);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('shows loading spinner while initializing', () => {
        (tryRefreshToken as any).mockImplementation(() => new Promise(() => {}));

        renderWithRouter(<AppInitializer>Test Content</AppInitializer>);

        expect(document.querySelector('.loader')).toBeInTheDocument();
        expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('does not show timeout message initially', () => {
        (tryRefreshToken as any).mockImplementation(() => new Promise(() => {}));

        renderWithRouter(<AppInitializer>Test Content</AppInitializer>);

        expect(screen.queryByText('Taking longer than expected...')).not.toBeInTheDocument();
    });

    it('shows timeout message after 10 seconds', async () => {
        (tryRefreshToken as any).mockImplementation(() => new Promise(() => {}));

        renderWithRouter(<AppInitializer>Test Content</AppInitializer>);

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(screen.getByText('Taking longer than expected...')).toBeInTheDocument();
    });

    it('shows recovery suggestions when timeout reached', async () => {
        (tryRefreshToken as any).mockImplementation(() => new Promise(() => {}));

        renderWithRouter(<AppInitializer>Test Content</AppInitializer>);

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(screen.getByText('Hard refresh (Ctrl+F5)')).toBeInTheDocument();
        expect(screen.getByText('Clear browser data')).toBeInTheDocument();
        expect(screen.getByText('Reinstall the app')).toBeInTheDocument();
    });

    it('clears timeout when initialization completes', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
        (tryRefreshToken as any).mockResolvedValue('token');

        renderWithRouter(<AppInitializer>Test Content</AppInitializer>);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});
