import type { Page } from '@playwright/test';

export class RecipeDetailPage {
    constructor(private page: Page) {}

    get title() {
        return this.page.locator('h1').first();
    }

    get editTitleButton() {
        return this.page.getByLabel('Edit recipe title');
    }

    get deleteRecipeButton() {
        return this.page.getByLabel('Delete recipe');
    }

    get addToShoppingListButton() {
        return this.page.getByRole('button', { name: 'Add to shopping list' });
    }

    get goBackButton() {
        return this.page.getByRole('button', { name: 'Go back' });
    }

    get addLinkButton() {
        return this.page.getByRole('button', { name: 'Add Link' });
    }

    get editLinkButton() {
        return this.page.getByRole('button', { name: 'Edit Link' });
    }

    get linkInput() {
        return this.page.getByPlaceholder('https://...');
    }

    get saveButton() {
        return this.page.getByRole('button', { name: 'Save' }).first();
    }

    get cancelButton() {
        return this.page.getByRole('button', { name: 'Cancel' }).first();
    }

    get ingredientsHeading() {
        return this.page.getByRole('heading', { name: /Ingredients/ });
    }

    get editInstructionsButton() {
        return this.page.getByRole('button', { name: 'Edit Instructions' });
    }

    get selectIngredientsHeading() {
        return this.page.getByRole('heading', { name: 'Select Ingredients' });
    }

    ingredientRow(name: string) {
        return this.page.getByText(name, { exact: true }).first();
    }

    async goto(recipeId: string) {
        await this.page.goto(`/recipes/${recipeId}`);
    }

    async editTitle(newTitle: string) {
        await this.editTitleButton.click();
        const input = this.page.locator('input[autofocus], input').first();
        await input.clear();
        await input.fill(newTitle);
        await this.saveButton.click();
    }

    async deleteRecipe() {
        await this.deleteRecipeButton.click();
        await this.page.getByRole('button', { name: 'Delete Recipe' }).click();
    }

    async openAddIngredientDrawer() {
        await this.page.locator('button[class*="border-primary"]').first().click();
    }

    async swipeIngredientLeft(ingredientName: string) {
        const item = this.ingredientRow(ingredientName);
        const box = await item.boundingBox();
        if (!box) throw new Error(`Ingredient "${ingredientName}" not found`);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await this.page.mouse.move(cx, cy);
        await this.page.mouse.down();
        await this.page.mouse.move(cx - 90, cy, { steps: 10 });
        await this.page.mouse.up();
        await this.page.waitForTimeout(200);
    }

    async enterSelectMode() {
        await this.addToShoppingListButton.click();
    }

    async toggleIngredient(name: string) {
        await this.ingredientRow(name).click();
    }

    async confirmAddToList(listTitle: string) {
        await this.page.getByRole('button', { name: listTitle }).click();
        await this.page.getByRole('button', { name: /Add \d+ items/ }).click();
    }
}
