import { apiAddItem, apiCreateList, apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('Bulk add ingredients to list', () => {
    test('Add to shopping list button enters select mode', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('My Recipe', [{ name: 'Flour' }, { name: 'Eggs' }]);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);

        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).toBeVisible();
    });

    test('can select ingredients and add to list', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Cake', [{ name: 'Flour' }, { name: 'Eggs' }, { name: 'Butter' }]);
        await apiCreateList('Groceries');
        await authenticatedPage.goto(`/recipes/${recipe.id}`);

        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).toBeVisible();

        await authenticatedPage.getByText('Flour').click();
        await authenticatedPage.getByText('Eggs').click();

        await expect(authenticatedPage.getByRole('heading', { name: 'Add to List' })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Groceries' }).click();

        await authenticatedPage.getByRole('button', { name: /Add 2 items/ }).click();

        await expect(authenticatedPage.getByText(/2 items added/)).toBeVisible();
    });

    test('cancel exits select mode', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('My Recipe', [{ name: 'Flour' }]);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);

        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Cancel' }).click();

        await expect(authenticatedPage.locator('h1').filter({ hasText: 'My Recipe' })).toBeVisible();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).not.toBeVisible();
    });

    test('skips already-existing items and shows skipped count', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Cake', [{ name: 'Flour' }]);
        await apiCreateList('Groceries');
        await apiAddItem('Groceries', 'Flour');

        await authenticatedPage.goto(`/recipes/${recipe.id}`);

        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await authenticatedPage.getByText('Flour').click();
        await authenticatedPage.getByRole('button', { name: 'Groceries' }).click();
        await authenticatedPage.getByRole('button', { name: /Add 1 items/ }).click();

        await expect(authenticatedPage.getByText(/0 items added.*1 skipped|1 skipped/)).toBeVisible();
    });
});
