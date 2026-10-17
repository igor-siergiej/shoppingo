import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';

import type { MockKivoServer } from './index';
import { startMockKivo } from './index';
import { decodeClaims, tokenFor } from './tokens';

let mock: MockKivoServer;
let productionEnv: string | undefined;

beforeAll(() => {
    mock = startMockKivo();
});

afterAll(() => {
    mock.close();
});

const fetchUrl = (path: string, init: RequestInit = {}) => fetch(`${mock.url}${path}`, init);

describe('mock-kivo tokens', () => {
    it('mints a JWT-shaped token whose payload decodes back to the claims', () => {
        const token = tokenFor({ id: 'user-1', username: 'alice' });
        const claims = decodeClaims(`Bearer ${token}`);
        expect(claims.id).toBe('user-1');
        expect(claims.username).toBe('alice');
    });

    it('returns empty object for malformed authorization headers', () => {
        expect(decodeClaims(null).id).toBeUndefined();
        expect(decodeClaims('').id).toBeUndefined();
        expect(decodeClaims('not-a-jwt').id).toBeUndefined();
    });
});

describe('mock-kivo routes', () => {
    it('verifies a token issued by the same mock', async () => {
        const token = tokenFor({ id: 'user-testuser', username: 'testuser' });
        const res = await fetchUrl('/verify', { headers: { authorization: `Bearer ${token}` } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { success: boolean; payload: { id: string; username: string } };
        expect(body.success).toBe(true);
        expect(body.payload.id).toBe('user-testuser');
    });

    it('refuses verification when the token has no claims', async () => {
        const res = await fetchUrl('/verify', { headers: { authorization: 'Bearer garbage' } });
        expect(res.status).toBe(401);
    });

    it('logs a seed user in via /login and issues the same shape the API expects', async () => {
        const res = await fetchUrl('/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', password: 'testpassword' }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { success: boolean; token: string; user: { id: string } };
        expect(body.success).toBe(true);
        expect(body.token.split('.').length).toBe(3);
        expect(body.user.id).toBe('user-testuser');
    });

    it('registers a new user and lets them log in', async () => {
        const username = `alice-${Date.now()}`;
        const register = await fetchUrl('/register', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username, password: 'wonderland' }),
        });
        expect(register.status).toBe(201);
        const registered = (await register.json()) as {
            accessToken: string;
            user: { id: string; username: string };
        };
        expect(registered.user.username).toBe(username);

        const login = await fetchUrl('/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username, password: 'wonderland' }),
        });
        expect(login.status).toBe(200);
    });

    it('refuses to reuse a username', async () => {
        const username = `bob-${Date.now()}`;
        const first = await fetchUrl('/register', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username, password: 'builder' }),
        });
        expect(first.status).toBe(201);
        const second = await fetchUrl('/register', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username, password: 'builder' }),
        });
        expect(second.status).toBe(409);
    });

    it('refreshes an existing access token', async () => {
        const token = tokenFor({ id: 'user-testuser', username: 'testuser' });
        const res = await fetchUrl('/refresh', {
            method: 'POST',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { accessToken: string };
        expect(body.accessToken.split('.').length).toBe(3);
    });

    it('rejects /users without the matching X-Service-Token when one is configured', async () => {
        const isolated = startMockKivo({ port: 0, serviceToken: 'secret' });
        try {
            const token = tokenFor({ id: 'user-testuser', username: 'testuser' });
            const denied = await fetch(`${isolated.url}/users`, {
                method: 'POST',
                headers: { authorization: `Bearer ${token}` },
            });
            expect(denied.status).toBe(401);
            const allowed = await fetch(`${isolated.url}/users`, {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'x-service-token': 'secret' },
            });
            expect(allowed.status).toBe(200);
        } finally {
            isolated.close();
        }
    });

    it('accepts /users with the correct X-Service-Token', async () => {
        const isolated = startMockKivo({ port: 0, serviceToken: 'secret' });
        try {
            const token = tokenFor({ id: 'user-testuser', username: 'testuser' });
            const res = await fetch(`${isolated.url}/users`, {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'x-service-token': 'secret' },
            });
            const body = (await res.json()) as { users: Array<{ id: string }> };
            expect(res.status).toBe(200);
            expect(body.users[0].id).toBe('user-testuser');
        } finally {
            isolated.close();
        }
    });

    it('searches registered users by username', async () => {
        const res = await fetchUrl('/search?q=test');
        const body = (await res.json()) as { usernames: string[]; count: number };
        expect(body.usernames).toContain('testuser');
        expect(body.count).toBeGreaterThan(0);
    });

    it('responds to /health', async () => {
        const res = await fetchUrl('/health');
        expect(res.status).toBe(200);
        const body = (await res.json()) as { success: boolean };
        expect(body.success).toBe(true);
    });
});

describe('mock-kivo safety guards', () => {
    const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

    beforeAll(() => {
        productionEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
    });

    afterAll(() => {
        if (productionEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = productionEnv;
        }
    });

    it('refuses to start under NODE_ENV=production', () => {
        expect(() => startMockKivo({ port: 0 })).toThrow(/NODE_ENV=production/);
    });
});
