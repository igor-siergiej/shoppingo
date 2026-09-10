import { expect, test } from '../fixtures';

test.describe('Session token refresh', () => {
    test('a 401 from the API triggers a token refresh and the original request is retried', async ({
        authenticatedPage,
        listsPage,
    }) => {
        let listRequests = 0;

        // Fail the first list fetch with a 401, then let every retry hit the real API.
        await authenticatedPage.route('**/api/lists/user/**', async (route) => {
            listRequests += 1;

            if (listRequests === 1) {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Token expired' }),
                });
                return;
            }

            await route.continue();
        });

        const refreshRequest = authenticatedPage.waitForRequest(/\/refresh$/);

        await listsPage.goto();

        // makeRequest should have refreshed the token and retried the list fetch.
        await refreshRequest;
        await expect.poll(() => listRequests).toBeGreaterThanOrEqual(2);

        // The app recovers rather than bouncing to /login.
        await expect(authenticatedPage.getByRole('button', { name: 'Menu' })).toBeVisible();
        await expect(authenticatedPage).toHaveURL('/');
    });
});
