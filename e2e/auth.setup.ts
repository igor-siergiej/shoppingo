import { expect, test as setup } from '@playwright/test';
import { TEST_USER } from './helpers';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill(TEST_USER.username);
    await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password);
    await page.getByLabel('Repeat Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    await page.context().storageState({ path: AUTH_FILE });
});
