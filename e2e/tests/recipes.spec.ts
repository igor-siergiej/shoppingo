import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('Recipes page', () => {
    test('shows Your Recipes heading and empty state', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('heading', { name: 'Your Recipes', level: 2 })).toBeVisible();
        await expect(authenticatedPage.getByText('No recipes yet')).toBeVisible();
    });

    test('renders owned recipe cards', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Pasta Bolognese');
        await apiCreateRecipe('Caesar Salad');
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).toBeVisible();
    });

    test('search filters recipes', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Pasta Bolognese');
        await apiCreateRecipe('Caesar Salad');
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByPlaceholder('Search recipes...').fill('pasta');
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).not.toBeVisible();
    });

    test('clear search shows all recipes', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Pasta Bolognese');
        await apiCreateRecipe('Caesar Salad');
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByPlaceholder('Search recipes...').fill('pasta');
        await authenticatedPage.getByLabel('Clear search').click();
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).toBeVisible();
    });

    test('clicking recipe navigates to detail page', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Pasta Bolognese');
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' }).click();
        await authenticatedPage.waitForURL(`/recipes/${recipe.id}`);
    });

    test('can add a new recipe', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Create Recipe' })).toBeVisible();
        await authenticatedPage.getByLabel('Recipe Title').fill('New Dish');
        await authenticatedPage.getByRole('button', { name: 'Create Recipe' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'New Dish' })).toBeVisible();
    });

    test('navigate to lists via toolbar', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByRole('button', { name: 'Shopping lists' }).click();
        await authenticatedPage.waitForURL('/');
    });
});
