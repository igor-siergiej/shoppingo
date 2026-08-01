import { seedFriendship } from '../db-helpers';
import { expect, test } from '../fixtures';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';

const openAddFriendDrawer = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Add friend' }).click();
    await expect(page.getByRole('heading', { name: 'Add Friend' })).toBeVisible();
};

test.describe('Friends page', () => {
    test('shows empty state with no friends', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/friends');
        await expect(authenticatedPage.getByText('No friends yet')).toBeVisible();
    });

    test('lists a seeded friend and opens their detail page', async ({ authenticatedPage }) => {
        await seedFriendship(MOCK_USER, MOCK_USER_2);

        await authenticatedPage.goto('/friends');
        await expect(authenticatedPage.getByText(MOCK_USER_2.username)).toBeVisible();

        await authenticatedPage.getByText(MOCK_USER_2.username).click();
        await expect(authenticatedPage.getByRole('button', { name: 'Remove friend' })).toBeVisible();
    });

    test('can remove a friend with confirmation', async ({ authenticatedPage }) => {
        await seedFriendship(MOCK_USER, MOCK_USER_2);

        await authenticatedPage.goto('/friends');
        await authenticatedPage.getByText(MOCK_USER_2.username).click();

        await authenticatedPage.getByRole('button', { name: 'Remove friend' }).click();
        await expect(authenticatedPage.getByText('Remove friend?')).toBeVisible();

        await Promise.all([
            authenticatedPage.waitForResponse(
                (r) => r.url().includes('/api/friends/') && r.request().method() === 'DELETE'
            ),
            authenticatedPage.getByRole('alertdialog').getByRole('button', { name: 'Remove friend' }).click(),
        ]);

        await expect(authenticatedPage.getByText('No friends yet')).toBeVisible();
    });

    test('invite flow generates a shareable code', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/friends');
        await openAddFriendDrawer(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Invite a friend' }).click();

        const code = authenticatedPage.locator('p.font-mono');
        await expect(code).toBeVisible();
        await expect(code).toHaveText(/^[A-Z0-9]{6}$/);
        await expect(authenticatedPage.getByText(/^\d{2}:\d{2}$/)).toBeVisible();
    });

    test('redeeming your own generated code is rejected', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/friends');
        await openAddFriendDrawer(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Invite a friend' }).click();
        const code = await authenticatedPage.locator('p.font-mono').innerText();

        await authenticatedPage.getByRole('button', { name: 'Enter code' }).click();
        await authenticatedPage.locator('input[data-input-otp]').fill(code);
        await authenticatedPage.getByRole('button', { name: 'Add friend' }).click();

        await expect(authenticatedPage.getByText('You cannot redeem your own code')).toBeVisible();
    });

    test('redeeming a nonexistent code shows an error', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/friends');
        await openAddFriendDrawer(authenticatedPage);

        await authenticatedPage.getByRole('button', { name: 'Enter code' }).click();
        await authenticatedPage.locator('input[data-input-otp]').fill('ZZZZZZ');
        await authenticatedPage.getByRole('button', { name: 'Add friend' }).click();

        await expect(authenticatedPage.getByText('Code not found')).toBeVisible();
    });
});
