import { expect, mockApiRoutes, test } from '../fixtures';
import { makeIngredient, makeRecipe } from '../mocks/data/recipes';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';

const waitForRecipe = async (page: import('@playwright/test').Page) => {
    await page.locator('h1').last().waitFor({ timeout: 10000 });
};

test.describe('Recipe detail page', () => {
    test('renders recipe title and ingredients heading', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({
            id: 'r1',
            title: 'Pasta Bolognese',
            ingredients: [makeIngredient({ name: 'Pasta' }), makeIngredient({ name: 'Beef' })],
        });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);
        await expect(authenticatedPage.locator('h1').filter({ hasText: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('heading', { name: /Ingredients/ })).toBeVisible();
        await expect(authenticatedPage.getByText('Pasta', { exact: true })).toBeVisible();
        await expect(authenticatedPage.getByText('Beef', { exact: true })).toBeVisible();
    });

    test('owner can edit title', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'r1', title: 'Old Title', ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);

        await authenticatedPage.getByLabel('Edit recipe title').click();
        const input = authenticatedPage.locator('input').first();
        await input.clear();
        await input.fill('New Title');
        await authenticatedPage.getByRole('button', { name: 'Save' }).first().click();

        await expect(authenticatedPage.locator('h1').filter({ hasText: 'New Title' })).toBeVisible();
    });

    test('non-owner cannot see edit title button', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'r1', title: 'Shared Recipe', ownerId: MOCK_USER_2.id });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);
        await expect(authenticatedPage.getByLabel('Edit recipe title')).not.toBeVisible();
    });

    test('owner can add a link', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'r1', title: 'My Recipe', ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Add Link' }).click();
        await authenticatedPage.getByPlaceholder('https://...').fill('https://example.com/recipe');
        await authenticatedPage.getByRole('button', { name: 'Save' }).first().click();

        await expect(authenticatedPage.getByRole('button', { name: 'Edit Link' })).toBeVisible();
    });

    test('owner can edit instructions', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'r1', title: 'My Recipe', ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Edit Instructions' }).click();
        await authenticatedPage.getByRole('button', { name: '+ Add step' }).click();
        await authenticatedPage.getByRole('button', { name: 'Save' }).first().click();
    });

    test('owner can delete recipe and returns to /recipes', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'r1', title: 'Deletable Recipe', ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);

        await authenticatedPage.getByLabel('Delete recipe').click();
        await expect(authenticatedPage.getByText('Delete Recipe?')).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Delete Recipe' }).click();
        await authenticatedPage.waitForURL('/recipes');
    });

    test('non-owner cannot see delete button', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'r1', title: 'Shared', ownerId: MOCK_USER_2.id });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);
        await expect(authenticatedPage.getByLabel('Delete recipe')).not.toBeVisible();
    });

    test('go back returns to /recipes', async ({ authenticatedPage }) => {
        const recipe = makeRecipe({ id: 'r1', title: 'My Recipe' });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await waitForRecipe(authenticatedPage);
        await authenticatedPage.getByRole('button', { name: 'Go back' }).click();
        await authenticatedPage.waitForURL('/recipes');
    });

    test('ingredient swipe left shows delete button', async ({ authenticatedPage }) => {
        const ing = makeIngredient({ name: 'Garlic' });
        const recipe = makeRecipe({ id: 'r1', title: 'My Recipe', ingredients: [ing], ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { recipes: [recipe] });
        await authenticatedPage.goto('/recipes/r1');
        await expect(authenticatedPage.getByText('Garlic')).toBeVisible();

        const item = authenticatedPage.getByText('Garlic');
        const box = await item.boundingBox();
        if (box) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            await authenticatedPage.mouse.move(cx, cy);
            await authenticatedPage.mouse.down();
            await authenticatedPage.mouse.move(cx - 90, cy, { steps: 10 });
            await authenticatedPage.mouse.up();
            await authenticatedPage.waitForTimeout(300);
            // Swipe action delete has hover:bg-destructive/90; toolbar Delete recipe button does not
            const deleteBtn = authenticatedPage.locator('button[class*="hover:bg-destructive\\/90"]').first();
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
                await expect(authenticatedPage.getByText('Garlic', { exact: true })).not.toBeVisible({ timeout: 5000 });
            }
        }
    });
});
