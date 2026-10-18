import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const proto = Storage.prototype;
const real = { getItem: proto.getItem, setItem: proto.setItem, removeItem: proto.removeItem };
const realGet = (storage: Storage, key: string) => real.getItem.call(storage, key);

// Firefox ignores `localStorage.getItem = fn`; these accessors give jsdom the same behaviour, so a patch that only
// assigns to the instances is a no-op here exactly as it is there.
const ignoreInstanceAssignment = (storage: Storage) => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
        Object.defineProperty(storage, method, { configurable: true, get: () => proto[method], set: () => {} });
    }
};

// The patch runs as an import side effect, so each case loads the module fresh after its setup: a static import
// would patch once, before the Firefox emulation or a leaked token is in place.
const loadPatch = async () => {
    vi.resetModules();
    await import('./storagePatches');
    return import('./accessTokenStore');
};

describe('storagePatches', () => {
    beforeEach(() => {
        ignoreInstanceAssignment(window.localStorage);
        ignoreInstanceAssignment(window.sessionStorage);
    });

    afterEach(() => {
        Object.assign(proto, real);
        for (const storage of [window.localStorage, window.sessionStorage]) {
            for (const method of ['getItem', 'setItem', 'removeItem']) Reflect.deleteProperty(storage, method);
            storage.clear();
        }
    });

    it('keeps the access token in memory and out of DOM storage in a browser that ignores instance patches', async () => {
        const { getAccessToken } = await loadPatch();

        window.localStorage.setItem('accessToken', 'jwt');

        expect(getAccessToken()).toBe('jwt');
        expect(window.localStorage.getItem('accessToken')).toBe('jwt');
        expect(realGet(window.localStorage, 'accessToken')).toBeNull();

        window.localStorage.removeItem('accessToken');
        expect(getAccessToken()).toBeNull();
    });

    it('drops an access token an earlier build left in DOM storage', async () => {
        real.setItem.call(window.localStorage, 'accessToken', 'leaked');
        real.setItem.call(window.sessionStorage, 'accessToken', 'leaked');

        await loadPatch();

        expect(realGet(window.localStorage, 'accessToken')).toBeNull();
        expect(realGet(window.sessionStorage, 'accessToken')).toBeNull();
    });

    it('stores every other key in real DOM storage', async () => {
        await loadPatch();

        window.localStorage.setItem('theme', 'dark');

        expect(realGet(window.localStorage, 'theme')).toBe('dark');
    });
});
