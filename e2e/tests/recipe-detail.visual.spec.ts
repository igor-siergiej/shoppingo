import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

test.describe('Recipe detail visual regression', () => {
    test('populated state', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Pizza Margherita', [{ name: 'Flour', quantity: 500, unit: 'g' }]);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        // The page mounts via a lazy chunk and renders its title async — wait
        // for the h1 explicitly rather than relying on toBeVisible()'s default
        // timeout, matching recipe-detail.spec.ts's own pattern for this route.
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });
        await expect(authenticatedPage.getByRole('heading', { name: /Ingredients/ })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipe-detail-populated.png');
    });
});
