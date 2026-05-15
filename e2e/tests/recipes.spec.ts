import { expect, mockApiRoutes, test } from '../fixtures';
import { makeRecipe } from '../mocks/data/recipes';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';

test.describe('Recipes page', () => {
    test('shows Your Recipes heading and empty state', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('heading', { name: 'Your Recipes', level: 2 })).toBeVisible();
        await expect(authenticatedPage.getByText('No recipes yet')).toBeVisible();
    });

    test('renders owned recipe cards', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage, {
            recipes: [makeRecipe({ title: 'Pasta Bolognese' }), makeRecipe({ title: 'Caesar Salad' })],
        });
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).toBeVisible();
    });

    test('shared recipe appears in Shared Recipes section', async ({ authenticatedPage }) => {
        const shared = makeRecipe({
            title: 'Grandma Cake',
            ownerId: MOCK_USER_2.id,
            users: [
                { id: MOCK_USER.id, username: MOCK_USER.username },
                { id: MOCK_USER_2.id, username: MOCK_USER_2.username },
            ],
        });
        await mockApiRoutes(authenticatedPage, { recipes: [shared] });
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('heading', { name: 'Shared Recipes', level: 2 })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Grandma Cake' })).toBeVisible();
    });

    test('search filters recipes', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage, {
            recipes: [makeRecipe({ title: 'Pasta Bolognese' }), makeRecipe({ title: 'Caesar Salad' })],
        });
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByPlaceholder('Search recipes...').fill('pasta');
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).not.toBeVisible();
    });

    test('clear search shows all recipes', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage, {
            recipes: [makeRecipe({ title: 'Pasta Bolognese' }), makeRecipe({ title: 'Caesar Salad' })],
        });
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByPlaceholder('Search recipes...').fill('pasta');
        await authenticatedPage.getByLabel('Clear search').click();
        await expect(authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).toBeVisible();
    });

    test('clicking recipe navigates to detail page', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'recipe-123', title: 'Pasta Bolognese' });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByRole('button', { name: 'Pasta Bolognese' }).click();
        await authenticatedPage.waitForURL(/\/recipes\/recipe-123/);
    });

    test('can add a new recipe', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/recipes');

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByRole('heading', { name: 'Create Recipe' })).toBeVisible();

        await authenticatedPage.getByLabel('Recipe Title').fill('New Dish');
        await authenticatedPage.getByRole('button', { name: 'Create Recipe' }).click();

        await expect(authenticatedPage.getByRole('button', { name: 'New Dish' })).toBeVisible();
    });

    test('navigate to lists via toolbar', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/recipes');
        await authenticatedPage.getByRole('button', { name: 'Shopping lists' }).click();
        await authenticatedPage.waitForURL('/');
    });
});
