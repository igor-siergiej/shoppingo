import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('Lists page', () => {
    test('shows Your Lists heading and empty state', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('heading', { name: 'Your Lists', level: 2 })).toBeVisible();
        await expect(authenticatedPage.getByText('No lists yet')).toBeVisible();
    });

    test('renders owned list cards', async ({ authenticatedPage }) => {
        await apiCreateList('Groceries');
        await apiCreateList('Hardware');
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('button', { name: 'Groceries' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Hardware' })).toBeVisible();
    });

    test('can add a new list', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/');
        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByText('Add New List', { exact: true })).toBeVisible();
        await authenticatedPage.getByLabel('List Name').fill('New List');
        await authenticatedPage.getByRole('button', { name: 'Add List' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'New List' })).toBeVisible();
    });

    test('can add a TODO list', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/');
        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await authenticatedPage.getByLabel('List Name').fill('My Tasks');
        await authenticatedPage.getByLabel('TODO').click();
        await authenticatedPage.getByRole('button', { name: 'Add List' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'My Tasks' })).toBeVisible();
    });

    test('can rename a list', async ({ authenticatedPage }) => {
        await apiCreateList('Old Name');
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('button', { name: 'Old Name' })).toBeVisible();

        const card = authenticatedPage.getByRole('button', { name: 'Old Name' });
        await card.locator('..').locator('..').getByRole('button').nth(1).click();

        const input = authenticatedPage.getByRole('textbox');
        await input.waitFor();
        await input.fill('New Name');
        await input.press('Enter');

        await expect(authenticatedPage.getByRole('button', { name: 'New Name' })).toBeVisible({ timeout: 10000 });
        await expect(authenticatedPage.getByRole('button', { name: 'Old Name' })).not.toBeVisible();
    });

    test('can delete a list', async ({ authenticatedPage }) => {
        await apiCreateList('To Delete');
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('button', { name: 'To Delete' })).toBeVisible();

        const card = authenticatedPage.getByRole('button', { name: 'To Delete' });
        const row = card.locator('../..');
        await row.getByRole('button').last().click();

        await expect(authenticatedPage.getByText('Delete List?')).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Delete List' }).click();

        await expect(authenticatedPage.getByRole('button', { name: 'To Delete' })).not.toBeVisible();
    });

    test('clicking a list navigates to items page', async ({ authenticatedPage }) => {
        await apiCreateList('Groceries');
        await authenticatedPage.goto('/');
        await authenticatedPage.getByRole('button', { name: 'Groceries' }).click();
        await authenticatedPage.waitForURL('/list/Groceries');
    });

    test('navigate to recipes via toolbar', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/');
        await authenticatedPage.getByRole('button', { name: 'Recipes' }).click();
        await authenticatedPage.waitForURL('/recipes');
    });
});
