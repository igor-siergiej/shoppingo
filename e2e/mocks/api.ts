import type { Page } from '@playwright/test';

export async function mockApiRoutes(page: Page) {
    await page.route(/^http:\/\/localhost:4000\/api\//, (route) => {
        const url = new URL(route.request().url());
        const method = route.request().method();

        if (url.pathname.match(/^\/api\/lists\/user\//) && method === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
        });
    });
}
