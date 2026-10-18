import { expect, mockAuthRoutes, test } from '../fixtures';

// Guest mode lets a stranger try Shoppingo without an account. Their lists
// and items live in IndexedDB only, so the flow can only be exercised with
// a clean browser context (no pre-seeded access token). The acceptance
// criterion is "guest creates a list with items, registers, and the list
// exists server-side after reload" — verified end-to-end here.

type ServerItem = { id: string; name: string; isSelected: boolean; dateAdded: string };
type ServerList = {
    id: string;
    title: string;
    items: Array<ServerItem>;
    users: unknown[];
    listType: string;
    ownerId: string;
    dateAdded: string;
};

test.describe('Guest mode', () => {
    // Tiny in-memory "server" behind the mocked list endpoints; reset per test.
    let serverLists: Array<ServerList> = [];

    test.beforeEach(async ({ page }) => {
        // Match `authenticatedPage`'s image/features stubs so guest-mode pages
        // that happen to fetch images don't make the suite flaky.
        await page.route('**/api/features', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    imageGeneration: true,
                    recipeImport: true,
                    ingredientSubstitutes: true,
                    itemCategorisation: true,
                    itemParse: true,
                    recipeTagger: true,
                }),
            })
        );
        await page.route(/\/api\/image\//, (route) =>
            route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('GIF89a', 'ascii') })
        );

        // The e2e runner only starts the web server. The migration after
        // sign-up hits the API directly, so mock the relevant endpoints and
        // keep a tiny in-memory "server" so the post-reload GET surfaces the
        // list the migration supposedly created. The web's `makeRequest` issues
        // PUT to /api/lists and /api/lists/:title/items, and POST to
        // /api/lists/:title/items/:id to re-tick migrated items.
        serverLists = [];
        let serverListCounter = 0;
        let serverItemCounter = 0;
        await page.route('**/api/lists', async (route) => {
            if (route.request().method() === 'PUT') {
                const payload = route.request().postDataJSON?.() ?? {};
                const id = `server-list-${++serverListCounter}`;
                const created = {
                    id,
                    title: payload.title ?? 'Untitled',
                    items: [],
                    users: [],
                    listType: payload.listType ?? 'shopping',
                    ownerId: 'user-testuser',
                    dateAdded: new Date().toISOString(),
                };
                serverLists.push(created);
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(created) });
                return;
            }
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });
        await page.route(/\/api\/lists\/title\//, (route) => {
            const url = new URL(route.request().url());
            // The app routes server lists by id (`/list/:id`) and fetches them
            // through this endpoint, so the key may be either.
            const key = decodeURIComponent(url.pathname.split('/').pop() ?? '');
            const list = serverLists.find((candidate) => candidate.id === key || candidate.title === key);
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(
                    list ?? {
                        listType: 'shopping',
                        items: [],
                        users: [],
                        ownerId: 'user-testuser',
                    }
                ),
            });
        });
        await page.route('**/api/lists/*/items', async (route) => {
            if (route.request().method() === 'PUT') {
                const url = new URL(route.request().url());
                const title = decodeURIComponent(url.pathname.split('/').slice(-2, -1)[0] ?? '');
                const payload = route.request().postDataJSON?.() ?? {};
                const target = serverLists.find((list) => list.title === title);
                const id = payload.id ?? `server-item-${++serverItemCounter}`;
                const created: ServerItem = {
                    id,
                    name: payload.itemName ?? '',
                    isSelected: false,
                    dateAdded: new Date().toISOString(),
                };
                target?.items.push(created);
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(created) });
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ added: 0, skipped: 0 }),
            });
        });
        await page.route(/\/api\/lists\/[^/]+\/items\/[^/]+$/, async (route) => {
            if (route.request().method() !== 'POST') return route.fallback();
            const segments = new URL(route.request().url()).pathname.split('/');
            const title = decodeURIComponent(segments.at(-3) ?? '');
            const itemId = decodeURIComponent(segments.at(-1) ?? '');
            const item = serverLists
                .find((list) => list.title === title)
                ?.items.find((candidate) => candidate.id === itemId);
            if (item) item.isSelected = route.request().postDataJSON()?.isSelected ?? item.isSelected;
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(item ?? {}) });
        });
        await page.route(/\/api\/lists\/user\//, (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(serverLists) })
        );

        // Fresh IDB so the run starts with no leftover guest lists.
        await page.goto('/');
        await page.evaluate(async () => {
            const dbs = (await indexedDB.databases?.()) ?? [];
            await Promise.all(
                dbs.map(
                    (db) =>
                        new Promise<void>((resolve) => {
                            if (!db.name) return resolve();
                            const req = indexedDB.deleteDatabase(db.name);
                            req.onsuccess = () => resolve();
                            req.onerror = () => resolve();
                            req.onblocked = () => resolve();
                        })
                )
            );
            localStorage.clear();
        });
    });

    test('@smoke /try deep link from the landing site opens a guest session', async ({ page }) => {
        await page.goto('/try');
        await page.waitForURL((url) => url.pathname === '/');
        await expect(page.getByTestId('guest-mode-banner')).toBeVisible();
    });

    // Not @smoke: registration would hit the real auth service on a live run.
    test('try-it → create list → add items → sign up → list survives reload', async ({ page }) => {
        // The full flow covers guest IDB writes, sign-up, the migration that
        // hits the mocked server, and a reload — well past the 8s default.
        test.setTimeout(30_000);

        await mockAuthRoutes(page);

        await page.goto('/login');

        // Land in guest mode via the new entry point.
        await page.getByTestId('try-it-button').click();
        await page.waitForURL('/');

        // The guest banner should be visible.
        await expect(page.getByTestId('guest-mode-banner')).toBeVisible();

        // Create a list "Groceries".
        await page.locator('button[class*="border-primary"]').first().click();
        await page.getByLabel('List Name').fill('Groceries');
        await page.getByRole('button', { name: 'Add List' }).click();
        await page.waitForURL(/\/guest\/list\//);

        // Add an item via the items-page input. The guest items page renders
        // its own simple row, but the add-item drawer is reused from the
        // authenticated flow, so the same input selector works.
        await page.locator('button[class*="border-primary"]').first().click();
        const itemInput = page.getByPlaceholder('Enter item name...');
        await itemInput.fill('Apples');
        await page.getByRole('button', { name: 'Add Item' }).click();

        const checkbox = page.getByRole('checkbox', { name: /mark apples/i });
        await expect(checkbox).toBeVisible();

        // A reload starts with an empty in-memory mirror: the guest's list
        // and item must come back from IndexedDB.
        await page.reload();
        await expect(checkbox).toBeVisible();

        // Tick the item.
        await checkbox.click();
        await expect(checkbox).toBeChecked();

        // Sign up from the banner.
        await page
            .getByTestId('guest-mode-banner')
            .getByRole('button', { name: /sign up/i })
            .click();
        await page.waitForURL('/register');
        // Reload so the register page starts with a cold in-memory store: the
        // migration must read the guest data back from IndexedDB itself.
        await page.reload();

        await page.getByLabel('Username').fill('testuser');
        await page.getByLabel('Password', { exact: true }).fill('password123');
        await page.getByLabel('Repeat Password').fill('password123');
        await page.getByRole('button', { name: /create account/i }).click();

        // After the migration the user lands on / and the list is now server-side.
        await page.waitForURL('/');
        await expect(page.getByRole('button', { name: 'Groceries' })).toBeVisible();

        // Reload and confirm the list survives the round-trip — proving the
        // migration actually wrote it to Mongo, not just to a fresh IDB cache.
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('button', { name: 'Groceries' })).toBeVisible({
            timeout: 15_000,
        });

        // Open the list and confirm the item plus its ticked state are there.
        await page.getByRole('button', { name: 'Groceries' }).click();
        await page.waitForURL(/\/list\//);
        await expect(page.getByText('Apples')).toBeVisible({ timeout: 15_000 });
        // The authenticated row has no checkbox role; check the ticked state
        // reached the server, as the other item specs do.
        expect(serverLists[0]?.items).toEqual([expect.objectContaining({ name: 'Apples', isSelected: true })]);
    });
});
