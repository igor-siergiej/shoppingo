import { apiCreateList, apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('Meal plan', () => {
    test('plans a recipe on a day and shops for the week into a list', async ({ authenticatedPage }) => {
        await apiCreateRecipe(
            'Weeknight Pasta',
            [{ name: 'spaghetti', quantity: 200, unit: 'g' }, { name: 'garlic' }],
            [],
            { servings: 2 }
        );
        await apiCreateList('Weekly Shop');

        await authenticatedPage.goto('/meal-plan');
        await authenticatedPage.getByRole('button', { name: 'Plan a recipe for Monday' }).click();
        await authenticatedPage.getByRole('button', { name: 'Weeknight Pasta' }).click();

        const monday = authenticatedPage.getByRole('region', { name: /Monday/ });
        await expect(monday.getByText('Weeknight Pasta')).toBeVisible();

        await monday.getByRole('button', { name: 'Increase portions' }).click();
        await expect(monday.getByTestId('portions-value')).toHaveText('3');

        await authenticatedPage.getByRole('button', { name: 'Shop for this week' }).click();
        await expect(authenticatedPage.getByText('300 g')).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Add 2 ingredients' }).click();

        await authenticatedPage.goto('/list/Weekly Shop');
        await expect(authenticatedPage.getByText('spaghetti')).toBeVisible();
        await expect(authenticatedPage.getByText('garlic')).toBeVisible();
    });

    test('a planned recipe can be removed', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Soup', [{ name: 'leek' }], [], { servings: 2 });

        await authenticatedPage.goto('/meal-plan');
        await authenticatedPage.getByRole('button', { name: 'Plan a recipe for Tuesday' }).click();
        await authenticatedPage.getByRole('button', { name: 'Soup' }).click();
        await expect(authenticatedPage.getByRole('region', { name: /Tuesday/ }).getByText('Soup')).toBeVisible();

        await authenticatedPage.getByRole('button', { name: 'Remove Soup' }).click();
        await expect(authenticatedPage.getByRole('region', { name: /Tuesday/ }).getByText('Soup')).toHaveCount(0);
    });
});
