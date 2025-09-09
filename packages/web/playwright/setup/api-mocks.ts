import { Page } from '@playwright/test';

import { mockAuthResponse, mockItems, mockLists, mockRefreshResponse } from './test-data';

export class ApiMocks {
    constructor(private page: Page) {}

    async setupAuthMocks() {
        // Mock auth endpoints - intercept requests to localhost:3008
        await this.page.route('http://localhost:3008/login', async (route) => {
            console.log('Intercepting auth request to:', route.request().url());
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockAuthResponse),
            });
        });

        await this.page.route('http://localhost:3008/register', async (route) => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(mockAuthResponse),
            });
        });

        await this.page.route('http://localhost:3008/refresh', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockRefreshResponse),
            });
        });

        await this.page.route('http://localhost:3008/logout', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Logout successful' }),
            });
        });
    }

    async setupListMocks() {
        // Mock get lists endpoint
        await this.page.route('**/api/lists/user/*', async (route) => {
            console.log('Intercepting lists request to:', route.request().url());
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockLists.map(list => ({
                    id: list.id,
                    title: list.title,
                    dateAdded: list.dateAdded,
                    items: list.items,
                    users: list.users.map(user => ({ username: user.username })),
                }))),
            });
        });

        // Also add a catch-all for any API requests to see what's being requested
        await this.page.route('**/api/**', async (route) => {
            console.log('Intercepting API request to:', route.request().url());
            // Let it continue to the original handler if it's not a lists request
            await route.continue();
        });

        // Mock get specific list endpoint
        await this.page.route('**/api/lists/title/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockItems),
            });
        });

        // Mock add list endpoint
        await this.page.route('**/api/lists', async (route) => {
            if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'List created successfully' }),
                });
            }
        });

        // Mock add item endpoint
        await this.page.route('**/api/lists/*/items', async (route) => {
            if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Item added successfully' }),
                });
            }
        });

        // Mock update item endpoint
        await this.page.route('**/api/lists/*/items/*', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Item updated successfully' }),
                });
            }
        });

        // Mock delete item endpoint
        await this.page.route('**/api/lists/*/items/*', async (route) => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Item deleted successfully' }),
                });
            }
        });

        // Mock delete list endpoint
        await this.page.route('**/api/lists/*', async (route) => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'List deleted successfully' }),
                });
            }
        });

        // Mock clear list endpoint
        await this.page.route('**/api/lists/*/clear', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'List cleared successfully' }),
            });
        });

        // Mock clear selected items endpoint
        await this.page.route('**/api/lists/*/clearSelected', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Selected items cleared successfully' }),
            });
        });
    }

    async setupImageMocks() {
        // Mock image endpoint
        await this.page.route('**/api/image/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'image/png',
                body: Buffer.from('fake-image-data'),
            });
        });
    }

    async setupAllMocks() {
        await this.setupAuthMocks();
        await this.setupListMocks();
        await this.setupImageMocks();
    }

    async mockNetworkError(endpoint: string) {
        await this.page.route(endpoint, async (route) => {
            await route.abort('failed');
        });
    }

    async mockSlowResponse(endpoint: string, delay = 2000) {
        await this.page.route(endpoint, async (route) => {
            await new Promise(resolve => setTimeout(resolve, delay));
            await route.continue();
        });
    }
}
