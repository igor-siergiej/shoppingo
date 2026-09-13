import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

const openWasteWarrior = async (page: import('@playwright/test').Page) => {
    await page.goto('/recipes');
    await page.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('button', { name: 'Use Up Ingredient' }).click();
    const drawer = page.getByRole('dialog', { name: 'Use Up an Ingredient' });
    await expect(drawer.getByRole('heading', { name: 'Use Up an Ingredient' })).toBeVisible();
    return drawer;
};

test.describe('Waste Warrior', () => {
    test('prompts for an ingredient before showing any results', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Chicken Soup', [{ name: 'chicken' }]);
        const drawer = await openWasteWarrior(authenticatedPage);
        await expect(drawer.getByText('Type an ingredient to see recipes that use it.')).toBeVisible();
    });

    test('finds recipes that use a fuzzy-matched ingredient and navigates to it', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Spinach Curry', [{ name: 'spinach' }]);
        await apiCreateRecipe('Chicken Soup', [{ name: 'chicken' }]);
        const drawer = await openWasteWarrior(authenticatedPage);

        await drawer.getByPlaceholder('e.g. spinach').fill('spinch');
        await expect(drawer.getByText('Spinach Curry')).toBeVisible();
        await expect(drawer.getByText('uses spinach')).toBeVisible();
        await expect(drawer.getByText('Chicken Soup')).not.toBeVisible();

        await drawer.getByText('Spinach Curry').click();
        await authenticatedPage.waitForURL(/\/recipes\/.+/);
    });

    test('shows a clear empty state when no recipe uses the ingredient', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Chicken Soup', [{ name: 'chicken' }]);
        const drawer = await openWasteWarrior(authenticatedPage);

        await drawer.getByPlaceholder('e.g. spinach').fill('durian');
        await expect(drawer.getByText(/No recipes use anything like/)).toBeVisible();
    });
});
