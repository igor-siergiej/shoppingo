import { test as base, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { MOCK_TOKEN, mockAuthRoutes } from '../mocks/auth';
import { resolveMongoUri } from '../mongo-uri';
import { ItemsPage } from '../page-objects/ItemsPage';
import { ListsPage } from '../page-objects/ListsPage';
import { LoginPage } from '../page-objects/LoginPage';
import { RecipeDetailPage } from '../page-objects/RecipeDetailPage';
import { RecipesPage } from '../page-objects/RecipesPage';
import { RegisterPage } from '../page-objects/RegisterPage';

const MONGO_URI = resolveMongoUri();
const DB_NAME = 'shoppingo_e2e';

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
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        await db.collection('list').deleteMany({});
        await db.collection('recipe').deleteMany({});
        await client.close();

        await mockAuthRoutes(page);

        // Prevent image fetch errors — images are not under test
        await page.route(/\/api\/image\//, (route) =>
            route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('GIF89a', 'ascii') })
        );

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
export { mockAuthRoutes };
