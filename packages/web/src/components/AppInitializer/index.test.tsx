import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppInitializer from './index';

vi.mock('@imapps/web-utils', () => ({
    useTokenInitialization: vi.fn(),
}));

import { useTokenInitialization } from '@imapps/web-utils';

describe('AppInitializer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders children when initialization is complete', () => {
        (useTokenInitialization as any).mockReturnValue({ isInitializing: false });

        render(<AppInitializer>Test Content</AppInitializer>);

        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('shows loading spinner while initializing', () => {
        (useTokenInitialization as any).mockReturnValue({ isInitializing: true });

        render(<AppInitializer>Test Content</AppInitializer>);

        expect(screen.getByText('Loading Shoppingo...')).toBeInTheDocument();
        expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('does not show timeout message initially', () => {
        (useTokenInitialization as any).mockReturnValue({ isInitializing: true });

        render(<AppInitializer>Test Content</AppInitializer>);

        expect(screen.queryByText('Taking longer than expected...')).not.toBeInTheDocument();
    });

    it('shows timeout message after 10 seconds', async () => {
        (useTokenInitialization as any).mockReturnValue({ isInitializing: true });

        render(<AppInitializer>Test Content</AppInitializer>);

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(screen.getByText('Taking longer than expected...')).toBeInTheDocument();
    });

    it('shows recovery suggestions when timeout reached', async () => {
        (useTokenInitialization as any).mockReturnValue({ isInitializing: true });

        render(<AppInitializer>Test Content</AppInitializer>);

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(screen.getByText('Hard refresh (Ctrl+F5)')).toBeInTheDocument();
        expect(screen.getByText('Clear browser data')).toBeInTheDocument();
        expect(screen.getByText('Reinstall the app')).toBeInTheDocument();
    });

    it('clears timeout when initialization completes', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
        (useTokenInitialization as any).mockReturnValue({ isInitializing: true });

        const { rerender } = render(<AppInitializer>Test Content</AppInitializer>);

        (useTokenInitialization as any).mockReturnValue({ isInitializing: false });
        await act(async () => {
            rerender(<AppInitializer>Test Content</AppInitializer>);
        });

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});
