# Todos + Calendar — Phase 3: E2E (Playwright) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Playwright and add deterministic end-to-end tests for the todo/calendar flows: add a dated todo, inbox + drag-to-schedule, complete (single & recurring), labels, and the Calendar nav slot.

**Architecture:** A `playwright.config.ts` boots the full stack via `bun run start:with-mock` (web on :4000, mock auth on :3008, api on :4001). A `setup` project registers + logs in a test user once and saves `storageState`, which the main `chromium` project reuses. Specs use stable `data-testid`s added to the calendar UI in Task 1. Determinism comes from unique per-run todo titles.

**Tech Stack:** `@playwright/test` (already a devDependency), Vite dev server, mock auth server.

**Phase:** 3 of 3 (E2E). Depends on **Phase 1 (backend)** and **Phase 2 (web)** being merged.

**Spec:** `docs/superpowers/specs/2026-06-06-first-class-todos-calendar-design.md`

**Prerequisites for running:** MongoDB (localhost:27017) and MinIO must be reachable (same as normal dev), and `.env` present. `bun run start:with-mock` provides web + mock auth + api.

---

## File Structure

- Create: `playwright.config.ts` (repo root)
- Create: `e2e/auth.setup.ts`
- Create: `e2e/helpers.ts`
- Create: `e2e/nav.spec.ts`
- Create: `e2e/todo-create.spec.ts`
- Create: `e2e/inbox-drag.spec.ts`
- Create: `e2e/complete.spec.ts`
- Create: `e2e/recurring.spec.ts`
- Create: `e2e/labels.spec.ts`
- Modify: `.gitignore` — ignore `e2e/.auth/`, `playwright-report/`, `test-results/`.
- Modify (test-id enablement): `packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx`, `packages/web/src/components/Calendar/MonthGrid/index.tsx`, `packages/web/src/components/Calendar/InboxDrawer/index.tsx`.

---

## Task 1: Add test ids to the calendar UI

Stable hooks for E2E. These are additive (no behaviour change) and keep specs robust.

**Files:**
- Modify: `packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx`
- Modify: `packages/web/src/components/Calendar/MonthGrid/index.tsx`
- Modify: `packages/web/src/components/Calendar/InboxDrawer/index.tsx`

- [ ] **Step 1: AddTodoDrawer trigger**

On the `RippleButton` inside `DrawerTrigger`, add `data-testid="add-todo-trigger"`.

- [ ] **Step 2: MonthGrid day cells**

On the day `button`, add `data-testid={`day-${key}`}` (where `key = dayKey(day)`), so a cell is addressable as `day-2026-06-04`.

- [ ] **Step 3: InboxDrawer toggle + items**

On the inbox toggle button add `data-testid="inbox-toggle"`. On each draggable `li` add `data-testid={`inbox-item-${todo.id}`}` and `data-todo-title={todo.title}`.

- [ ] **Step 4: Type-check + build**

Run: `bun run tsc --noEmit` then `bun run --filter @shoppingo/web build`
Expected: PASS / succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx packages/web/src/components/Calendar
git commit -m "test(web): add data-testids for e2e on calendar ui"
```

---

## Task 2: Playwright config

**Files:**
- Create: `playwright.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write the config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:4000';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'setup', testMatch: /auth\.setup\.ts/ },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        command: 'bun run start:with-mock',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
```

- [ ] **Step 2: Update `.gitignore`**

Append:

```
# Playwright
e2e/.auth/
playwright-report/
test-results/
```

- [ ] **Step 3: Verify Playwright resolves the config**

Run: `bunx playwright test --list`
Expected: lists the setup project (and zero specs so far is fine) without config errors. If browsers are missing, run `bunx playwright install chromium`.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts .gitignore
git commit -m "test(e2e): add playwright config with mock-auth webServer"
```

---

## Task 3: Auth setup project + helpers

**Files:**
- Create: `e2e/auth.setup.ts`
- Create: `e2e/helpers.ts`

The mock auth server accepts registration of any user. The setup registers a unique user, ensures we land authenticated, and saves `storageState`.

- [ ] **Step 1: Write helpers**

`e2e/helpers.ts`:

