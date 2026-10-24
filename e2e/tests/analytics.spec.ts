import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';
import { ANALYTICS_WEBSITE_ID, mockAnalytics } from '../mocks/analytics';

const LIST_TITLE = 'Groceries';

test.describe('Analytics', () => {
    test.use({ trackAnalytics: true });

    test('the real tracker records the page view and item_added with its source', async ({ authenticatedPage }) => {
        const hits = await mockAnalytics(authenticatedPage);
        await apiCreateList(LIST_TITLE);

        // A legacy title URL: the list's own name must not reach analytics.
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        const pageViews = () => hits.filter((h) => !h.payload.name);
        await expect.poll(() => pageViews().map((h) => h.payload.website)).toContain(ANALYTICS_WEBSITE_ID);
        expect(pageViews().map((h) => new URL(h.payload.url).pathname)).toContain('/list/:list');
        expect(JSON.stringify(hits)).not.toContain(LIST_TITLE);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await authenticatedPage.getByPlaceholder('Enter item name...').fill('Eggs');
        await authenticatedPage.getByRole('button', { name: 'Add Item' }).click();
        await expect(authenticatedPage.getByText('Eggs')).toBeVisible();

        await expect
            .poll(() => hits.find((h) => h.payload.name === 'item_added')?.payload.data)
            .toEqual({ source: 'typed', count: 1, isGuest: false });
    });
});
