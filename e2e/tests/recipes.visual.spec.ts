import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

test.describe('Recipes page visual regression', () => {
    test('empty state', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByText('No recipes yet')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipes-empty.png');
    });

    test('populated state', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Pasta Bolognese');
        await apiCreateRecipe('Caesar Salad');
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipes-populated.png');
    });
});
