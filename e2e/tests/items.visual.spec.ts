import { apiAddItem, apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

const LIST_TITLE = 'Groceries';

test.describe('Items page visual regression', () => {
    test('empty state', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect(authenticatedPage.getByRole('button', { name: 'Go back' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('items-empty.png');
    });

    test('populated state', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Milk');
        await apiAddItem(LIST_TITLE, 'Bread');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect(authenticatedPage.getByText('Milk')).toBeVisible();
        await expect(authenticatedPage.getByText('Bread')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('items-populated.png');
    });
});
