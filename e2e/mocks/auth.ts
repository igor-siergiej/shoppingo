import type { Page } from '@playwright/test';
import type { User } from '@shoppingo/types';
import { MOCK_USER, MOCK_USER_2 } from './data/users';

const makePart = (obj: object | string) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64');

export const tokenFor = (user: User) =>
    [
        makePart({ alg: 'HS256', typ: 'JWT' }),
        makePart({ username: user.username, id: user.id, exp: 9999999999, iat: 1700000000 }),
        makePart('mock-signature'),
    ].join('.');

export const MOCK_TOKEN = tokenFor(MOCK_USER);
export const MOCK_TOKEN_2 = tokenFor(MOCK_USER_2);

export async function mockAuthRoutes(page: Page, user: User = MOCK_USER) {
    const token = tokenFor(user);

    await page.route('http://localhost:3008/login', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ token, user }),
        })
    );

    // useRegisterForm reads responseData.accessToken
    await page.route('http://localhost:3008/register', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: token, user }),
        })
    );

    await page.route('http://localhost:3008/refresh', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: token }),
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
            body: JSON.stringify({ success: true, payload: { id: user.id, username: user.username } }),
        })
    );
}
