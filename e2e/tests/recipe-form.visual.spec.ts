import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

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
