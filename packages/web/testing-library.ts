import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterEach, expect, mock } from 'bun:test';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

GlobalRegistrator.register();

expect.extend(matchers);

// Mock matchMedia
if (!window.matchMedia) {
    window.matchMedia = mock.fn((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: mock.fn(),
        removeListener: mock.fn(),
        addEventListener: mock.fn(),
        removeEventListener: mock.fn(),
        dispatchEvent: mock.fn(),
    })) as any;
}

afterEach(() => {
    cleanup();
});
