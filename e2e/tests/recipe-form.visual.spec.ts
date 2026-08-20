import { expect, test } from '../fixtures';

// Waits out web-font swap (Montserrat loads async via Google Fonts) and blurs
// any auto-focused input (both screens autoFocus their first field) so the
// screenshot doesn't capture a blinking text caret — both are real sources of
// nondeterministic diffs, not paranoia.
const settle = async (page: import('@playwright/test').Page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
};

test.describe('Recipe form visual regression', () => {
    test('choice screen', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes/new');
        await expect(authenticatedPage.getByRole('heading', { name: 'Create Recipe' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Add manually' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipe-new-choice.png');
    });

    test('manual form screen', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Add manually' }).click();
        await expect(authenticatedPage.getByLabel('Recipe Title')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipe-new-form.png');
    });

    test('import screen', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Import from a link' }).click();
        await expect(authenticatedPage.getByLabel('Recipe Link')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipe-new-import.png');
    });
});
