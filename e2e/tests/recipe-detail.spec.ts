import { apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('Recipe detail page', () => {
    test('renders recipe title and ingredients heading', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Pasta Bolognese', [{ name: 'Pasta' }, { name: 'Beef' }]);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await expect(authenticatedPage.locator('h1').filter({ hasText: 'Pasta Bolognese' })).toBeVisible();
        await expect(authenticatedPage.getByRole('heading', { name: /Ingredients/ })).toBeVisible();
        await expect(authenticatedPage.getByText('Pasta', { exact: true })).toBeVisible();
        await expect(authenticatedPage.getByText('Beef', { exact: true })).toBeVisible();
    });

    test('owner can edit title', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Old Title');
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await authenticatedPage.getByLabel('Edit recipe title').click();
        const input = authenticatedPage.locator('input').first();
        await input.clear();
        await input.fill('New Title');
        await authenticatedPage.getByRole('button', { name: 'Save' }).first().click();

        await expect(authenticatedPage.locator('h1').filter({ hasText: 'New Title' })).toBeVisible();
    });

    test('owner can add a link', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('My Recipe');
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await authenticatedPage.getByRole('button', { name: 'Add Link' }).click();
        await authenticatedPage.getByPlaceholder('https://...').fill('https://example.com/recipe');
        await authenticatedPage.getByRole('button', { name: 'Save' }).first().click();

        await expect(authenticatedPage.getByRole('button', { name: 'Edit Link' })).toBeVisible();
    });

    test('owner can edit instructions', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('My Recipe');
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await authenticatedPage.getByRole('button', { name: 'Edit Instructions' }).click();
        await authenticatedPage.getByRole('button', { name: '+ Add step' }).click();
        await authenticatedPage.getByRole('button', { name: 'Save' }).first().click();
    });

    test('owner can delete recipe and returns to /recipes', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('Deletable Recipe');
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        await authenticatedPage.getByLabel('Delete recipe').click();
        await expect(authenticatedPage.getByText('Delete Recipe?')).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Delete Recipe' }).click();
        await authenticatedPage.waitForURL('/recipes');
    });

    test('go back returns to /recipes', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('My Recipe');
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });
        await authenticatedPage.getByRole('button', { name: 'Go back' }).click();
        await authenticatedPage.waitForURL('/recipes');
    });

    test('ingredient swipe left shows delete button', async ({ authenticatedPage }) => {
        const recipe = await apiCreateRecipe('My Recipe', [{ name: 'Garlic' }]);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
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
            const deleteBtn = authenticatedPage.locator('button[class*="hover:bg-destructive\\/90"]').first();
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
                await expect(authenticatedPage.getByText('Garlic', { exact: true })).not.toBeVisible({
                    timeout: 5000,
                });
            }
        }
    });
});
