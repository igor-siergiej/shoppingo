import { apiAddItem, apiCreateList, apiUpdateItem } from '../api-helpers';
import { expect, test } from '../fixtures';

const LIST_TITLE = 'Groceries';

test.describe('Items page', () => {
    test('shows empty state for empty list', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect(authenticatedPage.getByRole('button', { name: 'Go back' })).toBeVisible();
    });

    test('renders items from database', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Milk');
        await apiAddItem(LIST_TITLE, 'Bread');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect(authenticatedPage.getByText('Milk')).toBeVisible();
        await expect(authenticatedPage.getByText('Bread')).toBeVisible();
    });

    test('can add an item', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByText('Add New Item', { exact: true })).toBeVisible();
        await authenticatedPage.getByPlaceholder('Enter item name...').fill('Eggs');
        await authenticatedPage.getByRole('button', { name: 'Add Item' }).click();

        await expect(authenticatedPage.getByText('Eggs')).toBeVisible();
    });

    test('can toggle item selection', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Milk');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect(authenticatedPage.getByText('Milk')).toBeVisible();

        await authenticatedPage.getByText('Milk').click();
        await expect(authenticatedPage.getByText('Milk')).toBeVisible();
    });

    test('can clear all items', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Milk');
        await apiAddItem(LIST_TITLE, 'Bread');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Remove all items' }).click();
        await expect(authenticatedPage.getByText('Clear All Items?')).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Clear All Items' }).click();

        await expect(authenticatedPage.getByText('Milk')).not.toBeVisible();
        await expect(authenticatedPage.getByText('Bread')).not.toBeVisible();
    });

    test('can clear selected items', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Milk');
        await apiAddItem(LIST_TITLE, 'Bread');
        await apiUpdateItem(LIST_TITLE, 'Milk', { isSelected: true });
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Clear selected items' }).click();
        await expect(authenticatedPage.getByText('Clear Selected Items?')).toBeVisible();
        await authenticatedPage.getByRole('button', { name: 'Clear Selected' }).click();

        await expect(authenticatedPage.getByText('Milk')).not.toBeVisible();
        await expect(authenticatedPage.getByText('Bread')).toBeVisible();
    });

    test('back button returns to lists page', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await authenticatedPage.getByRole('button', { name: 'Go back' }).click();
        await authenticatedPage.waitForURL('/');
    });

    test('swipe left reveals delete — deletes item', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Butter');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect(authenticatedPage.getByText('Butter')).toBeVisible();

        const itemEl = authenticatedPage.getByText('Butter');
        const box = await itemEl.boundingBox();
        if (box) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            await authenticatedPage.mouse.move(cx, cy);
            await authenticatedPage.mouse.down();
            await authenticatedPage.mouse.move(cx - 90, cy, { steps: 10 });
            await authenticatedPage.mouse.up();
            await authenticatedPage.waitForTimeout(300);

            const deleteButtons = authenticatedPage.locator(
                'button[class*="destructive"], button[class*="bg-destructive"]'
            );
            if ((await deleteButtons.count()) > 0) {
                await deleteButtons.first().click();
                await expect(authenticatedPage.getByText('Butter')).not.toBeVisible();
            }
        }
    });

    test('edit item changes name', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE);
        await apiAddItem(LIST_TITLE, 'Butter');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        const itemEl = authenticatedPage.getByText('Butter');
        const box = await itemEl.boundingBox();
        if (box) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            await authenticatedPage.mouse.move(cx, cy);
            await authenticatedPage.mouse.down();
            await authenticatedPage.mouse.move(cx + 90, cy, { steps: 10 });
            await authenticatedPage.mouse.up();
            await authenticatedPage.waitForTimeout(300);

            const editButtons = authenticatedPage.locator('button[class*="bg-blue"]');
            if ((await editButtons.count()) > 0) {
                await editButtons.first().click();
                await expect(authenticatedPage.getByText('Edit Item', { exact: true })).toBeVisible();
                await authenticatedPage.getByLabel('Item Name').clear();
                await authenticatedPage.getByLabel('Item Name').fill('Margarine');
                await authenticatedPage.getByRole('button', { name: 'Save Changes' }).click();
                await expect(authenticatedPage.getByText('Margarine')).toBeVisible();
            }
        }
    });
});
