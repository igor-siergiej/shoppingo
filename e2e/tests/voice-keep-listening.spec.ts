import { expect, test } from '../fixtures';

test.describe('Voice keep-listening setting', () => {
    test('persists across reloads', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');
        const toggle = authenticatedPage.getByRole('checkbox', { name: /Keep listening until I tap stop/ });
        await expect(toggle).not.toBeChecked();

        await toggle.check();
        await authenticatedPage.reload();

        await expect(toggle).toBeChecked();
    });
});
