import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import type { MockKivoServer } from './index';
import { startMockKivo } from './index';
import { decodeClaims, tokenFor } from './tokens';

let mock: MockKivoServer;

beforeAll(() => {
    mock = startMockKivo({
        port: 0, // OS picks a free port — keeps parallel test runs isolated
        host: '127.0.0.1',
        serviceToken: 'test-service-token',
        seedUsers: [{ id: 'user-alice', username: 'alice' }],
    });
});

afterAll(() => mock.close());

const fetchUrl = (path: string, init: RequestInit = {}) => fetch(`${mock.url}${path}`, init);

describe('mock-kivo tokens', () => {
    it('mints a JWT-shaped token whose payload decodes back to the claims', () => {
        const token = tokenFor({ id: 'id-1', username: 'alice' });
        const claims = decodeClaims(`Bearer ${token}`);
        expect(claims.id).toBe('id-1');
        expect(claims.username).toBe('alice');
    });

    it('returns empty object for malformed authorization headers', () => {
        expect(decodeClaims(null)).toEqual({});
        expect(decodeClaims('Bearer not-a-jwt')).toEqual({});
        expect(decodeClaims('Bearer a.b.c')).toEqual({});
    });
});

describe('mock-kivo routes', () => {
    it('verifies a token issued by the same mock', async () => {
        const token = tokenFor({ id: 'user-alice', username: 'alice' });
        const res = await fetchUrl('/verify', { headers: { Authorization: `Bearer ${token}` } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { success: boolean; payload: { id: string; username: string } };
        expect(body.success).toBe(true);
        expect(body.payload).toEqual({ id: 'user-alice', username: 'alice' });
    });

    it('refuses verification when the token has no claims', async () => {
        const res = await fetchUrl('/verify', { headers: { Authorization: 'Bearer abc.def.ghi' } });
        expect(res.status).toBe(401);
    });

    it('logs a seed user in via /login and issues the same shape the API expects', async () => {
        const res = await fetchUrl('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'alice', password: 'mockpw' }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { token: string; user: { id: string; username: string } };
        expect(body.token).toBeTruthy();
        expect(body.user.username).toBe('alice');
    });

    it('registers a new user and lets them log in', async () => {
        const reg = await fetchUrl('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'bob', password: 'hunter2' }),
        });
        expect(reg.status).toBe(200);
        const login = await fetchUrl('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'bob', password: 'hunter2' }),
        });
        expect(login.status).toBe(200);
    });

    it('refuses to reuse a username', async () => {
        await fetchUrl('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'carol', password: 'pw' }),
        });
        const dup = await fetchUrl('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'carol', password: 'pw' }),
        });
        expect(dup.status).toBe(409);
    });

    it('refreshes an existing access token', async () => {
        const res = await fetchUrl('/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'alice' }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { accessToken: string };
        expect(body.accessToken).toBeTruthy();
    });

    it('rejects /users without the matching X-Service-Token', async () => {
        const res = await fetchUrl('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: ['alice'] }),
        });
        expect(res.status).toBe(401);
    });

    it('accepts /users with the correct X-Service-Token', async () => {
        const res = await fetchUrl('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Service-Token': 'test-service-token' },
            body: JSON.stringify({ usernames: ['alice'] }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { users: Array<{ id: string; username: string }> };
        expect(body.users.map((u) => u.username)).toContain('alice');
    });

    it('searches registered users by username', async () => {
        const res = await fetchUrl('/search?usernames=alice');
        expect(res.status).toBe(200);
        const body = (await res.json()) as { usernames: string[]; users: Array<{ username: string }> };
        expect(body.usernames).toContain('alice');
    });
});

describe('mock-kivo safety guards', () => {
    it('throws when NODE_ENV is production', () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            expect(() => startMockKivo({ port: 0, host: '127.0.0.1' })).toThrow(/refuses to start in production/);
        } finally {
            process.env.NODE_ENV = previous;
        }
    });

    it('binds to localhost only — never 0.0.0.0', async () => {
        const second = startMockKivo({ port: 0, host: '127.0.0.1' });
        second.close();
        expect(second.url.startsWith('http://127.0.0.1:')).toBe(true);
    });
});
