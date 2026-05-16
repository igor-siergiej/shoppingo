import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';

const waitForListData = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 10000 });
};

test.describe('Share list on creation', () => {
    test('can share a list with a user during creation', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('heading', { name: 'Your Lists', level: 2 })).toBeVisible();

        // Open add list dialog
        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByText('Add New List', { exact: true })).toBeVisible();

        await authenticatedPage.getByLabel('List Name').fill('TeamList');

        // Search for user to share with
        await authenticatedPage.getByPlaceholder('Search users...').fill('other');
        await expect(authenticatedPage.getByRole('button', { name: 'otheruser' })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'otheruser' }).click();

        await authenticatedPage.getByRole('button', { name: 'Add List' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'TeamList' })).toBeVisible();

        // Navigate fresh to ensure list data (users) is fully loaded before checking members
        await authenticatedPage.goto('/list/TeamList');
        await authenticatedPage.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 10000 });
        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await expect(authenticatedPage.getByRole('heading', { name: 'Manage Users' })).toBeVisible();
        await expect(authenticatedPage.getByText('Members (2)')).toBeVisible({ timeout: 10000 });
        await expect(authenticatedPage.getByText('otheruser')).toBeVisible();
    });
});

test.describe('Manage Users (list sharing)', () => {
    test('owner can open Manage Users drawer', async ({ authenticatedPage }) => {
        await apiCreateList('Shared List');
        await authenticatedPage.goto('/list/Shared List');
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'Manage Users' })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await expect(authenticatedPage.getByRole('heading', { name: 'Manage Users' })).toBeVisible();
    });

    test('current members are listed', async ({ authenticatedPage }) => {
        await apiCreateList('Team List');
        await authenticatedPage.goto('/list/Team List');
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        // Owner (testuser) should be listed
        await expect(authenticatedPage.getByText('testuser')).toBeVisible();
    });

    test('can search and add a user', async ({ authenticatedPage }) => {
        await apiCreateList('My List');
        await authenticatedPage.goto('/list/My List');
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await authenticatedPage.getByPlaceholder('Search for users...').fill('otheruser');
        await expect(authenticatedPage.getByRole('button', { name: 'otheruser' })).toBeVisible();
        await Promise.all([
            authenticatedPage.waitForResponse((r) => r.url().includes('/users') && r.request().method() === 'POST'),
            authenticatedPage.getByRole('button', { name: 'otheruser' }).click(),
        ]);

        await expect(authenticatedPage.getByText('Members (2)')).toBeVisible({ timeout: 10000 });
    });

    test('owner badge is shown', async ({ authenticatedPage }) => {
        await apiCreateList('My List');
        await authenticatedPage.goto('/list/My List');
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await expect(authenticatedPage.getByText('Owner')).toBeVisible();
    });

    test('can remove a user from the list', async ({ authenticatedPage }) => {
        await apiCreateList('My List');
        await authenticatedPage.goto('/list/My List');
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await authenticatedPage.getByPlaceholder('Search for users...').fill('otheruser');
        await expect(authenticatedPage.getByRole('button', { name: 'otheruser' })).toBeVisible();
        await Promise.all([
            authenticatedPage.waitForResponse((r) => r.url().includes('/users') && r.request().method() === 'POST'),
            authenticatedPage.getByRole('button', { name: 'otheruser' }).click(),
        ]);
        await expect(authenticatedPage.getByText('Members (2)')).toBeVisible({ timeout: 10000 });

        await authenticatedPage.getByText('otheruser').locator('..').locator('..').getByRole('button').click();
        await authenticatedPage.getByRole('button', { name: 'Remove' }).click();

        await expect(authenticatedPage.getByText('Members (1)')).toBeVisible({ timeout: 10000 });
    });
});
