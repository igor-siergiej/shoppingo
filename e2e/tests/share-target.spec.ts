import { expect, test } from '../fixtures';

test.describe('PWA Web Share Target', () => {
    test('redirects to /recipes', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/share?url=https://example.com/recipe&title=Test+Recipe');
        await authenticatedPage.waitForURL(/\/recipes/, { timeout: 5000 });
        await expect(authenticatedPage).toHaveURL(/\/recipes/);
    });

    test('opens "Create Recipe" drawer with pre-filled URL', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/share?url=https://example.com/recipe&title=Test+Recipe');
        await authenticatedPage.waitForURL(/\/recipes/, { timeout: 5000 });

        // RecipesPage auto-opens AddRecipeDrawer when sharedUrl param is present
        await expect(authenticatedPage.getByRole('heading', { name: 'Create Recipe' })).toBeVisible({ timeout: 5000 });

        // Link field pre-filled with shared URL
        await expect(authenticatedPage.getByPlaceholder('https://...')).toHaveValue('https://example.com/recipe');
    });

    test('share-target without url still redirects to /recipes', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/share?title=Test+Recipe');
        await authenticatedPage.waitForURL(/\/recipes/, { timeout: 5000 });
        await expect(authenticatedPage).toHaveURL(/\/recipes/);

        // Drawer should NOT auto-open when no sharedUrl
        await expect(authenticatedPage.getByRole('heading', { name: 'Create Recipe' })).not.toBeVisible();
    });

    test('opens "Create Recipe" drawer when the link only arrives in the Android `text` field', async ({
        authenticatedPage,
    }) => {
        // Android's share sheet has no dedicated URL slot — the sharing app (Firefox, Chrome, etc.)
        // puts the link in `text` instead of `url`.
        await authenticatedPage.goto('/share?text=https://example.com/recipe&title=Test+Recipe');
        await authenticatedPage.waitForURL(/\/recipes/, { timeout: 5000 });

        await expect(authenticatedPage.getByRole('heading', { name: 'Create Recipe' })).toBeVisible({ timeout: 5000 });
        await expect(authenticatedPage.getByPlaceholder('https://...')).toHaveValue('https://example.com/recipe');
    });
});