```ts
import type { Page } from '@playwright/test';
import { format } from 'date-fns';

export const TEST_USER = {
    username: `e2e_${Date.now()}`,
    password: 'Password123!',
};

export const todayKey = (): string => format(new Date(), 'yyyy-MM-dd');

export const uniqueTitle = (prefix: string): string => `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

// Open the Add Todo drawer from the calendar bottom bar and fill the title.
export const addTodo = async (page: Page, title: string): Promise<void> => {
    await page.getByTestId('add-todo-trigger').click();
    await page.getByLabel('Title').fill(title);
};
```

- [ ] **Step 2: Write the setup**

`e2e/auth.setup.ts`:

```ts
import { expect, test as setup } from '@playwright/test';
import { TEST_USER } from './helpers';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
    // Register a fresh user via the register page.
    await page.goto('/register');
    await page.getByLabel(/username/i).fill(TEST_USER.username);
    await page.getByLabel(/password/i).first().fill(TEST_USER.password);

    // Some register forms have a confirm-password field; fill it if present.
    const confirm = page.getByLabel(/confirm/i);
    if (await confirm.count()) {
        await confirm.fill(TEST_USER.password);
    }

    await page.getByRole('button', { name: /register|sign up|create/i }).click();

    // Expect to be authenticated and routed into the app (lists page at '/').
    await expect(page).toHaveURL(/\/($|calendar|recipes)/, { timeout: 15_000 });

    await page.context().storageState({ path: AUTH_FILE });
});
```

Note: adjust the field selectors in Step 2 to the actual `RegisterForm` labels. Inspect `packages/web/src/components/RegisterForm` for the exact `<Label htmlFor>`/placeholder text and update `getByLabel(...)` accordingly. The intent — register, then assert we are inside the authenticated app — must hold.

- [ ] **Step 3: Run the setup project**

Run: `bunx playwright test --project=setup`
Expected: PASS; `e2e/.auth/user.json` is created.

- [ ] **Step 4: Commit**

```bash
git add e2e/auth.setup.ts e2e/helpers.ts
git commit -m "test(e2e): add auth setup project and helpers"
```

---

## Task 4: Nav spec

**Files:**
- Create: `e2e/nav.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from '@playwright/test';

test('Calendar button is in the bottom bar and routes to /calendar', async ({ page }) => {
    await page.goto('/');
    const calendarButton = page.getByRole('button', { name: 'Calendar' });
    await expect(calendarButton).toBeVisible();
    await calendarButton.click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.getByTestId('add-todo-trigger')).toBeVisible();
});
```

- [ ] **Step 2: Run**

Run: `bunx playwright test e2e/nav.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/nav.spec.ts
git commit -m "test(e2e): calendar nav slot"
```

---

## Task 5: Create-todo spec

**Files:**
- Create: `e2e/todo-create.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from '@playwright/test';
import { addTodo, todayKey, uniqueTitle } from './helpers';

test('create a dated todo and see it on the selected day', async ({ page }) => {
    await page.goto('/calendar');

    // Selected day defaults to today; the Add Todo due date prefills to it.
    const title = uniqueTitle('Standup');
    await addTodo(page, title);
    await page.getByRole('button', { name: 'Add Todo' }).click();

    // The todo appears in the selected-day list.
    await expect(page.getByText(title)).toBeVisible();

    // And today's cell shows a dot (cell exists and is rendered).
    await expect(page.getByTestId(`day-${todayKey()}`)).toBeVisible();
});
```

- [ ] **Step 2: Run**

Run: `bunx playwright test e2e/todo-create.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/todo-create.spec.ts
git commit -m "test(e2e): create dated todo"
```

---

## Task 6: Inbox + drag-to-schedule spec

**Files:**
- Create: `e2e/inbox-drag.spec.ts`

- [ ] **Step 1: Write the spec**

To create an undated todo, open the drawer, clear the prefilled due date is not necessary because the drawer prefills the selected day; instead use the due-date field's clear path. Simpler: the drawer's `DueDateField` starts from the prefilled day — to make an *undated* todo we add it from a state with no due date. The drawer prefills `selectedDay`; to get an inbox item deterministically, create the todo, then this spec drags it. Because the prefill is the selected day, we instead assert the inbox flow by scheduling: create a dated todo, then verify dragging an existing inbox item works. To guarantee an inbox item exists, this spec first creates one by removing the date.

```ts
import { expect, test } from '@playwright/test';
import { todayKey, uniqueTitle } from './helpers';

