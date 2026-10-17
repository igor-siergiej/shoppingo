import { afterEach, describe, expect, it } from 'bun:test';

import { httpsUrl } from './auth-url';

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

    it('strips a trailing slash from a valid URL', () => {
        expect(httpsUrl('https://kivo.example.com/')).toBe('https://kivo.example.com');
    });

    it('allows http://kivo:port in any environment (docker bridge)', () => {
        withEnv('production', () => {
            expect(httpsUrl('http://kivo:3008')).toBe('http://kivo:3008');
        });
        withEnv('development', () => {
            expect(httpsUrl('http://kivo:3008')).toBe('http://kivo:3008');
        });
    });

    it('allows http://localhost outside production', () => {
        withEnv('development', () => {
            expect(httpsUrl('http://localhost:3099')).toBe('http://localhost:3099');
        });
        withEnv('test', () => {
            expect(httpsUrl('http://localhost:3099')).toBe('http://localhost:3099');
        });
        withEnv(undefined, () => {
            expect(httpsUrl('http://localhost:3099')).toBe('http://localhost:3099');
        });
    });

    it('rejects http://localhost in production', () => {
        withEnv('production', () => {
            expect(() => httpsUrl('http://localhost:3099')).toThrow(/AUTH_URL must use https/);
        });
    });

    it('rejects any other http:// host', () => {
        withEnv('development', () => {
            expect(() => httpsUrl('http://kivo.example.com')).toThrow(/AUTH_URL must use https/);
        });
        withEnv('production', () => {
            expect(() => httpsUrl('http://auth.example.com')).toThrow(/AUTH_URL must use https/);
        });
    });

    it('rejects a non-URL value', () => {
        expect(() => httpsUrl('not-a-url')).toThrow(/not a valid URL/);
    });
});
