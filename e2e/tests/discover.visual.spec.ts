import { E2E_OPENSEARCH_URL } from '../db-helpers';
import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

test.skip(!E2E_OPENSEARCH_URL, 'needs E2E_OPENSEARCH_URL (a dedicated OpenSearch for e2e)');

test.describe('Discover visual regression', () => {
    test('results', async ({ authenticatedPage, discoverPage }) => {
        await discoverPage.goto();
        await expect(discoverPage.card('Lemon Drizzle Cake')).toBeVisible();
        await expect(discoverPage.card('Beef Wellington')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('discover-results.png');
    });

    test('filters open', async ({ authenticatedPage, discoverPage }) => {
        await discoverPage.goto();
        await expect(discoverPage.card('Lemon Drizzle Cake')).toBeVisible();
        await discoverPage.openFilters();
        await expect(discoverPage.filterChip(/^Easy 3$/)).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('discover-filters.png');
    });

    test('recipe preview', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/discover/e2e-library-1');
        await expect(authenticatedPage.getByRole('heading', { name: 'Lemon Drizzle Cake' })).toBeVisible();
        await expect(authenticatedPage.getByRole('region', { name: 'Similar recipes' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('discover-preview.png');
    });
});
