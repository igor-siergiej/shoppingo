import type { Page } from '@playwright/test';

export class RecipesPage {
    constructor(private page: Page) {}

    get yourRecipesHeading() {
        return this.page.getByRole('heading', { name: 'Your Recipes', level: 2 });
    }

    get sharedRecipesHeading() {
        return this.page.getByRole('heading', { name: 'Shared Recipes', level: 2 });
    }

    get emptyStateText() {
        return this.page.getByText('No recipes yet');
    }

    get searchInput() {
        return this.page.getByPlaceholder('Search recipes...');
    }

    get clearSearchButton() {
        return this.page.getByLabel('Clear search');
    }

    get drawerTitle() {
        return this.page.getByRole('heading', { name: 'Create Recipe' });
    }

    recipeCard(title: string) {
        return this.page.getByRole('button', { name: title });
    }

    async goto() {
        await this.page.goto('/recipes');
    }

    async navigate() {
        await this.page.getByRole('button', { name: 'Recipes' }).click();
    }

    async openAddRecipeDrawer() {
        await this.page.locator('button[class*="border-primary"]').first().click();
    }

    async addRecipe(title: string) {
        await this.openAddRecipeDrawer();
        await this.page.getByLabel('Recipe Title').fill(title);
        await this.page.getByRole('button', { name: 'Create Recipe' }).click();
    }

    async search(query: string) {
        await this.searchInput.fill(query);
    }

    async clickRecipe(title: string) {
        await this.recipeCard(title).click();
    }
}
