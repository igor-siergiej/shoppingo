import type { Page } from '@playwright/test';

const makePart = (obj: object | string) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64');

export const MOCK_TOKEN = [
    makePart({ alg: 'HS256', typ: 'JWT' }),
    makePart({ username: 'testuser', id: 'user-testuser', exp: 9999999999, iat: 1700000000 }),
    makePart('mock-signature'),
].join('.');

export const MOCK_USER = { username: 'testuser', id: 'user-testuser' };

export async function mockAuthRoutes(page: Page) {
    await page.route('http://localhost:3008/login', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }),
        })
    );

    await page.route('http://localhost:3008/refresh', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: MOCK_TOKEN }),
        })
    );

    await page.route('http://localhost:3008/logout', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Logout successful' }),
        })
    );
}
