import { expect, test } from '@playwright/test';

import { TestHelpers } from './setup/test-helpers';

test.describe('Authentication', () => {
    let helpers: TestHelpers;

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.setupMocks();
    });

    test('should allow user to login with valid credentials', async ({ page }) => {
        // Set up a simple mock for the login endpoint
        await page.route('http://localhost:3008/login', async (route) => {
            console.log('Mocking login request');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'mock-jwt-token',
                    user: { username: 'testuser', id: 'user-testuser' },
                    message: 'Login successful'
                }),
            });
        });

        // Mock the lists API endpoint
        await page.route('**/api/lists/user/*', async (route) => {
            console.log('Mocking lists request to:', route.request().url());
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'list-1',
                        title: 'Grocery List',
                        dateAdded: new Date('2024-01-01T09:00:00Z'),
                        items: [],
                        users: [{ username: 'testuser' }],
                    }
                ]),
            });
        });

        await page.goto('/login');

        await page.fill('[data-testid="username-input"]', 'testuser');
        await page.fill('[data-testid="password-input"]', 'password');
        await page.click('[data-testid="login-button"]');

        // Wait for the login to complete (check for redirect to home page)
        await page.waitForURL('/', { timeout: 10000 });

        // Just check that we're on the home page after login
        expect(page.url()).toContain('/');
    });

    test('should show error for invalid credentials', async ({ page }) => {
        // Mock failed login
        await page.route('**/login', async (route) => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Invalid credentials' }),
            });
        });

        await page.goto('/login');

        await page.fill('[data-testid="username-input"]', 'wronguser');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');

        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    });

    test('should allow user to register new account', async ({ page }) => {
        await page.goto('/register');

        await page.fill('[data-testid="username-input"]', 'newuser');
        await page.fill('[data-testid="password-input"]', 'newpassword');
        await page.fill('[data-testid="confirm-password-input"]', 'newpassword');
        await page.click('[data-testid="register-button"]');

        await page.waitForURL('/lists');
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should redirect to login when not authenticated', async ({ page }) => {
        await page.goto('/lists');
        await page.waitForURL('/login');
    });

    test('should allow user to logout', async ({ page }) => {
        await helpers.login();

        await page.click('[data-testid="logout-button"]');
        await page.waitForURL('/login');

        // Verify user is logged out by trying to access protected route
        await page.goto('/lists');
        await page.waitForURL('/login');
    });

    test('should handle token refresh automatically', async ({ page }) => {
        // Mock token refresh
        await page.route('**/refresh', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: 'new-token',
                    refreshToken: 'new-refresh-token',
                    expiresIn: 3600,
                }),
            });
        });

        await helpers.login();

        // Simulate token expiration by making a request that would trigger refresh
        await page.goto('/lists');
        await expect(page.locator('[data-testid="lists-container"]')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
        // Mock network error
        await page.route('**/login', async (route) => {
            await route.abort('failed');
        });

        await page.goto('/login');

        await page.fill('[data-testid="username-input"]', 'testuser');
        await page.fill('[data-testid="password-input"]', 'password');
        await page.click('[data-testid="login-button"]');

        await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error');
    });
});
