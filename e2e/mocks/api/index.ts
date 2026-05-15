import type { Page } from '@playwright/test';
import type { ListResponse, RecipeResponse, User } from '@shoppingo/types';
import { handleListRoute } from './lists';
import { handleRecipeRoute } from './recipes';

export interface MockState {
    lists: ListResponse[];
    recipes: RecipeResponse[];
    users: User[];
}

export async function mockApiRoutes(page: Page, initial: Partial<MockState> = {}): Promise<MockState> {
    const state: MockState = {
        lists: initial.lists ?? [],
        recipes: initial.recipes ?? [],
        users: initial.users ?? [],
    };

    await page.route(/^http:\/\/localhost:4000\/api\//, async (route) => {
        const url = new URL(route.request().url());
        const method = route.request().method().toUpperCase();
        const path = url.pathname;

        // Logs — swallow silently
        if (path === '/api/logs') {
            await route.fulfill({ status: 204, body: '' });
            return;
        }

        if (await handleListRoute(route, path, method, state)) return;
        if (await handleRecipeRoute(route, path, method, state)) return;

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
        });
    });

    return state;
}
