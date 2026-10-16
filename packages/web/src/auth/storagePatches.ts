// Redirect the access-token key in DOM storage to an in-memory store. The web-utils
// AuthContext (from `@imapps/web-utils`) reads and writes the access token via window.localStorage
// under a fixed key. Any same-origin XSS can read that key and impersonate the user. To close the
// leak without forking web-utils, we monkey-patch localStorage so the access-token key is stored
// in module memory instead, while everything else (theme, unit system, voice preference, cached
// config, etc.) still flows through the real localStorage.
//
// The patch MUST be imported before the AuthProvider mounts. `index.tsx` does that at the top of
// the file.

import { getAccessToken, setAccessToken } from './accessTokenStore';

const PATCHED_KEYS = new Set<string>(['accessToken']);

const isPatchedKey = (key: string) => PATCHED_KEYS.has(key);

const patchStorage = (storage: Storage) => {
    const originalGetItem = storage.getItem.bind(storage);
    const originalSetItem = storage.setItem.bind(storage);
    const originalRemoveItem = storage.removeItem.bind(storage);

    storage.getItem = (key: string) => {
        if (isPatchedKey(key)) return getAccessToken();
        return originalGetItem(key);
    };

    storage.setItem = (key: string, value: string) => {
        if (isPatchedKey(key)) {
            setAccessToken(value);
            return;
        }
        originalSetItem(key, value);
    };

    storage.removeItem = (key: string) => {
        if (isPatchedKey(key)) {
            setAccessToken(null);
            return;
        }
        originalRemoveItem(key);
    };
};

if (typeof window !== 'undefined') {
    patchStorage(window.localStorage);
    patchStorage(window.sessionStorage);
}
