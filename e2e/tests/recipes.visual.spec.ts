import { apiCreateRecipe } from '../api-helpers';
import { seedFriendship } from '../db-helpers';
import { expect, test } from '../fixtures';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';
import { settle } from './visual-helpers';

test.describe('Recipes page visual regression', () => {
    test('empty state', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByText('No recipes yet')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipes-empty.png');
    });

    // One shared and one unshared recipe, so the baseline covers both card
    // layouts: row meta + avatar stack, and the centred stacked meta column.
    test('populated state', async ({ authenticatedPage }) => {
        await seedFriendship(MOCK_USER, MOCK_USER_2);
        await apiCreateRecipe('Pasta Bolognese', [], [MOCK_USER_2.id]);
        await apiCreateRecipe('Caesar Salad', [], [], { prepTime: 15, cookTime: 10, servings: 4 });
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('recipes-populated.png');
    });
});
