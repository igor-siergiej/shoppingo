import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

// Coverage for shoppingo-recipe-difficulty-time: prep time, cook time, servings and difficulty
// are editable on manual creation and on Recipe Detail, and prefilled (parsed) from an import.
test.describe('Recipe prep time, cook time, servings and difficulty', () => {
    test('can be entered manually when creating a recipe and show on Recipe Detail', async ({
        authenticatedPage,
    }) => {
        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Add manually' }).click();
        await authenticatedPage.getByLabel('Recipe Title').fill('Roast Chicken');
        await authenticatedPage.getByLabel('Prep time').fill('20');
        await authenticatedPage.getByLabel('Cook time').fill('60');
        await authenticatedPage.getByLabel('Servings').fill('4');
        await authenticatedPage.getByLabel('Difficulty').click();
        await authenticatedPage.getByRole('option', { name: 'Medium' }).click();
        await authenticatedPage.getByRole('button', { name: 'Create Recipe' }).click();

        await authenticatedPage.getByRole('button', { name: 'Roast Chicken' }).click();
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await expect(authenticatedPage.getByText('Prep: 20 min')).toBeVisible();
        await expect(authenticatedPage.getByText('Cook: 60 min')).toBeVisible();
        await expect(authenticatedPage.getByText('Servings: 4')).toBeVisible();
        await expect(authenticatedPage.getByText('Difficulty: Medium')).toBeVisible();
    });

    test('owner can add details to an existing recipe from Recipe Detail', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Simple Soup');
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await expect(authenticatedPage.getByText('No details added yet.')).toBeVisible();

        await authenticatedPage.getByLabel('Edit recipe details').click();
        await authenticatedPage.getByLabel('Prep time').fill('10');
        await authenticatedPage.getByLabel('Cook time').fill('25');
        await authenticatedPage.getByLabel('Servings').fill('2');
        await authenticatedPage.getByLabel('Difficulty').click();
        await authenticatedPage.getByRole('option', { name: 'Easy' }).click();
        await authenticatedPage.getByRole('button', { name: 'Save' }).click();

        await expect(authenticatedPage.getByText('Prep: 10 min')).toBeVisible();
        await expect(authenticatedPage.getByText('Cook: 25 min')).toBeVisible();
        await expect(authenticatedPage.getByText('Servings: 2')).toBeVisible();
        await expect(authenticatedPage.getByText('Difficulty: Easy')).toBeVisible();
    });

    test('prefills prep time, cook time and servings from an imported recipe', async ({ authenticatedPage }) => {
        await authenticatedPage.route('**/api/recipes/import**', (route) =>
            route.fulfill({
                json: {
                    title: 'Imported Stew',
                    link: 'https://example.com/stew',
                    prepTime: 'PT15M',
                    cookTime: 'PT1H30M',
                    recipeYield: '6 servings',
                    instructions: ['Chop everything', 'Simmer for a long time'],
                    ingredients: [{ id: 'i1', name: 'Beef', quantity: 500, unit: 'g' }],
                },
            })
        );

        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Import from a link' }).click();
        await authenticatedPage.getByLabel('Recipe Link').fill('https://example.com/stew');
        await authenticatedPage.getByRole('button', { name: 'Import recipe from link' }).click();

        await expect(authenticatedPage.getByLabel('Prep time')).toHaveValue('15');
        await expect(authenticatedPage.getByLabel('Cook time')).toHaveValue('90');
        await expect(authenticatedPage.getByLabel('Servings')).toHaveValue('6');
    });
});
