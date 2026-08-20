import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// Runs before every screenshot below, on all three screens. Waits out
// web-font swap (Montserrat loads async via Google Fonts), then explicitly
// asserts Montserrat actually loaded — document.fonts.ready resolves even
// if the CDN fetch failed/was blocked, silently falling back to a default
// sans-serif, so document.fonts.check() here doubles as an assertion that
// the font really loaded rather than a mass, confusing pixel-diff. Also
// blurs whatever's focused — a no-op on the choice screen (no input), but
// on the other two screens it clears the autoFocused field's blinking text
// caret so the screenshot doesn't capture nondeterministic caret blink.
const settle = async (page: Page) => {
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.evaluate(() => document.fonts.check('600 16px Montserrat'))).toBe(true);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
};

// The Appbar renders a `v{version}` badge that changes on every release —
// mask it out so a routine version bump doesn't drift every baseline.
const VERSION_BADGE = /^v\d+\.\d+\.\d+$/;

test.describe('Recipe form visual regression', () => {
    test('choice screen', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes/new');
        await expect(authenticatedPage.getByRole('heading', { name: 'Create Recipe' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Add manually' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipe-new-choice.png', {
            mask: [authenticatedPage.getByText(VERSION_BADGE)],
        });
    });

    test('manual form screen', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Add manually' }).click();
        await expect(authenticatedPage.getByLabel('Recipe Title')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipe-new-form.png', {
            mask: [authenticatedPage.getByText(VERSION_BADGE)],
        });
    });

    test('import screen', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Import from a link' }).click();
        await expect(authenticatedPage.getByLabel('Recipe Link')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipe-new-import.png', {
            mask: [authenticatedPage.getByText(VERSION_BADGE)],
        });
    });
});
