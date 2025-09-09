import { expect, test } from '@playwright/test';

import { TestHelpers } from './setup/test-helpers';

test.describe('Lists Management', () => {
    let helpers: TestHelpers;

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.setupMocks();
        await helpers.login();
    });

    test('should display user lists on lists page', async ({ page }) => {
        await page.goto('/lists');

        await expect(page.locator('[data-testid="list-Grocery List"]')).toBeVisible();
        await expect(page.locator('[data-testid="list-Weekend Shopping"]')).toBeVisible();
    });

    test('should allow user to create a new list', async ({ page }) => {
        await page.goto('/lists');

        await page.click('[data-testid="add-list-button"]');
        await page.fill('[data-testid="list-title-input"]', 'New Shopping List');
        await page.click('[data-testid="create-list-button"]');

        await expect(page.locator('[data-testid="list-New Shopping List"]')).toBeVisible();
    });

    test('should allow user to edit list name', async ({ page }) => {
        await page.goto('/lists');

        await helpers.editListName('Grocery List', 'Updated Grocery List');

        await expect(page.locator('[data-testid="list-Updated Grocery List"]')).toBeVisible();
        await expect(page.locator('[data-testid="list-Grocery List"]')).not.toBeVisible();
    });

    test('should allow user to delete a list', async ({ page }) => {
        await page.goto('/lists');

        await helpers.deleteList('Weekend Shopping');

        await expect(page.locator('[data-testid="list-Weekend Shopping"]')).not.toBeVisible();
    });

    test('should navigate to list items when clicking on list', async ({ page }) => {
        await page.goto('/lists');

        await helpers.navigateToList('Grocery List');

        await page.waitForURL('/lists/Grocery%20List');
        await expect(page.locator('[data-testid="list-title"]')).toContainText('Grocery List');
    });

    test('should show empty state when no lists exist', async ({ page }) => {
        // Mock empty lists response
        await page.route('**/api/lists/user/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        await page.goto('/lists');

        await expect(page.locator('[data-testid="empty-lists-message"]')).toBeVisible();
    });

    test('should handle list creation errors', async ({ page }) => {
        // Mock list creation error
        await page.route('**/api/lists', async (route) => {
            if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'List already exists' }),
                });
            }
        });

        await page.goto('/lists');

        await page.click('[data-testid="add-list-button"]');
        await page.fill('[data-testid="list-title-input"]', 'Duplicate List');
        await page.click('[data-testid="create-list-button"]');

        await expect(page.locator('[data-testid="error-message"]')).toContainText('List already exists');
    });

    test('should show loading state while fetching lists', async ({ page }) => {
        // Mock slow response
        await page.route('**/api/lists/user/*', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await route.continue();
        });

        await page.goto('/lists');

        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    });
});
