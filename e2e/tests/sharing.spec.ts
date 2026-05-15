import { expect, mockApiRoutes, test } from '../fixtures';
import { makeList } from '../mocks/data/lists';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';

const waitForListData = async (page: import('@playwright/test').Page) => {
    // Empty state only renders after list data loads, which also sets currentList
    await page.getByText('No items yet').waitFor({ timeout: 10000 });
};

test.describe('Manage Users (list sharing)', () => {
    test('owner can open Manage Users drawer', async ({ authenticatedPage }) => {
        const list = makeList({ title: 'Shared List', ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { lists: [list], users: [MOCK_USER, MOCK_USER_2] });
        await authenticatedPage.goto(`/list/${list.title}`);
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'Manage Users' })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await expect(authenticatedPage.getByRole('heading', { name: 'Manage Users' })).toBeVisible();
    });

    test('current members are listed', async ({ authenticatedPage }) => {
        const list = makeList({
            title: 'Team List',
            ownerId: MOCK_USER.id,
            users: [
                { id: MOCK_USER.id, username: MOCK_USER.username },
                { id: MOCK_USER_2.id, username: MOCK_USER_2.username },
            ],
        });
        await mockApiRoutes(authenticatedPage, { lists: [list], users: [MOCK_USER, MOCK_USER_2] });
        await authenticatedPage.goto(`/list/${list.title}`);
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await expect(authenticatedPage.getByText(MOCK_USER.username)).toBeVisible();
        await expect(authenticatedPage.getByText(MOCK_USER_2.username)).toBeVisible();
    });

    test('can search and add a user', async ({ authenticatedPage }) => {
        const list = makeList({ title: 'My List', ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { lists: [list], users: [MOCK_USER, MOCK_USER_2] });
        await authenticatedPage.goto(`/list/${list.title}`);
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await authenticatedPage.getByPlaceholder('Search for users...').fill(MOCK_USER_2.username);
        await expect(authenticatedPage.getByRole('button', { name: MOCK_USER_2.username })).toBeVisible();
        await Promise.all([
            authenticatedPage.waitForResponse((r) => r.url().includes('/users') && r.request().method() === 'POST'),
            authenticatedPage.getByRole('button', { name: MOCK_USER_2.username }).click(),
        ]);

        // After add, drawer refetches; members count increases to 2
        await expect(authenticatedPage.getByText('Members (2)')).toBeVisible({ timeout: 10000 });
    });

    test('owner badge is shown', async ({ authenticatedPage }) => {
        const list = makeList({ title: 'My List', ownerId: MOCK_USER.id });
        await mockApiRoutes(authenticatedPage, { lists: [list], users: [MOCK_USER] });
        await authenticatedPage.goto(`/list/${list.title}`);
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Manage Users' }).click();

        await expect(authenticatedPage.getByText('Owner')).toBeVisible();
    });

    test('non-owner does not see Manage Users button', async ({ authenticatedPage }) => {
        const list = makeList({
            title: 'Not Mine',
            ownerId: MOCK_USER_2.id,
            users: [
                { id: MOCK_USER.id, username: MOCK_USER.username },
                { id: MOCK_USER_2.id, username: MOCK_USER_2.username },
            ],
        });
        await mockApiRoutes(authenticatedPage, { lists: [list], users: [MOCK_USER, MOCK_USER_2] });
        await authenticatedPage.goto(`/list/${list.title}`);
        await waitForListData(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await expect(authenticatedPage.getByRole('button', { name: 'Manage Users' })).not.toBeVisible();
    });
});
