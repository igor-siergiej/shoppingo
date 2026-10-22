import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { identify, loadTracker, startReplay, stopReplay, track } from './analytics';

// Mock the config module so analytics can resolve getConfig().
const configState = vi.hoisted(() => ({
    value: {} as { analytics?: { host?: string; websiteId?: string; enabled?: boolean } } | null,
}));

vi.mock('./config', () => ({
    getConfig: () => {
        if (!configState.value) throw new Error('Configuration not loaded.');
        return configState.value;
    },
}));

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

    // Must run before any other test injects: the injected flag is module state.
    it('loads the tracker without claiming window.umami, so the real tracker can install itself', () => {
        configState.value = {
            analytics: { host: 'https://app.tandra.uk/pulse/', websiteId: 'site-1' },
        };

        loadTracker();

        const script = document.querySelector<HTMLScriptElement>('script[data-website-id="site-1"]');
        expect(script?.src).toBe('https://app.tandra.uk/pulse/p.js');
        expect(window.umami).toBeUndefined();

        // Umami's tracker only defines its API when window.umami is unset.
        const sent: Array<[string, unknown]> = [];
        window.umami ??= { track: (e, d) => sent.push([e, d]), identify: vi.fn() };
        script?.dispatchEvent(new Event('load'));

        track('item_added', { source: 'typed', count: 1 });
        expect(sent).toEqual([['item_added', { source: 'typed', count: 1 }]]);
    });

    it('forwards events to the loaded tracker', () => {
        configState.value = {
            analytics: { host: 'https://analytics.imapps.uk', websiteId: 'site-1' },
        };
        const calls: Array<[string, unknown]> = [];
        window.umami = { track: (e, d) => calls.push([e, d]), identify: vi.fn() };

        track('item_added', { source: 'typed', count: 1 });
        track('list_cleared');

        expect(calls).toEqual([
            ['item_added', { source: 'typed', count: 1 }],
            ['list_cleared', undefined],
        ]);
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
