import type { Page } from '@playwright/test';

export class LoginPage {
    constructor(private page: Page) {}

    get heading() {
        return this.page.getByText('Login to your account', { exact: true });
    }

    get usernameInput() {
        return this.page.getByLabel('Username');
    }

    get passwordInput() {
        return this.page.getByLabel('Password');
    }

    get submitButton() {
        return this.page.getByRole('button', { name: 'Login' });
    }

    get errorMessage() {
        return this.page.locator('.text-red-600').first();
    }

    get registerLink() {
        return this.page.getByRole('link', { name: 'Sign up' });
    }

    async goto() {
        await this.page.goto('/login');
    }

    async login(username: string, password: string) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }
}
