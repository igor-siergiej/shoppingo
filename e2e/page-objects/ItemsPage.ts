import type { Page } from '@playwright/test';

export class ItemsPage {
    constructor(private page: Page) {}

    get emptyStateText() {
        return this.page.getByText('No items yet').or(this.page.getByText('No tasks yet'));
    }

    get clearSelectedButton() {
        return this.page.getByRole('button', { name: 'Clear selected items' });
    }

    get clearAllButton() {
        return this.page.getByRole('button', { name: 'Remove all items' });
    }

    get goBackButton() {
        return this.page.getByRole('button', { name: 'Go back' });
    }

    get addItemDrawerTitle() {
        return this.page.getByText('Add New Item', { exact: true });
    }

    get itemNameInput() {
        return this.page.getByPlaceholder('Enter item name...');
    }

    get addItemSubmit() {
        return this.page.getByRole('button', { name: 'Add Item' });
    }

    get editItemDrawerTitle() {
        return this.page.getByText('Edit Item', { exact: true });
    }

    get saveChangesButton() {
        return this.page.getByRole('button', { name: 'Save Changes' });
    }

    itemRow(name: string) {
        return this.page.getByText(name, { exact: true }).first();
    }

    async goto(listTitle: string) {
        await this.page.goto(`/list/${listTitle}`);
    }

    async openAddItemDrawer() {
        await this.page.locator('button[class*="border-primary"]').first().click();
    }

    async addItem(name: string) {
        await this.openAddItemDrawer();
        await this.itemNameInput.fill(name);
        await this.addItemSubmit.click();
    }

    async swipeLeft(itemName: string) {
        const item = this.itemRow(itemName);
        const box = await item.boundingBox();
        if (!box) throw new Error(`Item "${itemName}" not found`);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await this.page.mouse.move(cx, cy);
        await this.page.mouse.down();
        await this.page.mouse.move(cx - 90, cy, { steps: 10 });
        await this.page.mouse.up();
        await this.page.waitForTimeout(200);
    }

    async swipeRight(itemName: string) {
        const item = this.itemRow(itemName);
        const box = await item.boundingBox();
        if (!box) throw new Error(`Item "${itemName}" not found`);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await this.page.mouse.move(cx, cy);
        await this.page.mouse.down();
        await this.page.mouse.move(cx + 90, cy, { steps: 10 });
        await this.page.mouse.up();
        await this.page.waitForTimeout(200);
    }

    async clearAllItems() {
        await this.clearAllButton.click();
        await this.page.getByRole('button', { name: 'Clear All Items' }).click();
    }

    async clearSelectedItems() {
        await this.clearSelectedButton.click();
        await this.page.getByRole('button', { name: 'Clear Selected' }).click();
    }
}
