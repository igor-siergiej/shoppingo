import { expect, test } from '../fixtures';
import { settle } from './visual-helpers';

test.describe('Calendar page visual regression', () => {
    test('default state', async ({ authenticatedPage }) => {
        // The calendar renders the current month grid with "today" highlighted —
        // pin the clock before navigating so the baseline reflects a fixed date
        // instead of silently going stale/mismatched depending on which real-world
        // day the test happens to run. First use of page.clock in this e2e suite.
        await authenticatedPage.clock.setFixedTime(new Date('2026-03-15T09:00:00'));
        await authenticatedPage.goto('/calendar');
        await expect(authenticatedPage.getByTestId('add-todo-trigger')).toBeVisible();
        await settle(authenticatedPage);
        await expect(authenticatedPage).toHaveScreenshot('calendar-default.png');
    });
});
