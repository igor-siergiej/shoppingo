import { seedFriendship } from '../db-helpers';
import { expect, test } from '../fixtures';
import { MOCK_USER, MOCK_USER_2 } from '../mocks/data/users';
import { settle } from './visual-helpers';

test.describe('Friends page visual regression', () => {
    test('empty state', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/friends');
        await expect(authenticatedPage.getByText('No friends yet')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('friends-empty.png');
    });

    test('populated state', async ({ authenticatedPage }) => {
        await seedFriendship(MOCK_USER, MOCK_USER_2);
        await authenticatedPage.goto('/friends');
        await expect(authenticatedPage.getByText(MOCK_USER_2.username)).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('friends-populated.png');
    });
});
