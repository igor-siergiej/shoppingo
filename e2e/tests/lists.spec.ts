import { expect, mockApiRoutes, test } from '../fixtures';
import { makeList } from '../mocks/data/lists';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';

test.describe('Lists page', () => {
    test('shows Your Lists heading and empty state', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('heading', { name: 'Your Lists', level: 2 })).toBeVisible();
        await expect(authenticatedPage.getByText('No lists yet')).toBeVisible();
    });

    test('renders owned list cards', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage, {
            lists: [makeList({ title: 'Groceries' }), makeList({ title: 'Hardware' })],
        });
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('button', { name: 'Groceries' })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Hardware' })).toBeVisible();
    });

    test('shared list appears in Shared Lists section', async ({ authenticatedPage }) => {
        const sharedList = makeList({
            title: 'Shared Shopping',
            ownerId: MOCK_USER_2.id,
            users: [
                { id: MOCK_USER.id, username: MOCK_USER.username },
                { id: MOCK_USER_2.id, username: MOCK_USER_2.username },
            ],
        });
        await mockApiRoutes(authenticatedPage, { lists: [sharedList] });
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('heading', { name: 'Shared Lists', level: 2 })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: 'Shared Shopping' })).toBeVisible();
    });

    test('can add a new list', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/');

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();

        await expect(authenticatedPage.getByText('Add New List', { exact: true })).toBeVisible();
        await authenticatedPage.getByLabel('List Name').fill('New List');
        await authenticatedPage.getByRole('button', { name: 'Add List' }).click();

        await expect(authenticatedPage.getByRole('button', { name: 'New List' })).toBeVisible();
    });

    test('can add a TODO list', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/');

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();

        await authenticatedPage.getByLabel('List Name').fill('My Tasks');
        await authenticatedPage.getByLabel('TODO').click();
        await authenticatedPage.getByRole('button', { name: 'Add List' }).click();

        await expect(authenticatedPage.getByRole('button', { name: 'My Tasks' })).toBeVisible();
    });

    test('can delete a list', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage, {
            lists: [makeList({ title: 'To Delete' })],
        });
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('button', { name: 'To Delete' })).toBeVisible();

        // Click the X (delete) button — last button in the list card
        const card = authenticatedPage.getByRole('button', { name: 'To Delete' });
        const row = card.locator('../..');
        await row.getByRole('button').last().click();

        await expect(authenticatedPage.getByText('Delete List?')).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Delete List' }).click();

        await expect(authenticatedPage.getByRole('button', { name: 'To Delete' })).not.toBeVisible();
    });

    test('clicking a list navigates to items page', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage, {
            lists: [makeList({ title: 'Groceries' })],
        });
        await authenticatedPage.goto('/');
        await authenticatedPage.getByRole('button', { name: 'Groceries' }).click();
        await authenticatedPage.waitForURL('/list/Groceries');
    });

    test('navigate to recipes via toolbar', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/');
        await authenticatedPage.getByRole('button', { name: 'Recipes' }).click();
        await authenticatedPage.waitForURL('/recipes');
    });
});
