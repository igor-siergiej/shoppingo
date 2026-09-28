import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

// Coverage for shoppingo-ingredient-substitution-hints: a small per-ingredient action reveals
// AI-generated substitute suggestions inline, with no dedicated substitutes view.
test.describe('Ingredient substitute suggestions', () => {
    test('reveals substitutes for one ingredient without opening a dedicated view', async ({ authenticatedPage }) => {
        await authenticatedPage.route('**/api/recipes/substitutes', (route) =>
            route.fulfill({ json: { substitutes: ['margarine', 'coconut oil'] } })
        );

        const recipe = await apiCreateRecipe('Carbonara', [{ name: 'Butter' }, { name: 'Egg' }]);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await authenticatedPage.getByLabel('Suggest substitutes for Butter').click();

        await expect(authenticatedPage.getByText('margarine')).toBeVisible();
        await expect(authenticatedPage.getByText('coconut oil')).toBeVisible();
        // Only the clicked ingredient's substitutes are shown, and the page stays on Recipe Detail.
        await expect(authenticatedPage.getByLabel('Suggest substitutes for Egg')).toBeVisible();
        await expect(authenticatedPage).toHaveURL(`/recipes/${recipe.id}`);
    });

    test('shows an inline error when substitute suggestion fails', async ({ authenticatedPage }) => {
        await authenticatedPage.route('**/api/recipes/substitutes', (route) =>
            route.fulfill({ status: 502, json: { error: 'Failed to generate ingredient substitutes' } })
        );

        const recipe = await apiCreateRecipe('Soup', [{ name: 'Stock' }]);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await authenticatedPage.getByLabel('Suggest substitutes for Stock').click();

        await expect(authenticatedPage.getByText('Failed to generate ingredient substitutes')).toBeVisible();
    });
});
