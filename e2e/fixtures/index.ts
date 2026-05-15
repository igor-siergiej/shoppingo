import { test as base, type Page } from '@playwright/test';
import { mockApiRoutes } from '../mocks/api';
import { MOCK_TOKEN, mockAuthRoutes } from '../mocks/auth';
import { ItemsPage } from '../page-objects/ItemsPage';
import { ListsPage } from '../page-objects/ListsPage';
import { LoginPage } from '../page-objects/LoginPage';
import { RecipeDetailPage } from '../page-objects/RecipeDetailPage';
import { RecipesPage } from '../page-objects/RecipesPage';
import { RegisterPage } from '../page-objects/RegisterPage';

interface Fixtures {
    authenticatedPage: Page;
    loginPage: LoginPage;
    registerPage: RegisterPage;
    listsPage: ListsPage;
    itemsPage: ItemsPage;
    recipesPage: RecipesPage;
    recipeDetailPage: RecipeDetailPage;
}

export const test = base.extend<Fixtures>({
    authenticatedPage: async ({ page }, use) => {
        await mockAuthRoutes(page);
        await page.addInitScript((token) => {
            localStorage.setItem('accessToken', token);
        }, MOCK_TOKEN);
        await use(page);
    },

    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },

    registerPage: async ({ page }, use) => {
        await use(new RegisterPage(page));
    },

    listsPage: async ({ authenticatedPage }, use) => {
        await use(new ListsPage(authenticatedPage));
    },

    itemsPage: async ({ authenticatedPage }, use) => {
        await use(new ItemsPage(authenticatedPage));
    },

    recipesPage: async ({ authenticatedPage }, use) => {
        await use(new RecipesPage(authenticatedPage));
    },

    recipeDetailPage: async ({ authenticatedPage }, use) => {
        await use(new RecipeDetailPage(authenticatedPage));
    },
});

export { expect } from '@playwright/test';
export { mockApiRoutes };
export { mockAuthRoutes };
