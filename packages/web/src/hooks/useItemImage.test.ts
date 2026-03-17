import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useItemImage } from './useItemImage';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the auth config
vi.mock('../config/auth', () => ({
    getAuthConfig: () => ({
        accessTokenKey: 'accessToken',
        storageType: 'localStorage',
    }),
}));

// Mock web-utils
vi.mock('@igor-siergiej/web-utils', () => ({
    getStorageItem: vi.fn(() => 'mock-token'),
}));

describe('useItemImage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with null blob URL and no error', () => {
        const { result } = renderHook(() => useItemImage('test-item'));

        expect(result.current.imageBlobUrl).toBeNull();
        expect(result.current.hasImageError).toBe(false);
        expect(result.current.hasLoadedImage).toBe(false);
    });

    it('fetches image on mount with correct item name', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            blob: vi.fn().mockResolvedValueOnce(mockBlob),
        });

        renderHook(() => useItemImage('apple'));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/image/apple'), expect.any(Object));
        });
    });

    it('includes authorization header when token exists', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            blob: vi.fn().mockResolvedValueOnce(mockBlob),
        });

        renderHook(() => useItemImage('test-item'));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: expect.stringContaining('Bearer'),
                    }),
                })
            );
        });
    });

    it('creates object URL from blob response', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            blob: vi.fn().mockResolvedValueOnce(mockBlob),
        });

        const { result } = renderHook(() => useItemImage('test-item'));

        await waitFor(() => {
            expect(result.current.imageBlobUrl).toBeTruthy();
        });
    });

    it('sets error when response is not ok', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const { result } = renderHook(() => useItemImage('nonexistent'));

        await waitFor(() => {
            expect(result.current.hasImageError).toBe(true);
        });
    });

    it('sets error on network failure', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useItemImage('test-item'));

        await waitFor(() => {
            expect(result.current.hasImageError).toBe(true);
        });
    });

    it('provides onImageLoad callback', () => {
        const { result } = renderHook(() => useItemImage('test-item'));

        expect(typeof result.current.onImageLoad).toBe('function');
    });

    it('provides onImageError callback', () => {
        const { result } = renderHook(() => useItemImage('test-item'));

        expect(typeof result.current.onImageError).toBe('function');
    });

    it('cleans up blob URL on unmount', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            blob: vi.fn().mockResolvedValueOnce(mockBlob),
        });

        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

        const { unmount } = renderHook(() => useItemImage('test-item'));

        await waitFor(() => {
            expect(revokeObjectURLSpy).not.toHaveBeenCalled();
        });

        unmount();

        await waitFor(() => {
            expect(revokeObjectURLSpy).toHaveBeenCalled();
        });
    });

    it('refetches when item name changes', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        (global.fetch as any).mockResolvedValue({
            ok: true,
            blob: vi.fn().mockResolvedValue(mockBlob),
        });

        const { rerender } = renderHook(({ name }: { name: string }) => useItemImage(name), {
            initialProps: { name: 'apple' },
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/image/apple'), expect.any(Object));
        });

        rerender({ name: 'banana' });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/image/banana'), expect.any(Object));
        });
    });
});
