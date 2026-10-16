import { expect, test } from '../fixtures';

// Read-only, no auth/mocking required — safe to run against any deployed
// environment (including production) as a post-deploy smoke check that the
// public Discover read surface is wired up, the CORS middleware responds,
// and the rate limiter / 404 paths do not 500.
test.describe('Public discover API', () => {
    test('@smoke /api/public/discover/recipes responds 200 with an `items` array', async ({ request }) => {
        const res = await request.get('/api/public/discover/recipes');
        expect(res.status()).toBe(200);
        const body = (await res.json()) as { items: unknown[]; nextCursor?: string };
        expect(Array.isArray(body.items)).toBe(true);
    });

    test('@smoke /api/public/discover/recipes echoes Access-Control-Allow-Origin for the marketing-site origin', async ({
        request,
    }) => {
        const res = await request.get('/api/public/discover/recipes', {
            headers: { Origin: 'https://shoppingo.imapps.uk' },
        });
        expect(res.status()).toBe(200);
        expect(res.headers()['access-control-allow-origin']).toBe('https://shoppingo.imapps.uk');
    });

    test('@smoke /api/public/discover/recipes:badslug returns 404, not 200 + SPA shell', async ({ request }) => {
        const res = await request.get('/api/public/discover/recipes/definitely-not-a-real-slug-xyz', {
            failOnStatusCode: false,
        });
        expect(res.status()).toBe(404);
    });

    test('@smoke /api/public/discover/recipes honors the pageSize parameter', async ({ request }) => {
        const res = await request.get('/api/public/discover/recipes?pageSize=5');
        expect(res.status()).toBe(200);
        const body = (await res.json()) as { items: unknown[] };
        expect(body.items.length).toBeLessThanOrEqual(5);
    });
});
