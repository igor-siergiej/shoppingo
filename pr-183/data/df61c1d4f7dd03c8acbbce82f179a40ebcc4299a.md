# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Register >> shows error when passwords do not match
- Location: e2e/tests/auth.spec.ts:60:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Passwords do not match')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Passwords do not match')

```

```yaml
- banner:
  - img "Shoppingo"
  - text: Shoppingo
  - button "What's new in Shoppingo (version localhost)": vlocalhost
- main:
  - text: Create your account Enter your details below to create your account Username
  - textbox "Username":
    - /placeholder: Enter your username
    - text: newuser
  - text: Password
  - textbox "Password":
    - /placeholder: Enter your password
    - text: password123
  - paragraph: At least 8 characters, letters and digits only, must include both letters and a number.
  - text: Repeat Password
  - textbox "Repeat Password":
    - /placeholder: Repeat your password
    - text: different
  - paragraph: At least 8 characters, letters and digits only, must include both letters and a number
  - button "Create Account"
  - text: Already have an account?
  - link "Sign in":
    - /url: /login
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { expect, mockAuthRoutes, test } from '../fixtures';
  2  | 
  3  | test.describe('Login', () => {
  4  |     test('renders login form', async ({ page, loginPage }) => {
  5  |         await mockAuthRoutes(page);
  6  |         await loginPage.goto();
  7  |         await expect(loginPage.heading).toBeVisible();
  8  |         await expect(loginPage.usernameInput).toBeVisible();
  9  |         await expect(loginPage.passwordInput).toBeVisible();
  10 |         await expect(loginPage.submitButton).toBeVisible();
  11 |     });
  12 | 
  13 |     test('shows validation error on empty submit', async ({ page, loginPage }) => {
  14 |         await mockAuthRoutes(page);
  15 |         await loginPage.goto();
  16 |         await loginPage.submitButton.click();
  17 |         await expect(page.getByText('Username is required')).toBeVisible();
  18 |     });
  19 | 
  20 |     test('shows validation error for short username', async ({ page, loginPage }) => {
  21 |         await mockAuthRoutes(page);
  22 |         await loginPage.goto();
  23 |         await loginPage.usernameInput.fill('ab');
  24 |         await loginPage.submitButton.click();
  25 |         await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
  26 |     });
  27 | 
  28 |     test('valid credentials redirect to home', async ({ page, loginPage }) => {
  29 |         await mockAuthRoutes(page);
  30 |         await loginPage.goto();
  31 |         await loginPage.login('testuser', 'password123');
  32 |         await page.waitForURL('/');
  33 |         await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  34 |     });
  35 | 
  36 |     test('link navigates to register page', async ({ page, loginPage }) => {
  37 |         await mockAuthRoutes(page);
  38 |         await loginPage.goto();
  39 |         await loginPage.registerLink.click();
  40 |         await page.waitForURL('/register');
  41 |     });
  42 | 
  43 |     test('unauthenticated access to / redirects to /login', async ({ page }) => {
  44 |         await page.goto('/');
  45 |         await page.waitForURL('/login');
  46 |     });
  47 | });
  48 | 
  49 | test.describe('Register', () => {
  50 |     test('renders register form', async ({ page, registerPage }) => {
  51 |         await mockAuthRoutes(page);
  52 |         await registerPage.goto();
  53 |         await expect(registerPage.heading).toBeVisible();
  54 |         await expect(registerPage.usernameInput).toBeVisible();
  55 |         await expect(registerPage.passwordInput).toBeVisible();
  56 |         await expect(registerPage.repeatPasswordInput).toBeVisible();
  57 |         await expect(registerPage.submitButton).toBeVisible();
  58 |     });
  59 | 
  60 |     test('shows error when passwords do not match', async ({ page, registerPage }) => {
  61 |         await mockAuthRoutes(page);
  62 |         await registerPage.goto();
  63 |         await registerPage.register('newuser', 'password123', 'different');
> 64 |         await expect(page.getByText('Passwords do not match')).toBeVisible();
     |                                                                ^ Error: expect(locator).toBeVisible() failed
  65 |     });
  66 | 
  67 |     test('valid registration redirects to home', async ({ page, registerPage }) => {
  68 |         await mockAuthRoutes(page);
  69 |         await registerPage.goto();
  70 |         await registerPage.register('newuser', 'password123', 'password123');
  71 |         await page.waitForURL('/');
  72 |     });
  73 | 
  74 |     test('link navigates to login page', async ({ page, registerPage }) => {
  75 |         await mockAuthRoutes(page);
  76 |         await registerPage.goto();
  77 |         await registerPage.loginLink.click();
  78 |         await page.waitForURL('/login');
  79 |     });
  80 | });
  81 | 
  82 | test.describe('Logout', () => {
  83 |     test('logout redirects to /login', async ({ authenticatedPage }) => {
  84 |         await authenticatedPage.goto('/');
  85 |         await expect(authenticatedPage.getByRole('button', { name: 'Menu' })).toBeVisible();
  86 |         await authenticatedPage.getByRole('button', { name: 'Menu' }).click();
  87 |         await authenticatedPage.getByRole('button', { name: 'Log out' }).click();
  88 |         await authenticatedPage.waitForURL('/login');
  89 |     });
  90 | });
  91 | 
```