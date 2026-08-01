import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './index';

const mockFetch = (impl: () => Promise<Response>) => {
    vi.stubGlobal('fetch', vi.fn(impl));
};

describe('loadConfig', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves with fetched config and caches it for offline use', async () => {
        mockFetch(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ AUTH_URL: 'https://auth.example.com' }),
            } as Response)
        );

        const config = await loadConfig();

        expect(config).toEqual({ AUTH_URL: 'https://auth.example.com' });
        expect(localStorage.getItem('shoppingo:config')).toContain('https://auth.example.com');
    });

    it('falls back to the cached config when offline instead of throwing', async () => {
        localStorage.setItem('shoppingo:config', JSON.stringify({ AUTH_URL: 'https://cached.example.com' }));
        mockFetch(() => Promise.reject(new Error('network error')));

        const config = await loadConfig();

        expect(config).toEqual({ AUTH_URL: 'https://cached.example.com' });
    });

    it('throws when the fetch fails and there is no cached config', async () => {
        mockFetch(() => Promise.reject(new Error('network error')));

        await expect(loadConfig()).rejects.toThrow('Configuration failed to load');
    });
});
