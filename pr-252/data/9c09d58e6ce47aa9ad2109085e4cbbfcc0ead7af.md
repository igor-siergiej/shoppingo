# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: preferred-units.spec.ts >> Preferred units >> imported ingredient amounts are converted to the chosen system
- Location: e2e/tests/preferred-units.spec.ts:16:4

# Error details

```
Test timeout of 8000ms exceeded.
```

```
Error: check: Test timeout of 8000ms exceeded.
Call log:
  - waiting for getByRole('radio', { name: /Metric/ })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - img "Shoppingo" [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e9]: Shoppingo
        - button "What's new in Shoppingo (version localhost)" [ref=e10]: vlocalhost
  - generic [ref=e12]:
    - img [ref=e14]
    - heading "Something went wrong" [level=1] [ref=e16]
    - paragraph [ref=e17]: An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
    - generic [ref=e18]:
      - button "Refresh Page" [ref=e19]:
        - img
        - text: Refresh Page
      - button "Go Home" [ref=e20]
```

# Test source

```ts
  1  | import { expect, test } from '../fixtures';
  2  | import { mockRecipeImport } from '../mocks/ai';
  3  | 
  4  | test.describe('Preferred units', () => {
  5  |     test('settings page persists the unit-system choice across reloads', async ({ authenticatedPage }) => {
  6  |         await authenticatedPage.goto('/settings');
  7  |         await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible();
  8  | 
  9  |         await authenticatedPage.getByRole('radio', { name: /Metric/ }).check();
  10 |         await expect(authenticatedPage.getByRole('radio', { name: /Metric/ })).toBeChecked();
  11 | 
  12 |         await authenticatedPage.reload();
  13 |         await expect(authenticatedPage.getByRole('radio', { name: /Metric/ })).toBeChecked();
  14 |     });
  15 | 
  16 |     test('imported ingredient amounts are converted to the chosen system', async ({ authenticatedPage }) => {
  17 |         await mockRecipeImport(authenticatedPage, {
  18 |             ok: {
  19 |                 title: 'Imported Cake',
  20 |                 link: 'https://example.com/cake',
  21 |                 instructions: ['Mix everything', 'Bake for 30 minutes'],
  22 |                 ingredients: [
  23 |                     { id: 'i1', name: 'Butter', quantity: 4, unit: 'oz' },
  24 |                     { id: 'i2', name: 'Garlic', quantity: 2, unit: 'cloves' },
  25 |                 ],
  26 |             },
  27 |         });
  28 | 
  29 |         await authenticatedPage.goto('/settings');
> 30 |         await authenticatedPage.getByRole('radio', { name: /Metric/ }).check();
     |                                                                       ^ Error: check: Test timeout of 8000ms exceeded.
  31 | 
  32 |         await authenticatedPage.goto('/recipes/new');
  33 |         await authenticatedPage.getByRole('button', { name: 'Import from a link' }).click();
  34 |         await authenticatedPage.getByLabel('Recipe Link').fill('https://example.com/cake');
  35 |         await authenticatedPage.getByRole('button', { name: 'Import recipe from link' }).click();
  36 | 
  37 |         // Butter (imperial) is converted; garlic (dimensionless) is left as-is.
  38 |         await expect(authenticatedPage.getByText('Butter')).toBeVisible();
  39 |         await expect(authenticatedPage.getByText('113 g')).toBeVisible();
  40 |         await expect(authenticatedPage.getByText('Garlic')).toBeVisible();
  41 |         await expect(authenticatedPage.getByText('2 cloves')).toBeVisible();
  42 |     });
  43 | });
  44 | 
```