import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('Recipes page', () => {
    test('shows empty state when there are no recipes', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes');
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

    test('search field stays pinned near the bottom of the viewport', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Pasta Bolognese');
        await authenticatedPage.setViewportSize({ width: 390, height: 700 });
        await authenticatedPage.goto('/recipes');

        const searchInput = authenticatedPage.getByPlaceholder('Search recipes...');
        const box = await searchInput.boundingBox();
        expect(box).not.toBeNull();
        // Pinned to the bottom of the page, not scrolled away above the fold.
        expect(box?.y).toBeGreaterThan(500);
    });

    test('best search match renders closest to the bottom-pinned search field', async ({ authenticatedPage }) => {
        // Exact title match scores best and should land last, nearest the search field;
        // the ingredient-only match should render first, furthest from the field.
        await apiCreateRecipe('Curry Night Special', [{ name: 'chicken curry paste' }]);
        await apiCreateRecipe('Chicken Curry');
        await authenticatedPage.setViewportSize({ width: 390, height: 700 });
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByPlaceholder('Search recipes...').fill('Chicken Curry');

        const bestMatch = authenticatedPage.getByRole('button', { name: 'Chicken Curry' });
        const worseMatch = authenticatedPage.getByRole('button', { name: 'Curry Night Special' });
        await expect(bestMatch).toBeVisible();
        await expect(worseMatch).toBeVisible();

        const bestBox = await bestMatch.boundingBox();
        const worseBox = await worseMatch.boundingBox();
        expect(bestBox).not.toBeNull();
        expect(worseBox).not.toBeNull();
        expect(bestBox?.y).toBeGreaterThan(worseBox?.y);
    });

    test('clearing search scrolls the page back to the bottom', async ({ authenticatedPage }) => {
        for (let i = 0; i < 15; i++) {
            await apiCreateRecipe(`Recipe ${i}`);
        }
        await authenticatedPage.setViewportSize({ width: 390, height: 700 });
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByPlaceholder('Search recipes...').fill('Recipe 1');

        const scrollContainer = authenticatedPage.locator('div.overflow-y-auto');
        await scrollContainer.evaluate((el) => el.scrollTo({ top: 0 }));
        await authenticatedPage.getByLabel('Clear search').click();

        await expect
            .poll(async () => scrollContainer.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2))
            .toBe(true);
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
        await authenticatedPage.getByRole('button', { name: 'Add manually' }).click();
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
