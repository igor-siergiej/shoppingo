import { apiAddItem, apiCreateList, apiCreateRecipe, apiGetList } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('Recipe search', () => {
    test('finds a recipe by an ingredient it contains', async ({ recipesPage }) => {
        await apiCreateRecipe('Weeknight Dinner', [{ name: 'chickpeas' }]);
        await apiCreateRecipe('Caesar Salad', [{ name: 'lettuce' }]);
        await recipesPage.goto();

        await recipesPage.search('chickpeas');

        await expect(recipesPage.recipeCard('Weeknight Dinner')).toBeVisible();
        await expect(recipesPage.recipeCard('Caesar Salad')).toHaveCount(0);
    });

    test('finds a recipe by one of its tags', async ({ recipesPage }) => {
        await apiCreateRecipe('Weeknight Dinner', [], [], { tags: ['vegan'] });
        await apiCreateRecipe('Caesar Salad', [], [], { tags: ['lunch'] });
        await recipesPage.goto();

        await recipesPage.search('vegan');

        await expect(recipesPage.recipeCard('Weeknight Dinner')).toBeVisible();
        await expect(recipesPage.recipeCard('Caesar Salad')).toHaveCount(0);
    });

    test('tolerates a typo in the search', async ({ recipesPage }) => {
        await apiCreateRecipe('Bolognese');
        await recipesPage.goto();

        await recipesPage.search('bolonese');

        await expect(recipesPage.recipeCard('Bolognese')).toBeVisible();
    });

    test('a search with no match says so and clearing it brings the recipes back', async ({
        authenticatedPage,
        recipesPage,
    }) => {
        await apiCreateRecipe('Bolognese');
        await recipesPage.goto();

        await recipesPage.search('zzzzqqq');
        await expect(authenticatedPage.getByText('No recipes found')).toBeVisible();
        await expect(authenticatedPage.getByText('Try a different search term')).toBeVisible();
        await expect(recipesPage.recipeCard('Bolognese')).toHaveCount(0);

        await recipesPage.clearSearchButton.click();
        await expect(recipesPage.recipeCard('Bolognese')).toBeVisible();
    });
});

test.describe('Waste Warrior ranking and matching', () => {
    const open = async (page: import('@playwright/test').Page) => {
        await page.goto('/recipes/use-up');
        await expect(page.getByRole('heading', { name: 'Use Up an Ingredient' })).toBeVisible();
    };

    test('matches are case-insensitive and partial', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Spinach Curry', [{ name: 'Baby Spinach' }]);
        await open(authenticatedPage);

        await authenticatedPage.getByPlaceholder('e.g. spinach').fill('SPINACH');

        await expect(authenticatedPage.getByText('Spinach Curry')).toBeVisible();
        await expect(authenticatedPage.getByText('uses Baby Spinach')).toBeVisible();
    });

    test('lists every recipe that uses the ingredient and none that do not', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Spinach Curry', [{ name: 'spinach' }, { name: 'rice' }]);
        await apiCreateRecipe('Spinach Pie', [{ name: 'spinach' }]);
        await apiCreateRecipe('Rice Pudding', [{ name: 'rice' }]);
        await open(authenticatedPage);

        await authenticatedPage.getByPlaceholder('e.g. spinach').fill('spinach');

        await expect(authenticatedPage.getByText('Spinach Curry')).toBeVisible();
        await expect(authenticatedPage.getByText('Spinach Pie')).toBeVisible();
        await expect(authenticatedPage.getByText('Rice Pudding')).toHaveCount(0);
    });

    test('the closest match sits nearest the search field', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Salad', [{ name: 'baby spinach leaves, washed and dried' }]);
        await apiCreateRecipe('Pie', [{ name: 'spinach' }]);
        await open(authenticatedPage);

        await authenticatedPage.getByPlaceholder('e.g. spinach').fill('spinach');
        const pie = await authenticatedPage.getByText('Pie', { exact: true }).boundingBox();
        const salad = await authenticatedPage.getByText('Salad', { exact: true }).boundingBox();

        expect(pie && salad && pie.y > salad.y).toBe(true);
    });

    test('clearing the field returns to the prompt', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Spinach Curry', [{ name: 'spinach' }]);
        await open(authenticatedPage);
        const field = authenticatedPage.getByPlaceholder('e.g. spinach');

        await field.fill('spinach');
        await expect(authenticatedPage.getByText('Spinach Curry')).toBeVisible();
        await field.fill('');

        await expect(authenticatedPage.getByText(/Type something you don't want to waste/)).toBeVisible();
        await expect(authenticatedPage.getByText('Spinach Curry')).toHaveCount(0);
    });
});

