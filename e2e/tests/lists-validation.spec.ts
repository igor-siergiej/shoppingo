import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';

test.describe('List title validation', () => {
    test('creating a list with an empty name is rejected and keeps the drawer open', async ({
        authenticatedPage,
        listsPage,
    }) => {
        await listsPage.goto();
        await listsPage.openAddListDrawer();
        await listsPage.addListSubmit.click();

        await expect(authenticatedPage.getByText('List name is required')).toBeVisible();
        await expect(listsPage.drawerTitle).toBeVisible();
    });

    test('a whitespace-only name is treated as empty', async ({ authenticatedPage, listsPage }) => {
        await listsPage.goto();
        await listsPage.openAddListDrawer();
        await listsPage.listNameInput.fill('   ');
        await listsPage.addListSubmit.click();

        await expect(authenticatedPage.getByText('List name is required')).toBeVisible();
    });

    test('the validation message clears once the user types', async ({ authenticatedPage, listsPage }) => {
        await listsPage.goto();
        await listsPage.openAddListDrawer();
        await listsPage.addListSubmit.click();
        await expect(authenticatedPage.getByText('List name is required')).toBeVisible();

        await listsPage.listNameInput.fill('Weekend');

        await expect(authenticatedPage.getByText('List name is required')).toHaveCount(0);
    });

    test('creating a list with an existing title never produces a duplicate', async ({
        authenticatedPage,
        listsPage,
    }) => {
        await apiCreateList('Groceries');
        await listsPage.goto();
        await expect(listsPage.listCard('Groceries')).toBeVisible();

        await listsPage.addList('Groceries');
        await expect(authenticatedPage.getByText('A list with that name already exists')).toBeVisible();
        await expect(listsPage.drawerTitle).toBeVisible();

        await authenticatedPage.reload();
        await expect(listsPage.listCard('Groceries')).toHaveCount(1);
    });

    test('renaming a list to an existing title keeps the original name', async ({ authenticatedPage, listsPage }) => {
        await apiCreateList('Groceries');
        await apiCreateList('Hardware');
        await listsPage.goto();
        await expect(listsPage.listCard('Hardware')).toBeVisible();

        await listsPage.listEditButton('Hardware').click();
        const input = authenticatedPage.getByRole('textbox');
        await input.fill('Groceries');
        await input.press('Enter');

        await expect(authenticatedPage.getByRole('textbox')).toHaveCount(0);
        await expect(listsPage.listCard('Hardware')).toBeVisible();
        await expect(listsPage.listCard('Groceries')).toHaveCount(1);
    });

    test('renaming a list to blank leaves it unchanged', async ({ authenticatedPage, listsPage }) => {
        await apiCreateList('Groceries');
        await listsPage.goto();

        await listsPage.listEditButton('Groceries').click();
        const input = authenticatedPage.getByRole('textbox');
        await input.fill('   ');
        await input.press('Enter');

        await expect(listsPage.listCard('Groceries')).toBeVisible();
    });

    test('Escape cancels a rename', async ({ authenticatedPage, listsPage }) => {
        await apiCreateList('Groceries');
        await listsPage.goto();

        await listsPage.listEditButton('Groceries').click();
        const input = authenticatedPage.getByRole('textbox');
        await input.fill('Something else');
        await input.press('Escape');

        await expect(listsPage.listCard('Groceries')).toBeVisible();
        await expect(listsPage.listCard('Something else')).toHaveCount(0);
    });
});
