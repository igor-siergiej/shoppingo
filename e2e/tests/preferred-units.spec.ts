import { expect, test } from '../fixtures';

test.describe('Preferred units', () => {
    test('settings page persists the unit-system choice across reloads', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');
        await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible();

        await authenticatedPage.getByRole('radio', { name: /Metric/ }).check();
        await expect(authenticatedPage.getByRole('radio', { name: /Metric/ })).toBeChecked();

        await authenticatedPage.reload();
        await expect(authenticatedPage.getByRole('radio', { name: /Metric/ })).toBeChecked();
    });

    test('imported ingredient amounts are converted to the chosen system', async ({ authenticatedPage }) => {
        await authenticatedPage.route('**/api/recipes/import**', (route) =>
            route.fulfill({
                json: {
                    title: 'Imported Cake',
                    link: 'https://example.com/cake',
                    instructions: ['Mix everything', 'Bake for 30 minutes'],
                    ingredients: [
                        { id: 'i1', name: 'Butter', quantity: 4, unit: 'oz' },
                        { id: 'i2', name: 'Garlic', quantity: 2, unit: 'cloves' },
                    ],
                },
            })
        );

        await authenticatedPage.goto('/settings');
        await authenticatedPage.getByRole('radio', { name: /Metric/ }).check();

        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Import from a link' }).click();
        await authenticatedPage.getByLabel('Recipe Link').fill('https://example.com/cake');
        await authenticatedPage.getByRole('button', { name: 'Import recipe from link' }).click();

        // Butter (imperial) is converted; garlic (dimensionless) is left as-is.
        await expect(authenticatedPage.getByText('113 g Butter')).toBeVisible();
        await expect(authenticatedPage.getByText('2 cloves Garlic')).toBeVisible();
    });
});
