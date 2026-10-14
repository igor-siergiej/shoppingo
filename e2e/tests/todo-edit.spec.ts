import { apiCreateTodo, apiGetTodos } from '../api-helpers';
import { expect, test } from '../fixtures';

const TODAY = '2026-03-15';
const YESTERDAY = '2026-03-14';

test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.clock.setFixedTime(new Date(`${TODAY}T09:00:00`));
});

test.describe('Calendar: editing a todo', () => {
    test('changing the title and time updates the day list and is saved', async ({ authenticatedPage }) => {
        await apiCreateTodo({ title: 'Pay rent', dueDate: TODAY, time: '09:00' });
        await authenticatedPage.goto('/calendar');

        await authenticatedPage.getByRole('button', { name: 'Edit Pay rent' }).click();
        await expect(authenticatedPage.getByText('Edit Todo')).toBeVisible();
        await authenticatedPage.getByLabel('Title').fill('Pay rent and bills');
        await authenticatedPage.getByLabel('Time (Optional)').fill('17:30');
        await authenticatedPage.getByRole('button', { name: 'Save' }).click();

        await expect(authenticatedPage.getByRole('button', { name: 'Edit Pay rent and bills' })).toBeVisible();
        await expect(authenticatedPage.getByText('17:30')).toBeVisible();
        await expect.poll(async () => (await apiGetTodos()).map((t) => t.title)).toEqual(['Pay rent and bills']);
    });

    test('clearing the time makes the todo all day again', async ({ authenticatedPage }) => {
        await apiCreateTodo({ title: 'Call dentist', dueDate: TODAY, time: '11:00' });
        await authenticatedPage.goto('/calendar');

        await authenticatedPage.getByRole('button', { name: 'Edit Call dentist' }).click();
        await authenticatedPage.getByLabel('Time (Optional)').fill('');
        await authenticatedPage.getByRole('button', { name: 'Save' }).click();

        await expect(authenticatedPage.getByText('all day')).toBeVisible();
        await expect.poll(async () => (await apiGetTodos())[0]?.time).toBeUndefined();
    });

    test('an empty title is rejected and the drawer stays open', async ({ authenticatedPage }) => {
        await apiCreateTodo({ title: 'Water plants', dueDate: TODAY });
        await authenticatedPage.goto('/calendar');

        await authenticatedPage.getByRole('button', { name: 'Edit Water plants' }).click();
        await authenticatedPage.getByLabel('Title').fill('  ');
        await authenticatedPage.getByRole('button', { name: 'Save' }).click();

        await expect(authenticatedPage.getByText('Title is required')).toBeVisible();
        await expect(authenticatedPage.getByText('Edit Todo')).toBeVisible();
    });
});

test.describe('Calendar: day ordering and overdue', () => {
    test('a day lists all-day todos first, then timed ones by clock time', async ({ authenticatedPage }) => {
        await apiCreateTodo({ title: 'Evening run', dueDate: TODAY, time: '18:00' });
        await apiCreateTodo({ title: 'Anytime chore', dueDate: TODAY });
        await apiCreateTodo({ title: 'Morning standup', dueDate: TODAY, time: '08:30' });
        await authenticatedPage.goto('/calendar');

        await expect(authenticatedPage.locator('[data-todo-title]')).toHaveText([
            'all dayAnytime chore',
            '08:30Morning standup',
            '18:00Evening run',
        ]);
    });

    test('an unfinished todo from a past day is marked overdue, a finished one is not', async ({
        authenticatedPage,
    }) => {
        await apiCreateTodo({ title: 'Missed task', dueDate: YESTERDAY });
        await authenticatedPage.goto('/calendar');
        await authenticatedPage.getByTestId(`day-${YESTERDAY}`).click();

        const row = authenticatedPage.locator('[data-todo-title="Missed task"]');
        await expect(row.getByText('Overdue')).toBeVisible();

        await row.getByRole('checkbox').click();
        await expect(row.getByText('Overdue')).toHaveCount(0);
    });

    test('a todo due today is not overdue', async ({ authenticatedPage }) => {
        await apiCreateTodo({ title: 'Due today', dueDate: TODAY });
        await authenticatedPage.goto('/calendar');

        await expect(authenticatedPage.locator('[data-todo-title="Due today"]')).toBeVisible();
        await expect(authenticatedPage.getByText('Overdue')).toHaveCount(0);
    });
});
