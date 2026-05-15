import { expect, mockApiRoutes, test } from '../fixtures';
import { makeList } from '../mocks/data/lists';
import { makeIngredient, makeRecipe } from '../mocks/data/recipes';
import { MOCK_USER } from '../mocks/data/users';

test.describe('Bulk add ingredients to list', () => {
    test('Add to shopping list button enters select mode', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({
            id: 'r1',
            title: 'My Recipe',
            ownerId: MOCK_USER.id,
            ingredients: [makeIngredient({ name: 'Flour' }), makeIngredient({ name: 'Eggs' })],
        });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');

        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).toBeVisible();
    });

    test('can select ingredients and add to list', async ({ authenticatedPage }) => {
        const ing1 = makeIngredient({ id: 'i1', name: 'Flour' });
        const ing2 = makeIngredient({ id: 'i2', name: 'Eggs' });
        const ing3 = makeIngredient({ id: 'i3', name: 'Butter' });
        const recipe = makeRecipe({
            id: 'r1',
            title: 'Cake',
            ownerId: MOCK_USER.id,
            ingredients: [ing1, ing2, ing3],
        });
        const shoppingList = makeList({ title: 'Groceries' });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe], lists: [shoppingList] });
        await authenticatedPage.goto('/recipes/r1');

        // Enter select mode
        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).toBeVisible();

        // Select 2 ingredients
        await authenticatedPage.getByText('Flour').click();
        await authenticatedPage.getByText('Eggs').click();

        // Choose list
        await expect(authenticatedPage.getByRole('heading', { name: 'Add to List' })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Groceries' }).click();

        // Confirm
        await authenticatedPage.getByRole('button', { name: /Add 2 items/ }).click();

        // Toast confirms
        await expect(authenticatedPage.getByText(/2 items added/)).toBeVisible();
    });

    test('cancel exits select mode', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({
            id: 'r1',
            title: 'My Recipe',
            ownerId: MOCK_USER.id,
            ingredients: [makeIngredient({ name: 'Flour' })],
        });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');

        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Cancel' }).click();

        // Back to normal recipe view
        await expect(authenticatedPage.locator('h1').filter({ hasText: 'My Recipe' })).toBeVisible();
        await expect(authenticatedPage.getByRole('heading', { name: 'Select Ingredients' })).not.toBeVisible();
    });

    test('skips already-existing items and shows skipped count', async ({ authenticatedPage }) => {
        const ing = makeIngredient({ id: 'i1', name: 'Flour' });
        const recipe = makeRecipe({
            id: 'r1',
            title: 'Cake',
            ownerId: MOCK_USER.id,
            ingredients: [ing],
        });
        // List already has Flour
        const shoppingList = makeList({
            title: 'Groceries',
            items: [{ id: 'existing', name: 'Flour', isSelected: false, dateAdded: new Date() }],
        });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe], lists: [shoppingList] });
        await authenticatedPage.goto('/recipes/r1');

        await authenticatedPage.getByRole('button', { name: 'Add to shopping list' }).click();
        await authenticatedPage.getByText('Flour').click();
        await authenticatedPage.getByRole('button', { name: 'Groceries' }).click();
        await authenticatedPage.getByRole('button', { name: /Add 1 items/ }).click();

        await expect(authenticatedPage.getByText(/0 items added.*1 skipped|1 skipped/)).toBeVisible();
    });
});
