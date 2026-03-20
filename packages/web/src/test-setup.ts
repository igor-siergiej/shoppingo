import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock PointerEvent - jsdom doesn't have it
if (typeof window !== 'undefined' && !window.PointerEvent) {
    (window as unknown as { PointerEvent: typeof Event }).PointerEvent = class PointerEvent extends Event {
        constructor(
            type: string,
            public options: Record<string, unknown> = {}
        ) {
            super(type);
        }
    };
}

// Mock URL.createObjectURL and revokeObjectURL
if (typeof URL !== 'undefined') {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
