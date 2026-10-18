/**
 * Thin Umami tracker wrapper. Reads `analytics.{host,websiteId,enabled}` from
 * the runtime config (served at /config.json) and lazily injects the tracker
 * script on first use. If `enabled` is false, the host is missing, or
 * `window.umami` hasn't loaded yet, every method is a no-op — callers can
 * fire events without sprinkling null checks.
 *
 * Umami v3 script global API: `umami.track(event, data)`,
 * `umami.identify(id)`, `umami.startSessionReplay()`. The tracker's own
 * script handles page-view (it patches history.pushState on the host page)
 * — so `trackPageView` is a no-op here. We expose `page()` only because
 * some hosts want explicit page views for SPAs without history API.
 */
import { getConfig } from './config';

type EventPayload = Record<string, string | number | boolean | undefined>;

declare global {
    interface Window {
        umami?: {
            track: (event: string, data?: EventPayload) => void;
            identify: (id: string) => void;
            reset?: () => void;
            startSessionReplay?: () => void;
            stopSessionReplay?: () => void;
        };
    }
}

let injected = false;
let injectStarted = false;

const injectScript = (host: string, websiteId: string): void => {
    if (injected || injectStarted) return;
    if (typeof document === 'undefined') return;

    injectStarted = true;
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.dataset.websiteId = websiteId;
    script.src = `${host.replace(/\/$/, '')}/p.js`;

    // Set the Umami host globals before the script loads so the tracker
    // can call back into them with the custom path. See:
    //   https://umami.is/docs/tracker-configuration
    window.umami = window.umami || {
        track: () => {},
        identify: () => {},
    };
    const original = window.umami.track.bind(window.umami);
    window.umami.track = (event, data) => {
        try {
            original(event, data);
        } catch {
            // tracker hasn't hydrated yet — buffer-style ignore
        }
    };

    script.addEventListener('load', () => {
        injected = true;
    });
    document.head.appendChild(script);
};

const isEnabled = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const a = getConfig().analytics;
        if (!a || a.enabled === false) return false;
        if (!a.host || !a.websiteId) return false;
        try {
            const proto = new URL(a.host).protocol;
            return proto === 'http:' || proto === 'https:';
        } catch {
            return false;
        }
    } catch {
        return false;
    }
};

const ensureInjected = (): boolean => {
    if (injected) return true;
    if (!isEnabled()) return false;
    try {
        const a = getConfig().analytics;
        if (!a) return false;
        injectScript(a.host, a.websiteId);
        return true;
    } catch {
        return false;
    }
};

/**
 * Page-view tracking. Umami auto-tracks route changes via its history-API
 * monkey-patch once the script loads; we still expose this so callers can
 * attach a name to the current view (Umami uses `data-umami-event-page`).
 */
export const page = (name?: string): void => {
    if (!ensureInjected()) return;
    if (name && window.umami) {
        window.umami.track('page_view', { name });
    }
};

/**
 * Fire-and-forget event. Safe to call before config is loaded; the
 * wrapper is a no-op until then.
 */
export const track = (event: string, data?: EventPayload): void => {
    if (!ensureInjected()) return;
    window.umami?.track(event, data);
};

// fallow-ignore-next-line unused-export
export const identify = (id: string): void => {
    if (!ensureInjected()) return;
    window.umami?.identify(id);
};

/**
 * Start a session-replay session. Requires the opt-in consent in
 * #73. Sample rate is server-side, not here.
 */
// fallow-ignore-next-line unused-export
export const startReplay = (): void => {
    if (!ensureInjected()) return;
    window.umami?.startSessionReplay?.();
};

// fallow-ignore-next-line unused-export
export const stopReplay = (): void => {
    if (!ensureInjected()) return;
    window.umami?.stopSessionReplay?.();
};
