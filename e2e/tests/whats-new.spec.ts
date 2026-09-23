import { expect, test } from '../fixtures';

const LAST_SEEN_KEY = 'shoppingo:lastSeenVersion';

test.describe("What's new", () => {
    test('@smoke opens the release notes from the version in the app bar', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/');
        await authenticatedPage.getByRole('button', { name: /what's new/i }).click();

        await expect(authenticatedPage.getByRole('heading', { name: "What's new" })).toBeVisible();
        await expect(authenticatedPage.getByText(/^v\d+\.\d+\.\d+$/).first()).toBeVisible();
    });

    test('flags unread releases for a returning user and clears them once read', async ({ authenticatedPage }) => {
        await authenticatedPage.addInitScript(
            ([key, version]) => window.localStorage.setItem(key, version),
            [LAST_SEEN_KEY, '0.0.1']
        );
        await authenticatedPage.goto('/');

        const indicator = authenticatedPage.getByTestId('whats-new-indicator');

        await expect(indicator).toBeVisible();

        await authenticatedPage.getByRole('button', { name: /what's new/i }).click();
        await expect(authenticatedPage.getByText('New').first()).toBeVisible();
        await expect(indicator).toBeHidden();
    });
});
