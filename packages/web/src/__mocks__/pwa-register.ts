import { vi } from 'vitest';

export const useRegisterSW = vi.fn(() => ({
    updateServiceWorker: vi.fn(),
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
}));
