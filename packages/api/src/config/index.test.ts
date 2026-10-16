import { afterEach, describe, expect, it } from 'bun:test';

import { httpsUrl } from './index';

describe('AUTH_URL validator (httpsUrl)', () => {
    const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

    afterEach(() => {
        if (ORIGINAL_NODE_ENV === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = ORIGINAL_NODE_ENV;
        }
    });

    const withEnv = (nodeEnv: string | undefined, fn: () => void) => {
        if (nodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = nodeEnv;
        }
        fn();
    };

    it('allows https URLs in any environment', () => {
        withEnv('production', () => {
            expect(httpsUrl('https://kivo.example.com')).toBe('https://kivo.example.com');
        });
        withEnv('development', () => {
            expect(httpsUrl('https://kivo.example.com')).toBe('https://kivo.example.com');
        });
        withEnv(undefined, () => {
            expect(httpsUrl('https://kivo.example.com')).toBe('https://kivo.example.com');
        });
    });

    it('allows http://localhost outside production', () => {
        withEnv('development', () => {
            expect(httpsUrl('http://localhost:3099')).toBe('http://localhost:3099');
        });
        withEnv(undefined, () => {
            expect(httpsUrl('http://localhost:3099')).toBe('http://localhost:3099');
        });
    });

    it('rejects http://localhost in production', () => {
        withEnv('production', () => {
            expect(() => httpsUrl('http://localhost:3099')).toThrow(/must use https:\/\/ in production/);
        });
    });

    it('rejects http://kivo in production (docker bridge is not exempt there)', () => {
        withEnv('production', () => {
            expect(() => httpsUrl('http://kivo:3008')).toThrow(/must use https:\/\/ in production/);
        });
    });

    it('allows http://kivo outside production for the selfhost compose', () => {
        withEnv('development', () => {
            expect(httpsUrl('http://kivo:3008')).toBe('http://kivo:3008');
        });
    });

    it('rejects http against a non-loopback host even outside production', () => {
        withEnv('development', () => {
            expect(() => httpsUrl('http://kivo.example.com')).toThrow(/https:\/\//);
        });
    });

    it('accepts http://127.0.0.1 outside production (loopback check)', () => {
        withEnv('development', () => {
            expect(httpsUrl('http://127.0.0.1:3099')).toBe('http://127.0.0.1:3099');
        });
    });

    it('trims a trailing slash from the accepted URL', () => {
        withEnv('development', () => {
            expect(httpsUrl('http://localhost:3099/')).toBe('http://localhost:3099');
        });
    });

    it('rejects malformed URLs', () => {
        withEnv('development', () => {
            expect(() => httpsUrl('not-a-url')).toThrow(/not a valid URL/);
        });
    });
});
