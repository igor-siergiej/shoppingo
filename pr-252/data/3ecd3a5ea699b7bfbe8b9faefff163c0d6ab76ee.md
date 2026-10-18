# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account-resilience.spec.ts >> Sign in failures >> an unknown user gets the same treatment
- Location: e2e/tests/account-resilience.spec.ts:23:4

# Error details

```
Test timeout of 20000ms exceeded.
```

```
Error: fill: Test timeout of 20000ms exceeded.
Call log:
  - waiting for getByLabel('Username')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - img "Shoppingo" [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e9]: Shoppingo
        - button "What's new in Shoppingo (version localhost)" [ref=e10]: vlocalhost
  - generic [ref=e12]:
    - img [ref=e14]
    - heading "Something went wrong" [level=1] [ref=e16]
    - paragraph [ref=e17]: An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
    - generic [ref=e18]:
      - button "Refresh Page" [ref=e19]:
        - img
        - text: Refresh Page
      - button "Go Home" [ref=e20]
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test';
  2  | 
  3  | export class LoginPage {
  4  |     constructor(private page: Page) {}
  5  | 
  6  |     get heading() {
  7  |         return this.page.getByText('Login to your account', { exact: true });
  8  |     }
  9  | 
  10 |     get usernameInput() {
  11 |         return this.page.getByLabel('Username');
  12 |     }
  13 | 
  14 |     get passwordInput() {
  15 |         return this.page.getByLabel('Password');
  16 |     }
  17 | 
  18 |     get submitButton() {
  19 |         return this.page.getByRole('button', { name: 'Login' });
  20 |     }
  21 | 
  22 |     get errorMessage() {
  23 |         return this.page.locator('.text-red-600').first();
  24 |     }
  25 | 
  26 |     get registerLink() {
  27 |         return this.page.getByRole('link', { name: 'Sign up' });
  28 |     }
  29 | 
  30 |     async goto() {
  31 |         await this.page.goto('/login');
  32 |     }
  33 | 
  34 |     async login(username: string, password: string) {
> 35 |         await this.usernameInput.fill(username);
     |                                 ^ Error: fill: Test timeout of 20000ms exceeded.
  36 |         await this.passwordInput.fill(password);
  37 |         await this.submitButton.click();
  38 |     }
  39 | }
  40 | 
```