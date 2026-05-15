import { expect, mockApiRoutes, mockAuthRoutes, test } from '../fixtures';

test.describe('Login', () => {
    test('renders login form', async ({ page, loginPage }) => {
        await mockAuthRoutes(page);
        await loginPage.goto();
        await expect(loginPage.heading).toBeVisible();
        await expect(loginPage.usernameInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.submitButton).toBeVisible();
    });

    test('shows validation error on empty submit', async ({ page, loginPage }) => {
        await mockAuthRoutes(page);
        await loginPage.goto();
        await loginPage.submitButton.click();
        await expect(page.getByText('Username is required')).toBeVisible();
    });

    test('shows validation error for short username', async ({ page, loginPage }) => {
        await mockAuthRoutes(page);
        await loginPage.goto();
        await loginPage.usernameInput.fill('ab');
        await loginPage.submitButton.click();
        await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
    });

    test('valid credentials redirect to home', async ({ page, loginPage }) => {
        await mockAuthRoutes(page);
        await mockApiRoutes(page);
        await loginPage.goto();
        await loginPage.login('testuser', 'password123');
        await page.waitForURL('/');
        await expect(page.getByRole('heading', { name: 'Your Lists', level: 2 })).toBeVisible();
    });

    test('link navigates to register page', async ({ page, loginPage }) => {
        await mockAuthRoutes(page);
        await loginPage.goto();
        await loginPage.registerLink.click();
        await page.waitForURL('/register');
    });

    test('unauthenticated access to / redirects to /login', async ({ page }) => {
        await page.goto('/');
        await page.waitForURL('/login');
    });
});

test.describe('Register', () => {
    test('renders register form', async ({ page, registerPage }) => {
        await mockAuthRoutes(page);
        await registerPage.goto();
        await expect(registerPage.heading).toBeVisible();
        await expect(registerPage.usernameInput).toBeVisible();
        await expect(registerPage.passwordInput).toBeVisible();
        await expect(registerPage.repeatPasswordInput).toBeVisible();
        await expect(registerPage.submitButton).toBeVisible();
    });

    test('shows error when passwords do not match', async ({ page, registerPage }) => {
        await mockAuthRoutes(page);
        await registerPage.goto();
        await registerPage.register('newuser', 'password123', 'different');
        await expect(page.getByText('Passwords do not match')).toBeVisible();
    });

    test('valid registration redirects to home', async ({ page, registerPage }) => {
        await mockAuthRoutes(page);
        await mockApiRoutes(page);
        await registerPage.goto();
        await registerPage.register('newuser', 'password123', 'password123');
        await page.waitForURL('/');
    });

    test('link navigates to login page', async ({ page, registerPage }) => {
        await mockAuthRoutes(page);
        await registerPage.goto();
        await registerPage.loginLink.click();
        await page.waitForURL('/login');
    });
});

test.describe('Logout', () => {
    test('logout redirects to /login', async ({ authenticatedPage }) => {
        await mockApiRoutes(authenticatedPage);
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('heading', { name: 'Your Lists', level: 2 })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
        await authenticatedPage.getByRole('button', { name: 'Log out' }).click();
        await authenticatedPage.waitForURL('/login');
    });
});
