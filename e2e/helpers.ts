import type { Page } from '@playwright/test';

export const TEST_USER = {
    username: `e2e_${Date.now()}`,
    password: 'Password123!',
};

export const todayKey = (): string => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const uniqueTitle = (prefix: string): string => `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

export const addTodo = async (page: Page, title: string): Promise<void> => {
    await page.getByTestId('add-todo-trigger').click();
    await page.getByLabel('Title').fill(title);
};
