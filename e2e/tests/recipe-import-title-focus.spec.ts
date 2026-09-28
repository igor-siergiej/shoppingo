import { expect, test } from '../fixtures';

// Regression coverage for shoppingo-recipe-import-title-autofocus: the Recipe Title
// field's autoFocus used to fire unconditionally, popping the mobile keyboard and
// scrolling straight back to the top of the form right after a URL import had just
// populated it below — hiding the imported content the user came to look at.
test.describe('Recipe Title autofocus', () => {
    test('focuses the title field when starting a fresh manual entry', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Add manually' }).click();

        await expect(authenticatedPage.getByLabel('Recipe Title')).toBeFocused();
    });

    test('focuses the title field when switching from import to manual without importing', async ({
        authenticatedPage,
    }) => {
        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Import from a link' }).click();
        await authenticatedPage.getByRole('button', { name: 'or add manually instead' }).click();

        await expect(authenticatedPage.getByLabel('Recipe Title')).toBeFocused();
    });

    test('does not steal focus from the imported content after a URL import completes', async ({
        authenticatedPage,
    }) => {
        await authenticatedPage.route('**/api/recipes/import**', (route) =>
            route.fulfill({
                json: {
                    title: 'Imported Cake',
                    link: 'https://example.com/cake',
                    instructions: ['Mix everything', 'Bake for 30 minutes'],
                    ingredients: [{ id: 'i1', name: 'Flour', quantity: 200, unit: 'g' }],
                },
            })
        );

        await authenticatedPage.goto('/recipes/new');
        await authenticatedPage.getByRole('button', { name: 'Import from a link' }).click();
        await authenticatedPage.getByLabel('Recipe Link').fill('https://example.com/cake');
        await authenticatedPage.getByRole('button', { name: 'Import recipe from link' }).click();

        const titleInput = authenticatedPage.getByLabel('Recipe Title');
        await expect(titleInput).toHaveValue('Imported Cake');
        await expect(titleInput).not.toBeFocused();
    });
});
