import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn();
vi.mock('./client', () => ({ authClient: { signOut: (...args: unknown[]) => signOut(...args) } }));

import { AuthRoot, useAuth } from './index';

const signedIn = () =>
    vi.fn(
        async () => new Response(JSON.stringify({ session: {}, user: { id: 'u1', username: 'igor' } }), { status: 200 })
    );

let logoutFromUi: () => Promise<void> = async () => {};
const Probe = () => {
    const { isAuthenticated, isLoading, logout } = useAuth();
    logoutFromUi = logout;
    return <p>{isLoading ? 'loading' : isAuthenticated ? 'signed in' : 'signed out'}</p>;
};

const launch = () =>
    render(
        <AuthRoot>
            <Probe />
        </AuthRoot>
    );

describe('AuthRoot sign-out', () => {
    beforeEach(() => {
        localStorage.clear();
        signOut.mockReset();
    });
    afterEach(() => vi.unstubAllGlobals());

    it('stays signed out on the next launch when the sign-out never reached the server', async () => {
        const getSession = signedIn();
        vi.stubGlobal('fetch', getSession);
        const first = launch();
        await screen.findByText('signed in');

        signOut.mockRejectedValue(new TypeError('Failed to fetch'));
        await act(() => logoutFromUi());
        expect(screen.getByText('signed out')).toBeInTheDocument();
        first.unmount();

        // Still offline at the next launch: the cookie would sign them back in, so the cookie is not asked.
        getSession.mockClear();
        launch();
        await screen.findByText('signed out');
        expect(getSession).not.toHaveBeenCalled();
    });

    it('finishes the pending sign-out once the server is reachable, then checks the session', async () => {
        localStorage.setItem('shoppingo:sign-out-pending', '1');
        signOut.mockResolvedValue({ data: { success: true }, error: null });
        const getSession = vi.fn(async () => new Response('null', { status: 200 }));
        vi.stubGlobal('fetch', getSession);

        launch();

        await screen.findByText('signed out');
        expect(signOut).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(getSession).toHaveBeenCalledTimes(1));
        expect(localStorage.getItem('shoppingo:sign-out-pending')).toBeNull();
    });
});
