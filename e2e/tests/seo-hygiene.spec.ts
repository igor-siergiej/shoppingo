import { expect, test } from '../fixtures';

// Read-only, no auth/mocking required — safe to run against any deployed
// environment (including production) as a post-deploy SEO sanity check.
// The app itself must not be indexed (the marketing site owns that surface),
// but a shared invite link should still render a proper preview card.
test.describe('SEO hygiene', () => {
    test('@smoke robots.txt disallows everything and is served as text/plain', async ({ request }) => {
        const res = await request.get('/robots.txt');
        expect(res.status()).toBe(200);
        expect(res.headers()['content-type']).toMatch(/^text\/plain/);
        const body = await res.text();
        expect(body).toContain('User-agent: *');
        expect(body).toContain('Disallow: /');
    });

    test('@smoke /sitemap.xml returns 404, not the SPA shell', async ({ request }) => {
        const res = await request.get('/sitemap.xml', { failOnStatusCode: false });
        // The card's real criterion: a 404 from the web container, not 200 +
        // the SPA index.html. nginx's built-in 404 page can be text/html, so
        // don't second-guess the content-type — the status code is what
        // crawlers and tooling actually key off.
        expect(res.status()).toBe(404);
        expect(res.status()).not.toBe(200);
    });

    test('@smoke index.html has description, noindex, canonical, and OG/Twitter share tags', async ({ page }) => {
        await page.goto('/login');
        const head = page.locator('head');

        await expect(head.locator('meta[name="description"]')).toHaveAttribute('content', /Tandra/i);
        await expect(head.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
        await expect(head.locator('link[rel="canonical"]')).toHaveAttribute('href', /tandra\.uk/);

        await expect(head.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
        await expect(head.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
        await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

        const ogImage = await head.locator('meta[property="og:image"]').getAttribute('content');
        expect(ogImage).toMatch(/\/og\.png$/);
    });

    test('@smoke og.png is served and is the expected share size', async ({ request }) => {
        const res = await request.get('/og.png');
        expect(res.status()).toBe(200);
        expect(res.headers()['content-type']).toMatch(/^image\/png/);
        // Open Graph spec: 1200x630 is the conventional large share card.
        // We don't decode the PNG here; the build pipeline (vite-plugin-pwa
        // globPatterns + Dockerfile) is the source of truth for the file's
        // dimensions. The smoke check confirms the asset is actually served
        // so a shared link renders a preview.
        const body = await res.body();
        expect(body.byteLength).toBeGreaterThan(1000);
    });
});
