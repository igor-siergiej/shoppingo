/**
 * Token helpers shared between the load-test mock (scripts/load/mock-kivo.ts),
 * the e2e global setup (e2e/global-setup.ts), and any runtime mock that wants
 * to issue the same JWT-shaped unsigned tokens the API verifier accepts.
 *
 * Format: `b64u(header).b64u(payload).b64u(signature)`. Payload carries the
 * minimal claims (`id`, `username`, `exp`, `iat`) the verifier pulls out. The
 * signature is ignored — these tokens must never reach a real kivo or any
 * deployment that expects a signed JWT.
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

export const decodeClaims = (authorization: string | null | undefined): Partial<MockTokenClaims> => {
    const payload = authorization?.split('.')[1];
    if (!payload) return {};
    try {
        // The mock's tokens are base64 (not base64url); Buffer tolerates both
        // because the charset is the same once the trailing padding is dropped.
        const json = Buffer.from(payload, 'base64').toString();
        const claims = JSON.parse(json) as MockTokenClaims;
        return claims;
    } catch {
        return {};
    }
};

/** Mint a refreshed access token for an existing user. Same shape as `tokenFor`. */
export const refreshTokenFor = (user: { id: string; username: string }): string =>
    tokenFor(user, Math.floor(Date.now() / 1000));
