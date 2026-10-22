import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';
import { ANALYTICS_WEBSITE_ID, mockAnalytics } from '../mocks/analytics';

const LIST_TITLE = 'Groceries';

test.describe('Analytics', () => {
    test('the real tracker records the page view and item_added with its source', async ({ authenticatedPage }) => {
        const hits = await mockAnalytics(authenticatedPage);
        await apiCreateList(LIST_TITLE);

        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect
            .poll(() => hits.filter((h) => !h.payload.name).map((h) => h.payload.website))
            .toContain(ANALYTICS_WEBSITE_ID);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await authenticatedPage.getByPlaceholder('Enter item name...').fill('Eggs');
        await authenticatedPage.getByRole('button', { name: 'Add Item' }).click();
        await expect(authenticatedPage.getByText('Eggs')).toBeVisible();

        await expect
            .poll(() => hits.find((h) => h.payload.name === 'item_added')?.payload.data)
            .toEqual({ source: 'typed', count: 1 });
    });
});
