import { apiAddItem, apiCreateList, apiCreateRecipe } from '../api-helpers';
import { expect, test } from '../fixtures';

const LIST_TITLE = 'Groceries';

test.describe('Add From Recipe drawer (items page)', () => {
    test('book icon opens "Choose Recipe" drawer', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiCreateRecipe('Pasta');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Add from recipe' }).click();
        await expect(authenticatedPage.getByText('Choose Recipe', { exact: true })).toBeVisible();
    });

    test('can search recipes in drawer', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiCreateRecipe('Pasta Bolognese');
        await apiCreateRecipe('Caesar Salad');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Add from recipe' }).click();
        await authenticatedPage.getByPlaceholder('Search recipes...').fill('pasta');

        await expect(authenticatedPage.getByText('Pasta Bolognese')).toBeVisible();
        await expect(authenticatedPage.getByText('Caesar Salad')).not.toBeVisible();
    });

    test('selecting a recipe shows its ingredients', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiCreateRecipe('My Soup', [{ name: 'Carrots' }, { name: 'Onion' }]);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Add from recipe' }).click();
        await authenticatedPage.getByText('My Soup').click();

        await expect(authenticatedPage.getByText('Select from My Soup')).toBeVisible();
        await expect(authenticatedPage.getByText('Carrots')).toBeVisible();
        await expect(authenticatedPage.getByText('Onion')).toBeVisible();
    });

    test('can add selected ingredients to list', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiCreateRecipe('My Soup', [{ name: 'Carrots' }, { name: 'Onion' }, { name: 'Celery' }]);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Add from recipe' }).click();
        await authenticatedPage.getByText('My Soup').click();

        await authenticatedPage.getByText('Carrots').click();
        await authenticatedPage.getByText('Onion').click();

        await authenticatedPage.getByRole('button', { name: /Add 2 items/ }).click();

        await expect(authenticatedPage.getByText('Carrots')).toBeVisible();
        await expect(authenticatedPage.getByText('Onion')).toBeVisible();
    });

    test('already-in-list items show "Already in list" label', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Carrots');
        await apiCreateRecipe('My Soup', [{ name: 'Carrots' }, { name: 'Onion' }]);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Add from recipe' }).click();
        await authenticatedPage.getByText('My Soup').click();

        await expect(authenticatedPage.getByText('Already in list')).toBeVisible();
        await expect(authenticatedPage.getByText('Onion')).toBeVisible();
    });

    test('back button returns to recipe list', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiCreateRecipe('My Soup', [{ name: 'Carrots' }]);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Add from recipe' }).click();
        await authenticatedPage.getByText('My Soup').click();
        await expect(authenticatedPage.getByText('Select from My Soup')).toBeVisible();

        await authenticatedPage.getByRole('button', { name: 'Back to recipes' }).click();
        await expect(authenticatedPage.getByText('Choose Recipe', { exact: true })).toBeVisible();
    });

    test('cancel closes the drawer', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiCreateRecipe('My Soup', [{ name: 'Carrots' }]);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Add from recipe' }).click();
        await authenticatedPage.getByText('My Soup').click();

        await authenticatedPage.getByRole('button', { name: 'Cancel' }).click();
        await expect(authenticatedPage.getByText('Choose Recipe')).not.toBeVisible();
    });
});
