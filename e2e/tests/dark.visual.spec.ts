import { apiAddItem, apiCreateList, apiCreateRecipe, apiCreateTodo, apiUpdateItem } from '../api-helpers';
import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

test.describe('Dark theme visual regression', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    });

    test('login', async ({ page, loginPage }) => {
        await loginPage.goto();
        await expect(loginPage.heading).toBeVisible();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await settle(page);
        await expect(page).toHaveScreenshot('dark-login.png');
    });

    test('lists', async ({ authenticatedPage }) => {
        await apiCreateList('Groceries');
        await apiCreateList('Hardware');
        await authenticatedPage.goto('/');
        await expect(authenticatedPage.getByRole('button', { name: 'Groceries' })).toBeVisible();
        await expect(authenticatedPage.locator('html')).toHaveClass(/dark/);
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('dark-lists.png');
    });

    test('items', async ({ authenticatedPage }) => {
        await apiCreateList('Groceries');
        await apiAddItem('Groceries', 'Milk');
        await apiAddItem('Groceries', 'Bread');
        await authenticatedPage.goto('/list/Groceries');
        await expect(authenticatedPage.getByText('Milk')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('dark-items.png');
    });

    test('calendar', async ({ authenticatedPage }) => {
        await authenticatedPage.clock.setFixedTime(new Date('2026-03-15T09:00:00'));
        await apiCreateTodo({ title: 'Missed task', dueDate: '2026-03-14' });
        await apiCreateTodo({ title: 'Anytime chore', dueDate: '2026-03-15' });
        await apiCreateTodo({ title: 'Morning standup', dueDate: '2026-03-15', time: '08:30' });
        await authenticatedPage.goto('/calendar');
        await expect(authenticatedPage.getByText('Morning standup')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('dark-calendar.png');
    });

    test('checked item and todo', async ({ authenticatedPage }) => {
        await apiCreateList('Groceries');
        await apiAddItem('Groceries', 'Milk');
        await apiAddItem('Groceries', 'Bread');
        await apiUpdateItem('Groceries', 'Bread', { isSelected: true });
        await authenticatedPage.goto('/list/Groceries');
        await expect(authenticatedPage.getByText('Bread')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('dark-items-checked.png');

        // The fixed clock also freezes Framer's frame loop, so a drawing stroke would be captured mid-draw;
        // reduced motion makes it appear instantly.
        await authenticatedPage.emulateMedia({ reducedMotion: 'reduce' });
        await authenticatedPage.clock.setFixedTime(new Date('2026-03-15T09:00:00'));
        await apiCreateTodo({ title: 'Anytime chore', dueDate: '2026-03-15' });
        await authenticatedPage.goto('/calendar');
        const todo = authenticatedPage.locator('li').filter({ hasText: 'Anytime chore' });
        await todo.getByRole('checkbox').click();
        await expect(todo.getByTestId('strike-drawn')).toHaveAttribute('data-struck', 'true');
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('dark-calendar-todo-done.png');
    });

    test('recipes', async ({ authenticatedPage }) => {
        await apiCreateRecipe('Caesar Salad', [], [], { prepTime: 15, cookTime: 10, servings: 4 });
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.getByRole('button', { name: 'Caesar Salad' })).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('dark-recipes.png');
    });
});
