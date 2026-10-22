/**
 * Thin Umami tracker wrapper. Reads `analytics.{host,websiteId,enabled}` from
 * the runtime config (served at /config.json) and lazily injects the tracker
 * script `<host>/p.js` on first use (the Umami instance must set
 * `TRACKER_SCRIPT_NAME=p.js`). If `enabled` is false, the host is missing, or
 * `window.umami` hasn't loaded yet, every method is a no-op — callers can
 * fire events without sprinkling null checks. Events fired before the script
 * loads, or while offline, are dropped, not queued.
 *
 * Umami v3 script global API: `umami.track(event, data)`,
 * `umami.identify(id)`, `umami.startSessionReplay()`. The tracker only
 * installs `window.umami` if nothing else has, so this module must never
 * define it. The tracker also records page views itself (it patches
 * history.pushState), so `loadTracker()` only makes sure the script is loaded.
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
    // Never pre-define window.umami: the tracker skips installing its API when
    // the global already exists, which would silently drop every event.
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
 * Loads the tracker once the runtime config is in. Umami itself records the
 * initial view and every later history.pushState as a page view, so this
 * sends nothing of its own.
 */
export const loadTracker = (): void => {
    ensureInjected();
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
