import { apiAddItem, apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';

const LIST_TITLE = 'My Tasks';

test.describe('TODO list', () => {
    test('shows "No tasks yet" empty state', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE, 'todo');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);
        await expect(authenticatedPage.getByText('No tasks yet')).toBeVisible();
    });

    test('add task dialog title is "Add New Task"', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE, 'todo');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByText('Add New Task', { exact: true })).toBeVisible();
    });

    test('add task dialog shows due date field not quantity/unit', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE, 'todo');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await expect(authenticatedPage.getByText('Due Date (Optional)')).toBeVisible();
        await expect(authenticatedPage.getByLabel('Quantity')).not.toBeVisible();
        await expect(authenticatedPage.getByLabel('Unit')).not.toBeVisible();
    });

    test('can add a task without a due date', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE, 'todo');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await authenticatedPage.getByPlaceholder('Enter item name...').fill('Buy groceries');
        await authenticatedPage.getByRole('button', { name: 'Add Item' }).click();

        await expect(authenticatedPage.getByText('Buy groceries')).toBeVisible();
    });

    test('can add a task with a due date', async ({ authenticatedPage }) => {
        await apiCreateList(LIST_TITLE, 'todo');
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.locator('button[class*="border-primary"]').first().click();
        await authenticatedPage.getByPlaceholder('Enter item name...').fill('Pay bills');

        // Open the date picker
        await authenticatedPage.getByRole('button', { name: 'Pick a date' }).click();

        // Click the last available (enabled) day button in the calendar
        const dayButtons = authenticatedPage.locator('table button:not([disabled])');
        await dayButtons.last().click();

        // Picker trigger now shows a formatted date instead of "Pick a date"
        await expect(authenticatedPage.getByRole('button', { name: 'Pick a date' })).not.toBeVisible();

        await authenticatedPage.getByRole('button', { name: 'Add Item' }).click();
        await expect(authenticatedPage.getByText('Pay bills')).toBeVisible();
        // Due date badge (dd/MM/yyyy) appears alongside the task
        await expect(authenticatedPage.locator('text=/\\d{2}\\/\\d{2}\\/\\d{4}/').first()).toBeVisible();
    });

    test('due date badge renders on tasks added via API', async ({ authenticatedPage }) => {
        // Use a fixed future date so the expected badge text is deterministic
        const dueDateIso = '2030-06-15T12:00:00.000Z';
        const expectedBadgeText = '15/06/2030';

        await apiCreateList(LIST_TITLE, 'todo');
        await apiAddItem(LIST_TITLE, 'Call dentist', { dueDate: dueDateIso });
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await expect(authenticatedPage.getByText('Call dentist')).toBeVisible();
        await expect(authenticatedPage.getByText(expectedBadgeText)).toBeVisible();
    });
});
