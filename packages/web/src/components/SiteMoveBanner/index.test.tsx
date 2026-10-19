import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureSiteMoveMarker } from '../../utils/siteMove';
import SiteMoveBanner from './index';

const pwa = vi.hoisted(() => ({ canInstall: false, isInstalled: false, installApp: vi.fn() }));

vi.mock('../../hooks/usePWA', () => ({ usePWA: () => pwa }));

const arriveAt = (path: string) => {
    window.history.replaceState(null, '', path);
    captureSiteMoveMarker();
};

describe('SiteMoveBanner', () => {
    beforeEach(() => {
        localStorage.clear();
        pwa.canInstall = false;
        pwa.isInstalled = false;
        pwa.installApp.mockReset();
    });

    it('shows after a forward from the old address and strips the marker from the URL', () => {
        arriveAt('/?moved=1&list=Groceries#top');

        render(<SiteMoveBanner />);

        expect(screen.getByTestId('site-move-banner')).toBeInTheDocument();
        expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
            '/?list=Groceries#top'
        );
    });

    it('stays hidden for visitors who were not forwarded', () => {
        arriveAt('/');

        render(<SiteMoveBanner />);

        expect(screen.queryByTestId('site-move-banner')).not.toBeInTheDocument();
    });

    it('keeps showing on later visits until dismissed, then stays gone', async () => {
        arriveAt('/?moved=1');
        const first = render(<SiteMoveBanner />);
        first.unmount();

        arriveAt('/login');
        render(<SiteMoveBanner />);
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(screen.queryByTestId('site-move-banner')).not.toBeInTheDocument();

        arriveAt('/');
        render(<SiteMoveBanner />);
        expect(screen.queryByTestId('site-move-banner')).not.toBeInTheDocument();
    });

    it('is hidden and finished inside an installed window', () => {
        arriveAt('/?moved=1');
        pwa.isInstalled = true;

        render(<SiteMoveBanner />);
        expect(screen.queryByTestId('site-move-banner')).not.toBeInTheDocument();

        pwa.isInstalled = false;
        render(<SiteMoveBanner />);
        expect(screen.queryByTestId('site-move-banner')).not.toBeInTheDocument();
    });

    it('offers the browser install prompt when one is available', async () => {
        arriveAt('/?moved=1');
        pwa.canInstall = true;

        render(<SiteMoveBanner />);
        await userEvent.click(screen.getByRole('button', { name: 'Install app' }));

        expect(pwa.installApp).toHaveBeenCalledOnce();
    });
});
