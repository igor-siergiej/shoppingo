// Module-level in-memory store for the kivo access token. The AuthContext (from @imapps/web-utils)
// writes here via a small wrapper we install at app boot, and non-component helpers (axios/fetch
// header factories, the logger) read from here. Keeping the token out of localStorage / sessionStorage
// means an XSS payload running in the same origin cannot exfiltrate it via window.localStorage —
// there is nothing in DOM storage to find. Page reloads lose the in-memory value, which is by
// design: the next render triggers the web-utils useTokenInitialization to refresh from the
// HttpOnly refresh cookie.

let currentAccessToken: string | null = null;

export const getAccessToken = (): string | null => currentAccessToken;

export const setAccessToken = (token: string | null): void => {
    currentAccessToken = token;
};
