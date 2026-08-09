import { expect, test } from '@playwright/test';

// Read-only, no auth/mocking required — safe to run against any deployed
// environment (including production) as a post-deploy sanity check that the
// correct build actually shipped and is serving traffic.
test('deployed build serves the login page @smoke', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Login to your account', { exact: true })).toBeVisible();
});
