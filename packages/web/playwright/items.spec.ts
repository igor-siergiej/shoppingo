import { expect, test } from '@playwright/test';

import { TestHelpers } from './setup/test-helpers';

test.describe('Items Management', () => {
    let helpers: TestHelpers;

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.setupMocks();
        await helpers.login();
        await helpers.navigateToList('Grocery List');
    });

    test('should display list items', async ({ page }) => {
        await expect(page.locator('[data-testid="item-Milk"]')).toBeVisible();
        await expect(page.locator('[data-testid="item-Bread"]')).toBeVisible();
        await expect(page.locator('[data-testid="item-Eggs"]')).toBeVisible();
    });

    test('should allow user to add new item', async ({ page }) => {
        await helpers.addItemToList('Apples');

        await expect(page.locator('[data-testid="item-Apples"]')).toBeVisible();
    });

    test('should allow user to check/uncheck items', async ({ page }) => {
        // Check an unchecked item
        await helpers.checkItem('Milk');
        await helpers.expectItemToBeChecked('Milk');

        // Uncheck a checked item
        await helpers.uncheckItem('Bread');
        await helpers.expectItemToBeUnchecked('Bread');
    });

    test('should allow user to edit item name', async ({ page }) => {
        await helpers.editItemName('Milk', 'Whole Milk');

        await expect(page.locator('[data-testid="item-Whole Milk"]')).toBeVisible();
        await expect(page.locator('[data-testid="item-Milk"]')).not.toBeVisible();
    });

    test('should allow user to delete item', async ({ page }) => {
        await helpers.deleteItem('Eggs');

        await expect(page.locator('[data-testid="item-Eggs"]')).not.toBeVisible();
    });

    test('should allow user to clear all selected items', async ({ page }) => {
        // First check some items
        await helpers.checkItem('Milk');
        await helpers.checkItem('Bread');

        // Clear selected items
        await helpers.clearSelectedItems();

        // Verify items are unchecked
        await helpers.expectItemToBeUnchecked('Milk');
        await helpers.expectItemToBeUnchecked('Bread');
    });

    test('should allow user to clear all items', async ({ page }) => {
        await helpers.clearAllItems();

        await expect(page.locator('[data-testid="empty-list-message"]')).toBeVisible();
    });

    test('should show item count and selected count', async ({ page }) => {
        await expect(page.locator('[data-testid="item-count"]')).toContainText('3 items');
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 selected');
    });

    test('should handle item addition errors', async ({ page }) => {
        // Mock item addition error
        await page.route('**/api/lists/*/items', async (route) => {
            if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Item already exists' }),
                });
            }
        });

        await helpers.addItemToList('Duplicate Item');

        await expect(page.locator('[data-testid="error-message"]')).toContainText('Item already exists');
    });

    test('should show loading state while adding item', async ({ page }) => {
        // Mock slow response
        await page.route('**/api/lists/*/items', async (route) => {
            if (route.request().method() === 'PUT') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await route.continue();
            }
        });

        await page.click('[data-testid="add-item-button"]');
        await page.fill('[data-testid="item-name-input"]', 'Slow Item');
        await page.click('[data-testid="add-item-submit"]');

        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    });

    test('should allow user to go back to lists', async ({ page }) => {
        await helpers.goBack();

        await page.waitForURL('/lists');
        await expect(page.locator('[data-testid="lists-container"]')).toBeVisible();
    });

    test('should show empty state when no items exist', async ({ page }) => {
        // Mock empty items response
        await page.route('**/api/lists/title/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        await page.reload();

        await expect(page.locator('[data-testid="empty-list-message"]')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
        // Mock network error
        await page.route('**/api/lists/*/items', async (route) => {
            if (route.request().method() === 'PUT') {
                await route.abort('failed');
            }
        });

        await helpers.addItemToList('Network Error Item');

        await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error');
    });
});
