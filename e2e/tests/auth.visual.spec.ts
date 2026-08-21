import { expect, mockAuthRoutes, test } from '../fixtures';
import { settle } from './visual-helpers';

test.describe('Auth pages visual regression', () => {
    test('login default state', async ({ page, loginPage }) => {
        await mockAuthRoutes(page);
        await loginPage.goto();
        await expect(loginPage.heading).toBeVisible();
        await settle(page);
        await expect(page).toHaveScreenshot('login-default.png');
    });

    test('register default state', async ({ page, registerPage }) => {
        await mockAuthRoutes(page);
        await registerPage.goto();
        await expect(registerPage.heading).toBeVisible();
        await settle(page);
        await expect(page).toHaveScreenshot('register-default.png');
    });
});
