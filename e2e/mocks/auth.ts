import type { Page } from '@playwright/test';
import type { User } from '@shoppingo/types';

import { refreshTokenFor, tokenFor } from '../../scripts/mock-kivo/tokens';

const DEFAULT_USER: User = { id: 'user-testuser', username: 'testuser' };
const DEFAULT_USER_2: User = { id: 'user-other', username: 'otheruser' };

// Expose the shared mock users so specs and helpers keep the same default that
// `e2e/global-setup.ts` seeds into the runtime mock.
export const MOCK_USER = DEFAULT_USER;
export const MOCK_USER_2 = DEFAULT_USER_2;

export const MOCK_TOKEN = tokenFor(DEFAULT_USER);
export const MOCK_TOKEN_2 = tokenFor(DEFAULT_USER_2);

export async function mockAuthRoutes(page: Page, user: User = MOCK_USER) {
    const accessToken = tokenFor(user);

    await page.route('http://localhost:3008/login', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ token: accessToken, user }),
        })
    );

    // useRegisterForm reads responseData.accessToken
    await page.route('http://localhost:3008/register', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: tokenFor(user), user }),
        })
    );

    await page.route('http://localhost:3008/refresh', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: refreshTokenFor(user) }),
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
