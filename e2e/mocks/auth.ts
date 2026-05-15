import type { Page } from '@playwright/test';
import { MOCK_USER, MOCK_USER_2 } from './data/users';

const makePart = (obj: object | string) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64');

export const MOCK_TOKEN = [
    makePart({ alg: 'HS256', typ: 'JWT' }),
    makePart({ username: MOCK_USER.username, id: MOCK_USER.id, exp: 9999999999, iat: 1700000000 }),
    makePart('mock-signature'),
].join('.');

export async function mockAuthRoutes(page: Page) {
    await page.route('http://localhost:3008/login', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }),
        })
    );

    // useRegisterForm reads responseData.accessToken
    await page.route('http://localhost:3008/register', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: MOCK_TOKEN, user: MOCK_USER }),
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

    // User search used by ManageUsersDrawer — useSearch expects { usernames, count, query, success }
    await page.route(/^http:\/\/localhost:3008\/search/, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: 'true',
                usernames: [MOCK_USER_2.username],
                count: 1,
                query: '',
            }),
        })
    );

    // Token verification — called by API middleware
    await page.route('http://localhost:3008/verify', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, payload: { id: MOCK_USER.id, username: MOCK_USER.username } }),
        })
    );
}
