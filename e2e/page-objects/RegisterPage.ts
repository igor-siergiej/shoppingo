import type { Page } from '@playwright/test';

export class RegisterPage {
    constructor(private page: Page) {}

    get heading() {
        return this.page.getByText('Create your account', { exact: true });
    }

    get usernameInput() {
        return this.page.getByLabel('Username');
    }

    get passwordInput() {
        return this.page.getByLabel('Password', { exact: true });
    }

    get repeatPasswordInput() {
        return this.page.getByLabel('Repeat Password');
    }

    get submitButton() {
        return this.page.getByRole('button', { name: 'Create Account' });
    }

    get errorMessage() {
        return this.page.locator('.text-red-600').first();
    }

    get loginLink() {
        return this.page.getByRole('link', { name: 'Sign in' });
    }

    async goto() {
        await this.page.goto('/register');
    }

    async register(username: string, password: string, repeatPassword: string) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.repeatPasswordInput.fill(repeatPassword);
        await this.submitButton.click();
    }
}
