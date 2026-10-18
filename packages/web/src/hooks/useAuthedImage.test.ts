import { tryRefreshToken } from '@imapps/web-utils';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '../auth/accessTokenStore';
import { useAuthedImage } from './useAuthedImage';

vi.mock('../config/auth', () => ({ getAuthConfig: () => ({ authUrl: 'https://auth.test' }) }));
vi.mock('@imapps/web-utils', () => ({ tryRefreshToken: vi.fn() }));

const KEY = 'recipe-upload/u1/r1/1.webp';

// The API answers 200 only for the current token, like the real authenticate middleware after a refresh.
const imageApi = (validToken: string) =>
    vi.fn(async (_url: string, init?: RequestInit) => {
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
        return auth === `Bearer ${validToken}`
            ? new Response(new Blob(['img']), { status: 200 })
            : new Response('{"error":"Invalid or expired token"}', { status: 401 });
    });

describe('useAuthedImage', () => {
    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:cover');
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        setAccessToken(null);
        vi.mocked(tryRefreshToken).mockReset();
    });

    it('refreshes an expired token once and shows the image from the retry', async () => {
        setAccessToken('expired');
        vi.mocked(tryRefreshToken).mockResolvedValue('fresh');
        const fetchMock = imageApi('fresh');
        global.fetch = fetchMock as unknown as typeof fetch;

        const { result } = renderHook(() => useAuthedImage(KEY));

        await waitFor(() => expect(result.current.imageUrl).toBe('blob:cover'));
        expect(result.current.hasError).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(getAccessToken()).toBe('fresh');
    });

    it('shares one refresh between covers that 401 together, since kivo rejects a reused refresh token', async () => {
        setAccessToken('expired');
        vi.mocked(tryRefreshToken).mockResolvedValue('fresh');
        global.fetch = imageApi('fresh') as unknown as typeof fetch;

        const covers = ['a', 'b', 'c'].map((id) => renderHook(() => useAuthedImage(`recipe-upload/u1/${id}/1.webp`)));

        for (const { result } of covers) {
            await waitFor(() => expect(result.current.imageUrl).toBe('blob:cover'));
        }
        expect(tryRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('fails without refreshing when no token was sent', async () => {
        const fetchMock = imageApi('fresh');
        global.fetch = fetchMock as unknown as typeof fetch;

        const { result } = renderHook(() => useAuthedImage(KEY));

        await waitFor(() => expect(result.current.hasError).toBe(true));
        expect(tryRefreshToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('shows the error state when the session cannot be refreshed', async () => {
        setAccessToken('expired');
        vi.mocked(tryRefreshToken).mockResolvedValue(null);
        global.fetch = imageApi('fresh') as unknown as typeof fetch;

        const { result } = renderHook(() => useAuthedImage(KEY));

        await waitFor(() => expect(result.current.hasError).toBe(true));
        expect(result.current.imageUrl).toBeNull();
    });
});
