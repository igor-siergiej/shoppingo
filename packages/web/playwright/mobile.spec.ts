import { expect, test } from '@playwright/test';

import { TestHelpers } from './setup/test-helpers';

test.describe('Mobile Experience', () => {
    let helpers: TestHelpers;

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.setupMocks();
        await helpers.login();
    });

    test('should work on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('/lists');

        // Verify mobile layout
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="list-Grocery List"]')).toBeVisible();
    });

    test('should handle mobile drawer interactions', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        await helpers.navigateToList('Grocery List');

        // Test mobile add item drawer
        await page.click('[data-testid="add-item-button"]');
        await expect(page.locator('[data-testid="mobile-drawer"]')).toBeVisible();

        await page.fill('[data-testid="item-name-input"]', 'Mobile Item');
        await page.click('[data-testid="add-item-submit"]');

        await expect(page.locator('[data-testid="item-Mobile Item"]')).toBeVisible();
    });

    test('should handle touch interactions', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        await helpers.navigateToList('Grocery List');

        await page.tap('[data-testid="item-checkbox-Milk"]');
        await helpers.expectItemToBeChecked('Milk');

        await page.tap('[data-testid="item-checkbox-Bread"]');
        await helpers.expectItemToBeUnchecked('Bread');
    });

    test('should handle mobile keyboard', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        await helpers.navigateToList('Grocery List');

        await page.click('[data-testid="add-item-button"]');
        await page.focus('[data-testid="item-name-input"]');

        await page.keyboard.type('Mobile Keyboard Test');
        await page.click('[data-testid="add-item-submit"]');

        await expect(page.locator('[data-testid="item-Mobile Keyboard Test"]')).toBeVisible();
    });

    test('should handle mobile swipe gestures', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        await helpers.navigateToList('Grocery List');

        const item = page.locator('[data-testid="item-Milk"]');

        await item.hover();

        await page.mouse.move(100, 200);
        await page.mouse.down();
        await page.mouse.move(50, 200);
        await page.mouse.up();

        await expect(page.locator('[data-testid="item-actions-Milk"]')).toBeVisible();
    });

    test('should handle mobile orientation change', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('/lists');
        await expect(page.locator('[data-testid="list-Grocery List"]')).toBeVisible();

        await page.setViewportSize({ width: 667, height: 375 });

        await expect(page.locator('[data-testid="list-Grocery List"]')).toBeVisible();
    });

    test('should handle mobile network conditions', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        await page.route('**/api/lists/user/*', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await route.continue();
        });

        await page.goto('/lists');

        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

        await expect(page.locator('[data-testid="list-Grocery List"]')).toBeVisible();
    });
});
