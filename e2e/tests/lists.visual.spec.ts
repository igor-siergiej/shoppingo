import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

test.describe('Lists page visual regression', () => {
    test('empty state', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByText('No lists yet')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('lists-empty.png');
    });

    test('populated state', async ({ authenticatedPage }) => {
        await apiCreateList('Groceries');
        await apiCreateList('Hardware');
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('button', { name: 'Groceries' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Hardware' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('lists-populated.png');
    });
});
