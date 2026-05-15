import { expect, test } from '@playwright/test';
import { mockAuthRoutes } from '../mocks/auth';

test('login navigates to homepage', async ({ page }) => {
    await mockAuthRoutes(page);

    await page.goto('/login');
    await expect(page.getByText('Login to your account', { exact: true })).toBeVisible();

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForURL('/');
    await expect(page.getByRole('heading', { name: 'Your Lists', level: 2 })).toBeVisible();
});
