import { expect, test } from '../fixtures';

// Read-only, no auth required — safe to run against production. Montserrat is
// self-hosted so no visitor's IP is sent to Google on page load.
const GOOGLE_FONT_HOSTS = /(^|\.)(googleapis|gstatic)\.com$/;

test.describe('Self-hosted fonts', () => {
    test('@smoke login page loads Montserrat without contacting Google', async ({ page }) => {
        const googleRequests: string[] = [];
        page.on('request', (req) => {
            if (GOOGLE_FONT_HOSTS.test(new URL(req.url()).hostname)) googleRequests.push(req.url());
        });

        await page.goto('/login');
        await page.evaluate(() => document.fonts.ready);
        await expect.poll(() => page.evaluate(() => document.fonts.check('600 16px "Montserrat Variable"'))).toBe(true);

        expect(googleRequests).toEqual([]);
    });

    test('@smoke CSP allows no Google font origins', async ({ request }) => {
        const res = await request.get('/login');
        const csp = res.headers()['content-security-policy'];
        test.skip(!csp, 'CSP is set by the production nginx config, not the dev server');

        expect(csp).not.toMatch(/googleapis|gstatic/);
        expect(csp).toContain("font-src 'self' data:;");
    });
});
