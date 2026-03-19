import { afterEach, expect, mock } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

GlobalRegistrator.register();

expect.extend(matchers);

// Mock matchMedia
if (!window.matchMedia) {
    window.matchMedia = ((query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: mock.fn(),
        removeListener: mock.fn(),
        addEventListener: mock.fn(),
        removeEventListener: mock.fn(),
        dispatchEvent: mock.fn(),
    })) as unknown as (query: string) => MediaQueryList;
}

afterEach(() => {
    cleanup();
});
