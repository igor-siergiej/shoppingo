import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from './index';

vi.mock('../../utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

describe('makeRequest', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('relies on the session cookie and sends no Authorization header', async () => {
        const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await makeRequest({ pathname: '/api/lists', method: 'GET', operationString: 'get lists' } as never);

        const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
        expect(init.headers).not.toHaveProperty('Authorization');
    });

    it('announces an expired session on 401 and rejects with the server message', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('{"error":"Unauthorized"}', { status: 401 }))
        );
        const expired = vi.fn();
        window.addEventListener('auth:session-expired', expired);

        await expect(
            makeRequest({ pathname: '/api/lists', method: 'GET', operationString: 'get lists' } as never)
        ).rejects.toMatchObject({ message: 'Unauthorized', status: 401 });
        expect(expired).toHaveBeenCalledTimes(1);

        window.removeEventListener('auth:session-expired', expired);
    });
});
