// Redirect the access-token key in DOM storage to an in-memory store. The web-utils
// AuthContext (from `@imapps/web-utils`) reads and writes the access token via window.localStorage
// under a fixed key. Any same-origin XSS can read that key and impersonate the user. To close the
// leak without forking web-utils, we monkey-patch Storage so the access-token key is stored
// in module memory instead, while everything else (theme, unit system, voice preference, cached
// config, etc.) still flows through the real localStorage.
//
// The patch goes on Storage.prototype, not on the localStorage/sessionStorage instances: Firefox ignores
// `localStorage.getItem = fn`, so an instance patch silently did nothing there. The token then landed on disk
// and the in-memory store stayed empty, so anything reading it directly (recipe covers) sent no token.
//
// The patch MUST be imported before the AuthProvider mounts. `index.tsx` does that at the top of
// the file.

import { getAccessToken, setAccessToken } from './accessTokenStore';

const PATCHED_KEYS = new Set<string>(['accessToken']);

const isPatchedKey = (key: string) => PATCHED_KEYS.has(key);

const patchStorage = () => {
    const proto = Storage.prototype;
    const { getItem, setItem, removeItem } = proto;

    proto.getItem = function (this: Storage, key: string) {
        return isPatchedKey(key) ? getAccessToken() : getItem.call(this, key);
    };

    proto.setItem = function (this: Storage, key: string, value: string) {
        if (isPatchedKey(key)) {
            setAccessToken(value);
            return;
        }
        setItem.call(this, key, value);
    };

    proto.removeItem = function (this: Storage, key: string) {
        if (isPatchedKey(key)) {
            setAccessToken(null);
            return;
        }
        removeItem.call(this, key);
    };

    // Builds before this fix stored Firefox users' token in real DOM storage, where it outlives the session.
    for (const key of PATCHED_KEYS) {
        removeItem.call(window.localStorage, key);
        removeItem.call(window.sessionStorage, key);
    }
};

if (typeof window !== 'undefined') {
    patchStorage();
}