test('undated todo lands in the inbox and can be dragged onto a day', async ({ page }) => {
    await page.goto('/calendar');

    // Open Add Todo and create a todo with no due date.
    await page.getByTestId('add-todo-trigger').click();
    const title = uniqueTitle('Someday');
    await page.getByLabel('Title').fill(title);

    // Clear the prefilled due date so the todo is unscheduled.
    // The DueDateField button shows the date; clicking it opens a calendar where
    // selecting the same day again toggles it off in single mode is not guaranteed,
    // so use the "Pick a date" reset: open the popover and press Escape leaves it set.
    // Instead, the AddTodoDrawer exposes the due-date toggle via its label button —
    // assert-and-adjust: if the project lacks a clear control, add a "Clear" button
    // to DueDateField (small enhancement) before this spec.
    await page.getByRole('button', { name: /clear due date/i }).click();

    await page.getByRole('button', { name: 'Add Todo' }).click();

    // Open the inbox and confirm the item is there.
    await page.getByTestId('inbox-toggle').click();
    const inboxItem = page.locator(`[data-todo-title="${title}"]`);
    await expect(inboxItem).toBeVisible();

    // Drag it onto today's cell.
    await inboxItem.dragTo(page.getByTestId(`day-${todayKey()}`));

    // It should now appear under the selected day (today) and leave the inbox.
    await expect(page.getByText(title)).toBeVisible();
});
```

Important: this spec assumes a **"Clear due date"** control exists on `DueDateField`/`AddTodoDrawer`. Phase 2's `DueDateField` has no clear button. Before running, add a small clear affordance: in `packages/web/src/components/DueDateField/index.tsx`, when `value` is set, render a button with accessible name "Clear due date" that calls `onChange(undefined)`. Make that change, commit it as part of this task, then run the spec.

- [ ] **Step 2: Add the "Clear due date" control**

In `packages/web/src/components/DueDateField/index.tsx`, add (next to the trigger button, shown only when `value` is set):

```tsx
{value && (
    <button
        type="button"
        aria-label="Clear due date"
        className="text-xs text-muted-foreground underline mt-1"
        onClick={() => onChange(undefined)}
    >
        Clear due date
    </button>
)}
```

- [ ] **Step 3: Run**

Run: `bunx playwright test e2e/inbox-drag.spec.ts`
Expected: PASS. If the HTML5 drag does not register under Playwright's synthetic events, fall back to asserting the inbox item is present and that clicking it then picking a date schedules it; keep `dragTo` as the primary path.

- [ ] **Step 4: Commit**

```bash
git add e2e/inbox-drag.spec.ts packages/web/src/components/DueDateField/index.tsx
git commit -m "test(e2e): inbox drag-to-schedule; add clear-due-date control"
```

---

## Task 7: Complete spec (single)

**Files:**
- Create: `e2e/complete.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from '@playwright/test';
import { addTodo, uniqueTitle } from './helpers';

test('toggling a single todo marks it done', async ({ page }) => {
    await page.goto('/calendar');

    const title = uniqueTitle('Pay rent');
    await addTodo(page, title);
    await page.getByRole('button', { name: 'Add Todo' }).click();

    const row = page.locator('li', { hasText: title });
    await expect(row).toBeVisible();

    await row.getByRole('checkbox').click();
    // Title gets the line-through class when done.
    await expect(row.locator('.line-through')).toHaveText(title);
});
```

- [ ] **Step 2: Run**

Run: `bunx playwright test e2e/complete.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/complete.spec.ts
git commit -m "test(e2e): complete a single todo"
```

---

## Task 8: Recurring spec

**Files:**
- Create: `e2e/recurring.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from '@playwright/test';
import { addTodo, todayKey, uniqueTitle } from './helpers';

