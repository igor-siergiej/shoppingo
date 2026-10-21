import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the config module so analytics can resolve getConfig().
const configState: {
    value: { analytics?: { host?: string; websiteId?: string; enabled?: boolean } } | null;
} = {
    value: {},
};

vi.mock('./config', () => ({
    getConfig: () => {
        if (!configState.value) throw new Error('Configuration not loaded.');
        return configState.value;
    },
}));

const { page, track, identify, startReplay, stopReplay } = await import('./analytics');

describe('analytics', () => {
    beforeEach(() => {
        configState.value = {};
        delete window.umami;
        document.head.innerHTML = '';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('is a no-op when analytics config is missing', () => {
        configState.value = {};
        expect(() => track('item_added', { source: 'typed' })).not.toThrow();
        expect(document.querySelector('script[data-website-id]')).toBeNull();
    });

    it('is a no-op when analytics.enabled is false', () => {
        configState.value = {
            analytics: { host: 'https://analytics.imapps.uk', websiteId: 'abc', enabled: false },
        };
        track('item_added');
        expect(document.querySelector('script[data-website-id]')).toBeNull();
    });

    it('rejects non-http(s) hosts without injecting the script', () => {
        configState.value = {
            analytics: { host: 'javascript:alert(1)', websiteId: 'abc' },
        };
        track('item_added');
        expect(document.querySelector('script[data-website-id]')).toBeNull();
    });

    it('injects the script once and forwards subsequent events', () => {
        configState.value = {
            analytics: { host: 'https://analytics.imapps.uk', websiteId: 'site-1' },
        };
        const calls: Array<[string, unknown]> = [];
        window.umami = { track: (e, d) => calls.push([e, d]) };

        track('item_added', { source: 'typed', count: 1 });
        track('list_cleared');

        expect(calls).toEqual([
            ['item_added', { source: 'typed', count: 1 }],
            ['list_cleared', undefined],
        ]);
    });

    it('page() routes a name through track()', () => {
        configState.value = {
            analytics: { host: 'https://analytics.imapps.uk', websiteId: 'site-1' },
        };
        const calls: Array<[string, unknown]> = [];
        window.umami = { track: (e, d) => calls.push([e, d]) };

        page('/list/weekly');
        expect(calls[0][0]).toBe('page_view');
    });

    it('identify() forwards to window.umami.identify', () => {
        configState.value = {
            analytics: { host: 'https://analytics.imapps.uk', websiteId: 'site-1' },
        };
        const identifyMock = vi.fn();
        window.umami = { track: vi.fn(), identify: identifyMock };

        identify('user-123');
        expect(identifyMock).toHaveBeenCalledWith('user-123');
    });

    it('startReplay/stopReplay are no-ops when the tracker lacks the methods', () => {
        configState.value = {
            analytics: { host: 'https://analytics.imapps.uk', websiteId: 'site-1' },
        };
        window.umami = { track: vi.fn(), identify: vi.fn() };
        expect(() => startReplay()).not.toThrow();
        expect(() => stopReplay()).not.toThrow();
    });
});
