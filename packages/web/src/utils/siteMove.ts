// Shoppingo moved from shoppingo.imapps.uk (now the landing site) to shoppingo-app.imapps.uk.
// Installed copies of the old PWA still open the old address; the landing site forwards those
// users here with `?moved=1` (shoppingo-site infra/cloudfront.tf and src/pages/index.astro).
// The marker is moved into localStorage so SiteMoveBanner can keep asking them to reinstall
// until they dismiss it or install the app from this address.

const MARKER_PARAM = 'moved';
const PENDING_KEY = 'shoppingo:site-move-pending';
// Per window: set when this window was opened through the forward, i.e. by the old install.
const FORWARDED_KEY = 'shoppingo:site-move-forwarded';

/**
 * Runs before the router is created: the forwarded URL is `/?moved=1`, and the auth redirect to
 * `/login` would drop the query before any component could read it. Strips the marker so it
 * never shows up in shared or bookmarked URLs.
 */
export const captureSiteMoveMarker = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(MARKER_PARAM)) return;

    url.searchParams.delete(MARKER_PARAM);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

    try {
        localStorage.setItem(PENDING_KEY, '1');
        sessionStorage.setItem(FORWARDED_KEY, '1');
    } catch {
        // Storage blocked: the banner can't be remembered, so it isn't shown.
    }
};

/**
 * True when this window was opened through the forward from the old address. The old install
 * shows this address out of its scope in an app window, which reports `display-mode: standalone`
 * just like a new install does; the new install opens this address directly and never has it.
 */
export const wasForwardedFromOldAddress = () => {
    try {
        return sessionStorage.getItem(FORWARDED_KEY) === '1';
    } catch {
        return false;
    }
};

export const isSiteMovePending = () => {
    try {
        return localStorage.getItem(PENDING_KEY) === '1';
    } catch {
        return false;
    }
};

export const clearSiteMovePending = () => {
    try {
        localStorage.removeItem(PENDING_KEY);
    } catch {
        // Storage blocked: nothing was stored.
    }
};