test.describe('Add from recipe on the list page', () => {
    const openDrawer = async (page: import('@playwright/test').Page, listTitle: string) => {
        await page.goto(`/list/${listTitle}`);
        await page.getByRole('button', { name: 'Actions' }).click();
        await page.getByRole('button', { name: 'Add from Recipe' }).click();
    };

    test('scales quantities with the portions stepper and adds the scaled amount', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Soup', [{ name: 'Carrot', quantity: 2, unit: 'cups' }], [], { servings: 4 });
        await apiCreateList('Groceries');
        await openDrawer(authenticatedPage, 'Groceries');

        await authenticatedPage.getByText('Soup').click();
        await expect(authenticatedPage.getByTestId('portions-value')).toHaveText('4');
        await expect(authenticatedPage.getByText('2 cups')).toBeVisible();

        await authenticatedPage.getByLabel('Increase portions').click();
        await authenticatedPage.getByLabel('Increase portions').click();
        await expect(authenticatedPage.getByTestId('portions-value')).toHaveText('6');
        await expect(authenticatedPage.getByText('3 cups')).toBeVisible();

        await authenticatedPage.getByText('Carrot').click();
        await authenticatedPage.getByRole('button', { name: /Add 1 items/ }).click();

        await expect
            .poll(async () => (await apiGetList('Groceries')).items.find((i) => i.name === 'Carrot')?.quantity)
            .toBe(3);
    });

    test('the portions stepper cannot go below one', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Soup', [{ name: 'Carrot', quantity: 2, unit: 'cups' }], [], { servings: 1 });
        await apiCreateList('Groceries');
        await openDrawer(authenticatedPage, 'Groceries');
        await authenticatedPage.getByText('Soup').click();

        await expect(authenticatedPage.getByLabel('Decrease portions')).toBeDisabled();
        await expect(authenticatedPage.getByTestId('portions-value')).toHaveText('1');
    });

    test('merges a near-duplicate into the existing item instead of adding a second row', async ({
        authenticatedPage,
    }) => {
        await apiCreateRecipe('Omelette', [{ name: 'large eggs', quantity: 2 }]);
        await apiCreateList('Groceries');
        await apiAddItem('Groceries', 'eggs', { quantity: 5, unit: 'pcs' });
        await openDrawer(authenticatedPage, 'Groceries');

        await authenticatedPage.getByText('Omelette').click();
        await authenticatedPage.getByText('large eggs').click();
        await authenticatedPage.getByRole('button', { name: /Add 1 items/ }).click();

        await expect.poll(async () => (await apiGetList('Groceries')).items.map((i) => i.name)).toEqual(['eggs']);
        await expect(authenticatedPage.getByText('7 pcs')).toBeVisible();
    });

    test('a recipe with no ingredients says so', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Empty Recipe');
        await apiCreateList('Groceries');
        await openDrawer(authenticatedPage, 'Groceries');

        await authenticatedPage.getByText('Empty Recipe').click();

        await expect(authenticatedPage.getByText('No ingredients')).toBeVisible();
    });

    test('searching narrows the recipe choices', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Soup');
        await apiCreateRecipe('Salad');
        await apiCreateList('Groceries');
        await openDrawer(authenticatedPage, 'Groceries');

        await authenticatedPage.getByPlaceholder('Search recipes...').fill('soup');

        await expect(authenticatedPage.getByText('Soup', { exact: true })).toBeVisible();
        await expect(authenticatedPage.getByText('Salad', { exact: true })).toHaveCount(0);
    });
});
