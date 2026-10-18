// Module-level in-memory store for the kivo access token. The AuthContext (from @imapps/web-utils)
// writes here via a small wrapper we install at app boot, and non-component helpers (axios/fetch
// header factories, the logger) read from here. Keeping the token out of localStorage / sessionStorage
// means an XSS payload running in the same origin cannot exfiltrate it via window.localStorage —
// there is nothing in DOM storage to find. Page reloads lose the in-memory value, which is by
// design: the next render triggers the web-utils useTokenInitialization to refresh from the
// HttpOnly refresh cookie.

import { returningUserCookie } from './returningUserCookie';

let currentAccessToken: string | null = null;
let returningUserMarked = false;

export const getAccessToken = (): string | null => currentAccessToken;

// Every sign-in, registration and session refresh lands here, so a stored token is the signal
// that this browser belongs to a returning user. Marked once per page load, so the cookie's
// year-long expiry slides with use.
export const setAccessToken = (token: string | null): void => {
    currentAccessToken = token;
    if (!token || returningUserMarked) return;
    returningUserMarked = true;
    const cookie = returningUserCookie(window.location.hostname);
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing from Firefox.
    if (cookie) document.cookie = cookie;
};
