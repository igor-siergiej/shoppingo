/**
 * AUTH_URL validator used by the API's ConfigService.
 *
 * The bearer token must never cross plaintext to a remote host, so anything
 * that is not https:// is rejected — except:
 *   - `http://kivo:port`, which is the docker service name on the self-host
 *     internal network (allowed in any environment);
 *   - `http://localhost`, which is the dev:local self-hosted mock or the
 *     Playwright e2e mock (gated to non-production environments).
 *
 * Exported separately from `index.ts` so the validator can be unit-tested
 * without booting the full ConfigService (which needs PORT, CONNECTION_URI
 * and other env vars at import time).
 */
// fallow-ignore-next-line complexity
export const httpsUrl = (value: string) => {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`AUTH_URL is not a valid URL: '${value}'`);
    }
    if (url.protocol === 'https:') return url.toString().replace(/\/$/, '');
    const isProduction = process.env.NODE_ENV === 'production';
    if (url.hostname === 'kivo' && url.protocol === 'http:') {
        return url.toString().replace(/\/$/, '');
    }
    if (url.hostname === 'localhost' && url.protocol === 'http:' && !isProduction) {
        return url.toString().replace(/\/$/, '');
    }
    throw new Error(
        `AUTH_URL must use https:// (or http://kivo in docker, or http://localhost outside production), got '${url.protocol}//${url.host}'`
    );
};
