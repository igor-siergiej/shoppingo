import { expect, Page } from '@playwright/test';

import { ApiMocks } from './api-mocks';

export class TestHelpers {
    constructor(private page: Page) {}

    async login(username = 'testuser', password = 'password') {
        await this.page.goto('/login');
        await this.page.fill('[data-testid="username-input"]', username);
        await this.page.fill('[data-testid="password-input"]', password);
        await this.page.click('[data-testid="login-button"]');
        await this.page.waitForURL('/lists');
    }

    async logout() {
        await this.page.click('[data-testid="logout-button"]');
        await this.page.waitForURL('/login');
    }

    async createList(title: string) {
        await this.page.click('[data-testid="add-list-button"]');
        await this.page.fill('[data-testid="list-title-input"]', title);
        await this.page.click('[data-testid="create-list-button"]');
    }

    async addItemToList(itemName: string) {
        await this.page.click('[data-testid="add-item-button"]');
        await this.page.fill('[data-testid="item-name-input"]', itemName);
        await this.page.click('[data-testid="add-item-submit"]');
    }

    async checkItem(itemName: string) {
        const itemCheckbox = this.page.locator(`[data-testid="item-checkbox-${itemName}"]`);

        await itemCheckbox.check();
    }

    async uncheckItem(itemName: string) {
        const itemCheckbox = this.page.locator(`[data-testid="item-checkbox-${itemName}"]`);

        await itemCheckbox.uncheck();
    }

    async deleteItem(itemName: string) {
        // Set up dialog handler for confirmation
        this.page.on('dialog', async (dialog) => {
            await dialog.accept();
        });
        await this.page.click(`[data-testid="delete-item-${itemName}"]`);
    }

    async editItemName(oldName: string, newName: string) {
        await this.page.click(`[data-testid="edit-item-${oldName}"]`);
        await this.page.fill(`[data-testid="edit-input-${oldName}"]`, newName);
        await this.page.press(`[data-testid="edit-input-${oldName}"]`, 'Enter');
    }

    async clearSelectedItems() {
        await this.page.click('[data-testid="clear-selected-button"]');
    }

    async clearAllItems() {
        await this.page.click('[data-testid="clear-all-button"]');
    }

    async deleteList(listTitle: string) {
        // Set up dialog handler for confirmation
        this.page.on('dialog', async (dialog) => {
            await dialog.accept();
        });
        await this.page.click(`[data-testid="delete-list-${listTitle}"]`);
    }

    async editListName(oldTitle: string, newTitle: string) {
        await this.page.click(`[data-testid="edit-list-${oldTitle}"]`);
        await this.page.fill(`[data-testid="edit-input-${oldTitle}"]`, newTitle);
        await this.page.press(`[data-testid="edit-input-${oldTitle}"]`, 'Enter');
    }

    async navigateToList(listTitle: string) {
        await this.page.click(`[data-testid="list-link-${listTitle}"]`);
        await this.page.waitForURL(`/lists/${encodeURIComponent(listTitle)}`);
    }

    async goBack() {
        await this.page.click('[data-testid="back-button"]');
    }

    async waitForLoadingToFinish() {
        await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' });
    }

    async expectItemToBeVisible(itemName: string) {
        await expect(this.page.locator(`[data-testid="item-${itemName}"]`)).toBeVisible();
    }

    async expectItemToBeChecked(itemName: string) {
        await expect(this.page.locator(`[data-testid="item-checkbox-${itemName}"]`)).toBeChecked();
    }

    async expectItemToBeUnchecked(itemName: string) {
        await expect(this.page.locator(`[data-testid="item-checkbox-${itemName}"]`)).not.toBeChecked();
    }

    async expectListToBeVisible(listTitle: string) {
        await expect(this.page.locator(`[data-testid="list-${listTitle}"]`)).toBeVisible();
    }

    async expectErrorMessage(message: string) {
        await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message);
    }

    async expectSuccessMessage(message: string) {
        await expect(this.page.locator('[data-testid="success-message"]')).toContainText(message);
    }

    async setupMocks() {
        const apiMocks = new ApiMocks(this.page);

        await apiMocks.setupAllMocks();

        return apiMocks;
    }
}
