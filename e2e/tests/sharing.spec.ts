import { apiCreateList } from '../api-helpers';
import { seedFriendship } from '../db-helpers';
import { expect, test } from '../fixtures';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';

const waitForListData = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 10000 });
};

const openManageUsers = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Manage Users' }).click();
    await expect(page.getByRole('heading', { name: 'Manage Users' })).toBeVisible();
};

test.describe('Share list on creation', () => {
    test('auto-shares a new list with a friend during creation', async ({ authenticatedPage }) => {
        // Sharing is friends-only — establish the friendship first.
        await seedFriendship(MOCK_USER, MOCK_USER_2);

        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('heading', { name: 'Your Lists', level: 2 })).toBeVisible();

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByText('Add New List', { exact: true })).toBeVisible();

        await authenticatedPage.getByLabel('List Name').fill('TeamList');

        // FriendPicker auto-selects all friends (seedAllByDefault): otheruser is toggled on.
        await expect(authenticatedPage.getByText('otheruser')).toBeVisible();
        await expect(authenticatedPage.getByRole('switch')).toBeChecked();

        await authenticatedPage.getByRole('button', { name: 'Add List' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'TeamList' })).toBeVisible();

        // The friend is a member: re-open the list and confirm the toggle is on.
        await authenticatedPage.goto('/list/TeamList');
        await waitForListData(authenticatedPage);
        await openManageUsers(authenticatedPage);

        await expect(authenticatedPage.getByText('otheruser')).toBeVisible();
        await expect(authenticatedPage.getByRole('switch')).toBeChecked();
    });
});

test.describe('Manage Users (list sharing)', () => {
    test('owner can open Manage Users drawer', async ({ authenticatedPage }) => {
        await apiCreateList('Shared List');
        await authenticatedPage.goto('/list/Shared List');
        await waitForListData(authenticatedPage);

        await openManageUsers(authenticatedPage);
    });

    test('current members are listed', async ({ authenticatedPage }) => {
        await apiCreateList('Team List');
        await authenticatedPage.goto('/list/Team List');
        await waitForListData(authenticatedPage);

        await openManageUsers(authenticatedPage);

        // Owner (testuser) is shown.
        await expect(authenticatedPage.getByText('testuser')).toBeVisible();
    });

    test('can add a friend as a member', async ({ authenticatedPage }) => {
        // Create the list BEFORE the friendship exists so it starts owner-only.
        await apiCreateList('My List');
        await seedFriendship(MOCK_USER, MOCK_USER_2);

        await authenticatedPage.goto('/list/My List');
        await waitForListData(authenticatedPage);
        await openManageUsers(authenticatedPage);

        // otheruser is a friend but not yet a member — toggle is off.
        await expect(authenticatedPage.getByText('otheruser')).toBeVisible();
        const toggle = authenticatedPage.getByRole('switch');
        await expect(toggle).not.toBeChecked();

        await Promise.all([
            authenticatedPage.waitForResponse((r) => r.url().includes('/users') && r.request().method() === 'POST'),
            toggle.click(),
        ]);

        await expect(toggle).toBeChecked();
    });

    test('owner badge is shown', async ({ authenticatedPage }) => {
        await apiCreateList('My List');
        await authenticatedPage.goto('/list/My List');
        await waitForListData(authenticatedPage);

        await openManageUsers(authenticatedPage);

        await expect(authenticatedPage.getByText('Owner')).toBeVisible();
    });

    test('can remove a member from the list with confirmation', async ({ authenticatedPage }) => {
        // Seed the friendship first so apiCreateList auto-shares the list with otheruser.
        await seedFriendship(MOCK_USER, MOCK_USER_2);
        await apiCreateList('My List');

        await authenticatedPage.goto('/list/My List');
        await waitForListData(authenticatedPage);
        await openManageUsers(authenticatedPage);

        // otheruser is a member — toggle is on.
        await expect(authenticatedPage.getByText('otheruser')).toBeVisible();
        const toggle = authenticatedPage.getByRole('switch');
        await expect(toggle).toBeChecked();

        // Toggling off asks for confirmation before removing.
        await toggle.click();
        await expect(authenticatedPage.getByText('Remove member?')).toBeVisible();
        await Promise.all([
            authenticatedPage.waitForResponse((r) => r.url().includes('/users') && r.request().method() === 'DELETE'),
            authenticatedPage.getByRole('button', { name: 'Remove' }).click(),
        ]);

        await expect(toggle).not.toBeChecked();
    });
});
