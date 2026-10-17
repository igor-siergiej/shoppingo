/**
 * JWT-shaped token helpers shared by:
 *   - the mock kivo HTTP server (scripts/mock-kivo/index.ts)
 *   - the e2e suite (e2e/mocks/auth.ts)
 *   - the load-test runner (scripts/load/mock-kivo.ts)
 *
 * Format: `b64u(header).b64u(payload).b64u(signature)`. The payload carries
 * the minimum claims (`id`, `username`, `exp`, `iat`) the API verifier
 * pulls out. The signature is ignored — these tokens must never reach a
 * real kivo or any deployment that expects a signed JWT.
 */

export interface MockTokenClaims {
    id: string;
    username: string;
    exp: number;
    iat: number;
}

const b64u = (input: object | string): string =>
    Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
        .toString('base64')
        .replace(/=+$/, '');

/** Mint a JWT-shaped access token for the given user. */
export const tokenFor = (user: { id: string; username: string }, issuedAtSeconds = 1_700_000_000): string =>
    [
        b64u({ alg: 'HS256', typ: 'JWT' }),
        b64u({
            id: user.id,
            username: user.username,
            iat: issuedAtSeconds,
            exp: 9_999_999_999,
        }),
        b64u('mock-signature'),
    ].join('.');

/** Pull the claims out of a JWT-shaped token in an `Authorization: Bearer ...` header. */
export const decodeClaims = (authorization: string | null | undefined): Partial<MockTokenClaims> => {
    const payload = authorization?.split('.')[1];
    if (!payload) return {};
    try {
        // base64url and base64 share the same charset once the trailing padding is dropped.
        const claims = JSON.parse(Buffer.from(payload, 'base64').toString()) as MockTokenClaims;
        return claims;
    } catch {
        return {};
    }
};

/** Mint a refreshed access token (issued-at = now). Same shape as `tokenFor`. */
export const refreshTokenFor = (user: { id: string; username: string }): string =>
    tokenFor(user, Math.floor(Date.now() / 1000));
