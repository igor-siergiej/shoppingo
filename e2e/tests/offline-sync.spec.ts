import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';

const LIST_TITLE = 'Offline List';

test.describe('Offline queue', () => {
    test('adding an item while offline queues it, then syncs once back online', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        // Wait for the items query to actually resolve — the add-item trigger only renders
        // once loaded, whereas "Go back" is static chrome and would let a race slip through.
        const addItemTrigger = authenticatedPage.locator('button[class*="border-primary"]').first();
        await expect(addItemTrigger).toBeVisible();

        await authenticatedPage.context().setOffline(true);
        await expect(authenticatedPage.getByText('You are offline')).toBeVisible();

        await addItemTrigger.click();
        await authenticatedPage.getByPlaceholder('Enter item name...').fill('Offline Eggs');
        await authenticatedPage.getByRole('button', { name: 'Add Item' }).click();

        // Optimistic UI shows the item immediately even though the write is only queued.
        await expect(authenticatedPage.getByText('Offline Eggs')).toBeVisible();
        await expect(authenticatedPage.getByText(/1 pending/)).toBeVisible();

        await authenticatedPage.context().setOffline(false);

        // The drainer fires on the browser 'online' event — wait for the queued write to land.
        await authenticatedPage.waitForResponse((r) => r.url().includes('/items') && r.request().method() === 'PUT');
        await expect(authenticatedPage.getByText(/pending/)).not.toBeVisible();

        // Reload to prove the item was actually persisted server-side, not just held locally.
        await authenticatedPage.reload();
        await expect(authenticatedPage.getByText('Offline Eggs')).toBeVisible();
    });

    test('toggling an item while offline persists the change once reconnected', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await authenticatedPage.getByPlaceholder('Enter item name...').fill('Milk');
        await authenticatedPage.getByRole('button', { name: 'Add Item' }).click();
        await expect(authenticatedPage.getByText('Milk')).toBeVisible();

        await authenticatedPage.context().setOffline(true);
        await authenticatedPage.getByText('Milk').click();

        await authenticatedPage.context().setOffline(false);
        await authenticatedPage.waitForResponse((r) => r.url().includes('/items/') && r.request().method() === 'POST');

        await authenticatedPage.reload();
        // Selected items render with the primary-tinted card styling — confirms the toggle survived the reload.
        await expect(authenticatedPage.locator('div[class*="bg-primary/10"]', { hasText: 'Milk' })).toBeVisible();
    });
});
