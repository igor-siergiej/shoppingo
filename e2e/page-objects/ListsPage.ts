import type { Page } from '@playwright/test';

export class ListsPage {
    constructor(private page: Page) {}

    get yourListsHeading() {
        return this.page.getByRole('heading', { name: 'Your Lists', level: 2 });
    }

    get sharedListsHeading() {
        return this.page.getByRole('heading', { name: 'Shared Lists', level: 2 });
    }

    get emptyStateText() {
        return this.page.getByText('No lists yet');
    }

    get addListButton() {
        return this.page.getByTitle('Add List').or(this.page.locator('[data-vaul-drawer-wrapper] ~ * button').first());
    }

    get drawerTitle() {
        return this.page.getByText('Add New List', { exact: true });
    }

    get listNameInput() {
        return this.page.getByLabel('List Name');
    }

    get addListSubmit() {
        return this.page.getByRole('button', { name: 'Add List' });
    }

    get cancelButton() {
        return this.page.getByRole('button', { name: 'Cancel' }).first();
    }

    listCard(title: string) {
        return this.page.getByRole('button', { name: title });
    }

    listEditButton(title: string) {
        return this.listCard(title).locator('..').locator('..').getByRole('button').nth(1);
    }

    listDeleteButton(title: string) {
        return this.listCard(title).locator('..').locator('..').getByRole('button').last();
    }

    async goto() {
        await this.page.goto('/');
    }

    async openAddListDrawer() {
        await this.page.locator('button[class*="border-primary"]').first().click();
    }

    async addList(name: string) {
        await this.openAddListDrawer();
        await this.page.getByLabel('List Name').fill(name);
        await this.page.getByRole('button', { name: 'Add List' }).click();
    }

    async deleteList(title: string) {
        // Click the X button (last button in the list card row)
        const card = this.page.getByRole('button', { name: title });
        const row = card.locator('../..');
        await row.getByRole('button').last().click();
        // Confirm the alert dialog
        await this.page.getByRole('button', { name: 'Delete List' }).click();
    }

    async clickList(title: string) {
        await this.listCard(title).click();
    }

    async logout() {
        await this.page.getByRole('button', { name: 'Menu' }).click();
        await this.page.getByRole('button', { name: 'Log out' }).click();
    }
}