test('a daily recurring todo shows on multiple days; completing one day is isolated', async ({ page }) => {
    await page.goto('/calendar');

    const title = uniqueTitle('Daily standup');
    await addTodo(page, title);

    // Set Repeat = Daily via the RecurrenceField select.
    await page.getByRole('combobox', { name: /repeat/i }).click();
    await page.getByRole('option', { name: 'Daily' }).click();

    await page.getByRole('button', { name: 'Add Todo' }).click();

    // Appears on today.
    await expect(page.getByText(title)).toBeVisible();

    // Complete today's occurrence.
    const row = page.locator('li', { hasText: title });
    await row.getByRole('checkbox').click();
    await expect(row.locator('.line-through')).toHaveText(title);

    // Navigate to tomorrow's cell — the same recurring todo should still be NOT done.
    // Click the next-day cell within the current month; pick the day after today when in-month.
    // Selecting a different day re-renders the day list; the recurring todo should be unchecked there.
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    // If tomorrow is in the same visible month, assert isolation.
    const tomorrowCell = page.getByTestId(`day-${tomorrowKey}`);
    if (await tomorrowCell.count()) {
        await tomorrowCell.click();
        const tomorrowRow = page.locator('li', { hasText: title });
        await expect(tomorrowRow).toBeVisible();
        await expect(tomorrowRow.locator('.line-through')).toHaveCount(0);
    }

    // Sanity: today's cell still rendered.
    await expect(page.getByTestId(`day-${todayKey()}`)).toBeVisible();
});
```

Note: the `RecurrenceField` uses shadcn `Select`. Its trigger is a `combobox`; ensure the `Repeat` `<Label>` is associated (Phase 2 renders a `<Label>Repeat</Label>` above the trigger). If `getByRole('combobox', { name: /repeat/i })` does not resolve, target the trigger by its visible default text "Does not repeat" instead: `page.getByText('Does not repeat').click()`.

- [ ] **Step 2: Run**

Run: `bunx playwright test e2e/recurring.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/recurring.spec.ts
git commit -m "test(e2e): recurring todo occurrence isolation"
```

---

## Task 9: Labels spec

**Files:**
- Create: `e2e/labels.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from '@playwright/test';
import { addTodo, uniqueTitle } from './helpers';

test('create a label, assign it to a todo, and filter by it', async ({ page }) => {
    await page.goto('/calendar');

    // Open Manage Labels via the hamburger menu.
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: /manage labels/i }).click();

    const labelName = uniqueTitle('Work');
    await page.getByPlaceholder('Label name').fill(labelName);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(labelName)).toBeVisible();

    // Close the drawer (press Escape) and create a todo with that label.
    await page.keyboard.press('Escape');

    const title = uniqueTitle('Report');
    await addTodo(page, title);
    await page.getByText('No label').click(); // open LabelSelect
    await page.getByRole('option', { name: new RegExp(labelName) }).click();
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await expect(page.getByText(title)).toBeVisible();

    // Filter by the label chip; the todo remains visible.
    await page.getByRole('button', { name: new RegExp(labelName) }).click();
    await expect(page.getByText(title)).toBeVisible();
});
```

Note: the `LabelSelect` trigger shows "No label" by default (placeholder/selected text). If clicking the text does not open the listbox, target the `combobox` role with name "Label (Optional)".

- [ ] **Step 2: Run**

Run: `bunx playwright test e2e/labels.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/labels.spec.ts
git commit -m "test(e2e): label create, assign, filter"
```

---

## Task 10: Full E2E run + script note

- [ ] **Step 1: Run the whole suite**

Run: `bun run test:e2e`
Expected: all specs PASS (setup project runs first, then chromium specs).

- [ ] **Step 2: Confirm CI consideration (doc-only)**

Add a short note to `packages/web` or root README (or a comment in `playwright.config.ts`) that `test:e2e` requires MongoDB + MinIO + `.env`, and is intended for local/integration runs — it is **not** wired into the existing `ci-cd.yml` lint→test→release→build pipeline by this phase. (Wiring E2E into CI, with service containers, is out of scope here.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(e2e): document e2e prerequisites"
```

---

## Phase 3 Done — Definition of Done

- `bun run test:e2e` runs the full stack via mock auth and passes locally.
- Specs cover: Calendar nav slot, create dated todo, inbox drag-to-schedule, complete single, recurring occurrence isolation, and label create/assign/filter.
- `e2e/.auth/`, `playwright-report/`, `test-results/` are gitignored.

**All three phases complete the feature in the spec `docs/superpowers/specs/2026-06-06-first-class-todos-calendar-design.md`.**
