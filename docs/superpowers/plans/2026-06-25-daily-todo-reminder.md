# Daily Todo Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send each user a single Web Push notification at 08:30 Europe/London every day summarising the todos they have due that day, reusing the existing shared-list push infrastructure.

**Architecture:** A shared recurrence module (moved into `@shoppingo/types`) provides `occursOn(todo, day)`. A new `TodoRepository.findDueCandidates` cheap-filters Mongo. `TodoReminderService` filters with `occursOn`, groups by owner, and fans out one summary push per owner via the existing `WebPushSender` + `PushSubscriptionRepository`. An in-process `DailyReminderScheduler` fires the sweep at the next DST-aware 08:30 UK and self-reschedules. Wired through the DI container and started in `onStartup`.

**Tech Stack:** TypeScript, Bun runtime + `Bun.serve`, Hono (`@imapps/api-utils/hono`), MongoDB native driver, `web-push`, `date-fns`, Bun native test runner (`bun:test`).

## Global Constraints

- Tests use Bun's native runner only — `import { ... } from 'bun:test'`. Never Vitest/Jest.
- API test coverage threshold is 90%.
- API runs as a SINGLE replica (the existing `NotificationService` in-memory debounce already assumes this); the scheduler may hold in-memory state.
- Reminder time is fixed at 08:30 `Europe/London` wall-clock (DST-aware), not a fixed UTC offset. No per-user time/timezone.
- Push send path, payload shape `{ title, body, data: { url } }`, and the service worker are unchanged.
- DI registrations use the existing factory-class pattern (`class { constructor() { return new X(...); } }` with the `@ts-expect-error` comment) in `packages/api/src/dependencies/index.ts`.
- Run Biome before any commit: `bun run lint:fix`.

---

### Task 1: Shared recurrence module + `occursOn`

Move the recurrence algorithm from web into `@shoppingo/types` so the API can reuse it, and add the `occursOn` predicate. Web keeps working via a thin re-export.

**Files:**
- Create: `packages/types/src/recurrence.ts`
- Create: `packages/types/src/recurrence.test.ts`
- Modify: `packages/types/src/index.ts` (append re-export)
- Modify: `packages/types/package.json` (add `date-fns` dependency)
- Modify: `packages/web/src/utils/recurrence.ts` (replace body with re-export)

**Interfaces:**
- Produces:
  - `expandOccurrences(todo: Todo, rangeStart: Date, rangeEnd: Date): Occurrence[]`
  - `isoDay(date: Date): string`
  - `occursOn(todo: Todo, day: Date): boolean`
  - `interface Occurrence { date: Date; done: boolean; }`
  - All exported from `@shoppingo/types`.

- [ ] **Step 1: Move the recurrence source into types**

Create `packages/types/src/recurrence.ts` with the existing algorithm (copied verbatim from `packages/web/src/utils/recurrence.ts`) plus the new `occursOn` export at the end:

```ts
import { addDays, addMonths, addWeeks, addYears, format, isAfter, isBefore } from 'date-fns';
import type { Recurrence, Todo } from './index';

export interface Occurrence {
    date: Date;
    done: boolean;
}

export const isoDay = (date: Date): string => format(date, 'yyyy-MM-dd');

const ADDERS = {
    daily: addDays,
    weekly: addWeeks,
    monthly: addMonths,
    yearly: addYears,
} as const;

const step = (date: Date, recurrence: Recurrence): Date => ADDERS[recurrence.freq](date, recurrence.interval);

const normalize = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const expandSingle = (todo: Todo, start: Date, end: Date): Occurrence[] => {
    const anchor = normalize(new Date(todo.dueDate as Date));
    if (isBefore(anchor, start) || isAfter(anchor, end)) return [];
    return [{ date: anchor, done: todo.done }];
};

const resolveLimit = (recurrence: Recurrence, end: Date): Date => {
    if (!recurrence.until) return end;
    const until = normalize(new Date(recurrence.until));
    return isBefore(until, end) ? until : end;
};

const toDoneSet = (dates: string[] | undefined): Set<string> => new Set(dates ?? []);

const expandRecurring = (todo: Todo, start: Date, end: Date): Occurrence[] => {
    const rec = todo.recurrence as Recurrence;
    const completed = toDoneSet(todo.completedDates);
    const limit = resolveLimit(rec, end);
    const occurrences: Occurrence[] = [];
    let cursor = normalize(new Date(todo.dueDate as Date));
    for (let i = 0; i < 1000 && !isAfter(cursor, limit); i += 1) {
        if (!isBefore(cursor, start)) {
            occurrences.push({ date: cursor, done: completed.has(isoDay(cursor)) });
        }
        cursor = step(cursor, rec);
    }
    return occurrences;
};

export const expandOccurrences = (todo: Todo, rangeStart: Date, rangeEnd: Date): Occurrence[] => {
    if (!todo.dueDate) return [];
    const start = normalize(rangeStart);
    const end = normalize(rangeEnd);
    return todo.recurrence ? expandRecurring(todo, start, end) : expandSingle(todo, start, end);
};

/** True if `todo` has an incomplete occurrence on `day` (single or recurring). */
export const occursOn = (todo: Todo, day: Date): boolean =>
    expandOccurrences(todo, day, day).some((o) => !o.done);
```

- [ ] **Step 2: Re-export from the types barrel**

Append to `packages/types/src/index.ts`:

```ts
export { expandOccurrences, isoDay, occursOn, type Occurrence } from './recurrence';
```

- [ ] **Step 3: Add date-fns to the types package**

In `packages/types/package.json`, add a `dependencies` block (the file currently has none):

```json
  "dependencies": {
    "date-fns": "^4.1.0"
  },
```

Then install from the repo root:

Run: `bun install`
Expected: completes, `date-fns` resolvable for `@shoppingo/types`.

- [ ] **Step 4: Replace the web util with a re-export**

Replace the ENTIRE contents of `packages/web/src/utils/recurrence.ts` with:

```ts
export { expandOccurrences, isoDay, occursOn, type Occurrence } from '@shoppingo/types';
```

(Existing importers `packages/web/src/utils/calendar.ts` and `packages/web/src/utils/recurrence.test.ts` import `{ expandOccurrences, isoDay }` from `./recurrence` and keep working unchanged.)

- [ ] **Step 5: Write the failing test for `occursOn`**

Create `packages/types/src/recurrence.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import type { Todo } from './index';
import { occursOn } from './recurrence';

const base: Todo = {
    id: 't1',
    ownerId: 'u1',
    title: 'Task',
    done: false,
    dateAdded: new Date('2026-06-01'),
};

const day = (s: string) => new Date(s);

describe('occursOn', () => {
    it('true for a single todo due on the day', () => {
        expect(occursOn({ ...base, dueDate: day('2026-06-25') }, day('2026-06-25'))).toBe(true);
    });

    it('false for a single todo due on another day', () => {
        expect(occursOn({ ...base, dueDate: day('2026-06-24') }, day('2026-06-25'))).toBe(false);
    });

    it('false for a done single todo', () => {
        expect(occursOn({ ...base, done: true, dueDate: day('2026-06-25') }, day('2026-06-25'))).toBe(false);
    });

    it('true for a daily recurrence landing on the day', () => {
        const todo: Todo = { ...base, dueDate: day('2026-06-01'), recurrence: { freq: 'daily', interval: 1 } };
        expect(occursOn(todo, day('2026-06-25'))).toBe(true);
    });

    it('false when recurrence has ended via until', () => {
        const todo: Todo = {
            ...base,
            dueDate: day('2026-06-01'),
            recurrence: { freq: 'daily', interval: 1, until: day('2026-06-10') },
        };
        expect(occursOn(todo, day('2026-06-25'))).toBe(false);
    });

    it('false when the recurring instance is already completed for that day', () => {
        const todo: Todo = {
            ...base,
            dueDate: day('2026-06-01'),
            recurrence: { freq: 'daily', interval: 1 },
            completedDates: ['2026-06-25'],
        };
        expect(occursOn(todo, day('2026-06-25'))).toBe(false);
    });

    it('false for an unscheduled (Inbox) todo with no dueDate', () => {
        expect(occursOn(base, day('2026-06-25'))).toBe(false);
    });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test packages/types/src/recurrence.test.ts`
Expected: PASS (7 tests). (`occursOn` already implemented in Step 1; this confirms the moved module + re-export resolve correctly.)

- [ ] **Step 7: Verify web still resolves the re-export**

Run: `bun test packages/web/src/utils/recurrence.test.ts`
Expected: PASS (existing web recurrence tests still green through the re-export).

- [ ] **Step 8: Type-check + lint**

Run: `bun run tsc --noEmit`
Expected: PASS (no broken imports across types/web/api).

Run: `bun run lint:fix`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add packages/types/src/recurrence.ts packages/types/src/recurrence.test.ts packages/types/src/index.ts packages/types/package.json packages/web/src/utils/recurrence.ts bun.lockb
git commit -m "refactor(types): move recurrence util into shared package, add occursOn"
```

---

### Task 2: `TodoRepository.findDueCandidates`

Add a cheap Mongo pre-filter returning incomplete todos whose `dueDate` is on or before the end of the target day. Exact day-matching is done later in code via `occursOn`.

**Files:**
- Modify: `packages/api/src/domain/TodoRepository/index.ts`
- Modify: `packages/api/src/infrastructure/MongoTodoRepository/index.ts`
- Modify: `packages/api/src/infrastructure/MongoTodoRepository/index.test.ts`

**Interfaces:**
- Produces: `TodoRepository.findDueCandidates(dayEnd: Date): Promise<Todo[]>`

- [ ] **Step 1: Add the method to the repository interface**

In `packages/api/src/domain/TodoRepository/index.ts`, add inside the interface (after `findByOwnerId`):

```ts
    /** Incomplete todos with a dueDate on or before `dayEnd` — recurring anchors included. */
    findDueCandidates(dayEnd: Date): Promise<Todo[]>;
```

- [ ] **Step 2: Write the failing repository test**

In `packages/api/src/infrastructure/MongoTodoRepository/index.test.ts`, add a test that asserts the query shape. Match the existing mock-collection style already used in that file (inspect the top of the file for the established `makeDb`/collection mock helper and reuse it). The assertion:

```ts
it('findDueCandidates queries incomplete todos due on or before dayEnd', async () => {
    const dayEnd = new Date('2026-06-25T23:59:59.999Z');
    const toArray = mock(async () => [] as Todo[]);
    const find = mock(() => ({ toArray }));
    const repo = makeRepo({ find }); // reuse the file's existing collection-mock helper

    await repo.findDueCandidates(dayEnd);

    expect(find).toHaveBeenCalledWith({ done: false, dueDate: { $lte: dayEnd } });
});
```

> If the existing test file does not expose a reusable `makeRepo`/`makeDb` helper, construct the `MongoTodoRepository` with the same inline `db` mock pattern the neighbouring tests use (a `getCollection` returning an object with `find`). Keep this test consistent with them.

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test packages/api/src/infrastructure/MongoTodoRepository/index.test.ts`
Expected: FAIL — `repo.findDueCandidates is not a function`.

- [ ] **Step 4: Implement the method**

In `packages/api/src/infrastructure/MongoTodoRepository/index.ts`, add after `findByOwnerId`:

```ts
    async findDueCandidates(dayEnd: Date): Promise<Todo[]> {
        return this.collection().find({ done: false, dueDate: { $lte: dayEnd } }).toArray();
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/api/src/infrastructure/MongoTodoRepository/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Type-check + lint**

Run: `bun run tsc --noEmit`
Expected: PASS.

Run: `bun run lint:fix`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/domain/TodoRepository/index.ts packages/api/src/infrastructure/MongoTodoRepository/index.ts packages/api/src/infrastructure/MongoTodoRepository/index.test.ts
git commit -m "feat(api): add TodoRepository.findDueCandidates"
```

---

### Task 3: `TodoReminderService`

Sweep due candidates, filter with `occursOn`, group by owner, send one summary push per owner, prune dead subscriptions. Mirrors `NotificationService.fanOut`.

**Files:**
- Create: `packages/api/src/domain/TodoReminderService/index.ts`
- Create: `packages/api/src/domain/TodoReminderService/index.test.ts`

**Interfaces:**
- Consumes:
  - `TodoRepository.findDueCandidates(dayEnd: Date): Promise<Todo[]>` (Task 2)
  - `occursOn(todo: Todo, day: Date): boolean` from `@shoppingo/types` (Task 1)
  - `PushSubscriptionRepository.findByUserIds(userIds: string[]): Promise<PushSubscription[]>`, `.deleteByEndpoints(endpoints: string[]): Promise<void>`
  - `WebPushSender.isConfigured(): boolean`, `.send(sub, payload: string): Promise<'ok' | 'gone' | 'error'>`
- Produces:
  - `class TodoReminderService` with `sendDailyReminders(now: Date): Promise<void>`
  - `formatDueBody(titles: string[]): string`

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/domain/TodoReminderService/index.test.ts`:

```ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PushSubscription, Todo } from '@shoppingo/types';
import { formatDueBody, TodoReminderService } from './index';

const NOW = new Date('2026-06-25T07:30:00.000Z'); // 08:30 BST

const todo = (over: Partial<Todo>): Todo => ({
    id: 'id',
    ownerId: 'u1',
    title: 'Task',
    done: false,
    dateAdded: new Date('2026-06-01'),
    dueDate: new Date('2026-06-25'),
    ...over,
});

const subFor = (userId: string, endpoint: string): PushSubscription => ({
    endpoint,
    userId,
    keys: { p256dh: 'p', auth: 'a' },
    dateAdded: new Date(),
});

const makePushRepo = (subs: PushSubscription[]) => ({
    findByUserIds: mock(async (ids: string[]) => subs.filter((s) => ids.includes(s.userId))),
    deleteByEndpoints: mock(async () => {}),
    upsert: mock(async () => {}),
    deleteByEndpoint: mock(async () => {}),
});

describe('formatDueBody', () => {
    it('lists a single todo', () => {
        expect(formatDueBody(['Pay rent'])).toBe('Pay rent');
    });
    it('lists up to three in full', () => {
        expect(formatDueBody(['Pay rent', 'Call dentist', 'Walk dog'])).toBe('Pay rent, Call dentist, Walk dog');
    });
    it('collapses the tail into "and N more"', () => {
        expect(formatDueBody(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C and 2 more');
    });
});

describe('TodoReminderService.sendDailyReminders', () => {
    let pushRepo: ReturnType<typeof makePushRepo>;
    let sender: { send: ReturnType<typeof mock>; isConfigured: () => boolean };

    beforeEach(() => {
        pushRepo = makePushRepo([subFor('u1', 'e1')]);
        sender = { send: mock(async () => 'ok' as const), isConfigured: () => true };
    });

    const service = (todos: Todo[]) =>
        new TodoReminderService(
            { findDueCandidates: mock(async () => todos) } as never,
            pushRepo as never,
            sender as never
        );

    it('sends ONE summary push per owner with all their due todos', async () => {
        await service([
            todo({ id: 'a', title: 'Pay rent' }),
            todo({ id: 'b', title: 'Call dentist' }),
        ]).sendDailyReminders(NOW);

        expect(sender.send).toHaveBeenCalledTimes(1);
        const [, payload] = sender.send.mock.calls[0];
        expect(JSON.parse(payload as string)).toEqual({
            title: 'Todos due today',
            body: 'Pay rent, Call dentist',
            data: { url: '/calendar' },
        });
    });

    it('groups by owner — one push each', async () => {
        pushRepo = makePushRepo([subFor('u1', 'e1'), subFor('u2', 'e2')]);
        await new TodoReminderService(
            { findDueCandidates: mock(async () => [todo({ ownerId: 'u1' }), todo({ ownerId: 'u2' })]) } as never,
            pushRepo as never,
            sender as never
        ).sendDailyReminders(NOW);

        expect(sender.send).toHaveBeenCalledTimes(2);
    });

    it('excludes todos not landing today (filtered by occursOn)', async () => {
        await service([
            todo({ dueDate: new Date('2026-06-24') }), // yesterday, non-recurring
            todo({ done: true }), // done
            todo({ recurrence: { freq: 'daily', interval: 1 }, completedDates: ['2026-06-25'] }), // already ticked
        ]).sendDailyReminders(NOW);

        expect(sender.send).not.toHaveBeenCalled();
    });

    it('includes a recurring todo whose rule lands today', async () => {
        await service([
            todo({ dueDate: new Date('2026-06-01'), recurrence: { freq: 'daily', interval: 1 } }),
        ]).sendDailyReminders(NOW);

        expect(sender.send).toHaveBeenCalledTimes(1);
    });

    it('prunes "gone" subscriptions', async () => {
        sender.send = mock(async () => 'gone' as const);
        await service([todo({})]).sendDailyReminders(NOW);
        expect(pushRepo.deleteByEndpoints).toHaveBeenCalledWith(['e1']);
    });

    it('skips owners with no subscriptions', async () => {
        pushRepo = makePushRepo([]);
        await new TodoReminderService(
            { findDueCandidates: mock(async () => [todo({})]) } as never,
            pushRepo as never,
            sender as never
        ).sendDailyReminders(NOW);
        expect(sender.send).not.toHaveBeenCalled();
    });

    it('does nothing when the sender is unconfigured', async () => {
        sender.isConfigured = () => false;
        const repo = { findDueCandidates: mock(async () => [todo({})]) };
        await new TodoReminderService(repo as never, pushRepo as never, sender as never).sendDailyReminders(NOW);
        expect(repo.findDueCandidates).not.toHaveBeenCalled();
        expect(sender.send).not.toHaveBeenCalled();
    });

    it('never throws when a send rejects', async () => {
        sender.send = mock(async () => {
            throw new Error('boom');
        });
        await expect(service([todo({})]).sendDailyReminders(NOW)).resolves.toBeUndefined();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/api/src/domain/TodoReminderService/index.test.ts`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Implement the service**

Create `packages/api/src/domain/TodoReminderService/index.ts`:

```ts
import type { Logger } from '@imapps/api-utils';
import type { PushSubscription, Todo } from '@shoppingo/types';
import { occursOn } from '@shoppingo/types';
import type { WebPushSender } from '../../infrastructure/WebPushSender';
import type { PushSubscriptionRepository } from '../PushSubscriptionRepository';
import type { TodoRepository } from '../TodoRepository';

/** Max todo titles listed before the rest collapse into "and N more". */
export const MAX_TITLES_SHOWN = 3;

export const formatDueBody = (titles: string[]): string => {
    const shown = titles.slice(0, MAX_TITLES_SHOWN).join(', ');
    const extra = titles.length - MAX_TITLES_SHOWN;
    return extra > 0 ? `${shown} and ${extra} more` : shown;
};

const endOfLocalDay = (now: Date): Date => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end;
};

/**
 * Sends one summary push per owner for todos due "today".
 *
 * Single-replica, like NotificationService: invoked by the in-process DailyReminderScheduler.
 */
export class TodoReminderService {
    constructor(
        private readonly todoRepo: TodoRepository,
        private readonly pushRepo: PushSubscriptionRepository,
        private readonly sender: WebPushSender,
        private readonly logger?: Logger
    ) {}

    async sendDailyReminders(now: Date): Promise<void> {
        if (!this.sender.isConfigured()) {
            return;
        }

        const candidates = await this.todoRepo.findDueCandidates(endOfLocalDay(now));
        const due = candidates.filter((todo) => occursOn(todo, now));
        if (due.length === 0) {
            return;
        }

        const byOwner = new Map<string, Todo[]>();
        for (const todo of due) {
            const list = byOwner.get(todo.ownerId) ?? [];
            list.push(todo);
            byOwner.set(todo.ownerId, list);
        }

        await Promise.all([...byOwner.entries()].map(([ownerId, todos]) => this.notifyOwner(ownerId, todos)));
    }

    private async notifyOwner(ownerId: string, todos: Todo[]): Promise<void> {
        try {
            const subs = await this.pushRepo.findByUserIds([ownerId]);
            if (subs.length === 0) {
                return;
            }

            const payload = JSON.stringify({
                title: 'Todos due today',
                body: formatDueBody(todos.map((t) => t.title)),
                data: { url: '/calendar' },
            });

            const results = await Promise.all(subs.map((sub: PushSubscription) => this.sender.send(sub, payload)));
            const dead = subs.filter((_, i) => results[i] === 'gone').map((s) => s.endpoint);
            if (dead.length > 0) {
                await this.pushRepo.deleteByEndpoints(dead);
            }
        } catch (error) {
            this.logger?.error('Todo reminder fan-out failed', {
                ownerId,
                error: (error as Error).message,
            });
        }
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/api/src/domain/TodoReminderService/index.test.ts`
Expected: PASS (all `formatDueBody` + `sendDailyReminders` cases).

- [ ] **Step 5: Type-check + lint**

Run: `bun run tsc --noEmit`
Expected: PASS.

Run: `bun run lint:fix`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/TodoReminderService/
git commit -m "feat(api): add TodoReminderService for daily due-todo push"
```

---

### Task 4: `DailyReminderScheduler`

In-process scheduler that fires `sendDailyReminders` at the next DST-aware 08:30 `Europe/London` and self-reschedules. `nextRunAt` is pure and unit-tested across a DST boundary.

**Files:**
- Create: `packages/api/src/domain/DailyReminderScheduler/index.ts`
- Create: `packages/api/src/domain/DailyReminderScheduler/index.test.ts`

**Interfaces:**
- Consumes: `TodoReminderService.sendDailyReminders(now: Date): Promise<void>` (Task 3)
- Produces:
  - `nextRunAt(from: Date, hour?: number, minute?: number): Date` (pure, exported)
  - `class DailyReminderScheduler` with `start(): void` and `stop(): void`
  - Constructor: `(reminder: TodoReminderService, opts?: { now?: () => Date; schedule?: (fn: () => void, ms: number) => Timer; logger?: Logger })`

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/domain/DailyReminderScheduler/index.test.ts`:

```ts
import { describe, expect, it, mock } from 'bun:test';
import { DailyReminderScheduler, nextRunAt } from './index';

const iso = (d: Date) => d.toISOString();

describe('nextRunAt (08:30 Europe/London)', () => {
    it('before 08:30 -> today 08:30, BST = 07:30Z', () => {
        expect(iso(nextRunAt(new Date('2026-06-25T06:00:00Z')))).toBe('2026-06-25T07:30:00.000Z');
    });

    it('after 08:30 -> tomorrow 08:30, BST = 07:30Z', () => {
        expect(iso(nextRunAt(new Date('2026-06-25T08:00:00Z')))).toBe('2026-06-26T07:30:00.000Z');
    });

    it('winter (GMT) 08:30 = 08:30Z, proving wall-clock is fixed', () => {
        expect(iso(nextRunAt(new Date('2026-01-15T06:00:00Z')))).toBe('2026-01-15T08:30:00.000Z');
    });

    it('keeps 08:30 wall-clock across the BST->GMT boundary', () => {
        // 26 Oct 2026 is the first full GMT day after clocks go back (25 Oct).
        expect(iso(nextRunAt(new Date('2026-10-26T06:00:00Z')))).toBe('2026-10-26T08:30:00.000Z');
    });
});

describe('DailyReminderScheduler', () => {
    it('schedules the reminder and runs it once per UK day on fire', async () => {
        const reminder = { sendDailyReminders: mock(async () => {}) };
        let captured: (() => void) | undefined;
        const schedule = mock((fn: () => void, _ms: number) => {
            captured = fn;
            return 0 as unknown as ReturnType<typeof setTimeout>;
        });
        let current = new Date('2026-06-25T06:00:00Z');

        const scheduler = new DailyReminderScheduler(reminder as never, {
            now: () => current,
            schedule: schedule as never,
        });
        scheduler.start();
        expect(schedule).toHaveBeenCalledTimes(1);

        // Fire: advance clock to the run instant and invoke the captured callback.
        current = new Date('2026-06-25T07:30:00Z');
        await captured?.();
        expect(reminder.sendDailyReminders).toHaveBeenCalledTimes(1);
        // Re-armed for the next day.
        expect(schedule).toHaveBeenCalledTimes(2);

        // Firing again on the SAME UK day does not double-send (guard).
        await captured?.();
        expect(reminder.sendDailyReminders).toHaveBeenCalledTimes(1);
    });

    it('never throws if the reminder rejects, and still re-arms', async () => {
        const reminder = { sendDailyReminders: mock(async () => { throw new Error('boom'); }) };
        let captured: (() => void) | undefined;
        const schedule = mock((fn: () => void) => { captured = fn; return 0 as never; });
        const scheduler = new DailyReminderScheduler(reminder as never, {
            now: () => new Date('2026-06-25T07:30:00Z'),
            schedule: schedule as never,
        });
        scheduler.start();
        await expect(captured?.()).resolves.toBeUndefined();
        expect(schedule).toHaveBeenCalledTimes(2); // re-armed despite the error
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/api/src/domain/DailyReminderScheduler/index.test.ts`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Implement the scheduler**

Create `packages/api/src/domain/DailyReminderScheduler/index.ts`:

```ts
import type { Logger } from '@imapps/api-utils';
import type { TodoReminderService } from '../TodoReminderService';

const TIME_ZONE = 'Europe/London';

interface LondonFields {
    y: number;
    mo: number;
    da: number;
    h: number;
    mi: number;
    s: number;
}

const londonFields = (date: Date): LondonFields => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const parts: Record<string, string> = {};
    for (const part of fmt.formatToParts(date)) {
        parts[part.type] = part.value;
    }
    // Intl emits hour '24' for midnight in some runtimes; normalise to 0.
    const hour = parts.hour === '24' ? 0 : Number(parts.hour);
    return {
        y: Number(parts.year),
        mo: Number(parts.month),
        da: Number(parts.day),
        h: hour,
        mi: Number(parts.minute),
        s: Number(parts.second),
    };
};

/** UTC instant for a Europe/London wall-clock time (safe outside DST transition gaps). */
const ukWallClockToUtc = (y: number, mo: number, da: number, h: number, mi: number): Date => {
    const guess = Date.UTC(y, mo - 1, da, h, mi);
    const f = londonFields(new Date(guess));
    const asIfUtc = Date.UTC(f.y, f.mo - 1, f.da, f.h, f.mi, f.s);
    const offset = asIfUtc - guess; // ms London is ahead of UTC
    return new Date(guess - offset);
};

/** Next instant whose Europe/London wall-clock time is `hour:minute`, strictly after `from`. */
export const nextRunAt = (from: Date, hour = 8, minute = 30): Date => {
    const f = londonFields(from);
    const today = ukWallClockToUtc(f.y, f.mo, f.da, hour, minute);
    if (today.getTime() > from.getTime()) {
        return today;
    }
    // Advance one UK calendar day using a midday anchor to avoid TZ slippage.
    const nextAnchor = new Date(Date.UTC(f.y, f.mo - 1, f.da + 1, 12));
    const n = londonFields(nextAnchor);
    return ukWallClockToUtc(n.y, n.mo, n.da, hour, minute);
};

const ukDayKey = (date: Date): string => {
    const f = londonFields(date);
    return `${f.y}-${f.mo}-${f.da}`;
};

export class DailyReminderScheduler {
    private timer?: ReturnType<typeof setTimeout>;
    private lastRunDay?: string;
    private readonly now: () => Date;
    private readonly schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;

    constructor(
        private readonly reminder: TodoReminderService,
        opts?: {
            now?: () => Date;
            schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
            logger?: Logger;
        }
    ) {
        this.now = opts?.now ?? (() => new Date());
        this.schedule = opts?.schedule ?? ((fn, ms) => setTimeout(fn, ms));
        this.logger = opts?.logger;
    }

    private readonly logger?: Logger;

    start(): void {
        const from = this.now();
        const delay = Math.max(0, nextRunAt(from).getTime() - from.getTime());
        this.timer = this.schedule(() => void this.fire(), delay);
    }

    stop(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    private async fire(): Promise<void> {
        const now = this.now();
        const dayKey = ukDayKey(now);
        try {
            if (this.lastRunDay !== dayKey) {
                this.lastRunDay = dayKey;
                await this.reminder.sendDailyReminders(now);
            }
        } catch (error) {
            this.logger?.error('Daily reminder run failed', { error: (error as Error).message });
        } finally {
            this.start();
        }
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/api/src/domain/DailyReminderScheduler/index.test.ts`
Expected: PASS (all `nextRunAt` + scheduler cases).

- [ ] **Step 5: Type-check + lint**

Run: `bun run tsc --noEmit`
Expected: PASS.

Run: `bun run lint:fix`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/DailyReminderScheduler/
git commit -m "feat(api): add DailyReminderScheduler (08:30 Europe/London, DST-aware)"
```

---

### Task 5: Wire into DI + start on boot

Register the two new services and start the scheduler in `onStartup`.

**Files:**
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `TodoReminderService` (Task 3), `DailyReminderScheduler` (Task 4), existing `TodoRepository`, `PushSubscriptionRepository`, `WebPushSender`, `Logger` tokens.

- [ ] **Step 1: Add the DI tokens**

In `packages/api/src/dependencies/types.ts`:

Add the import near the other domain imports:

```ts
import type { DailyReminderScheduler } from '../domain/DailyReminderScheduler';
import type { TodoReminderService } from '../domain/TodoReminderService';
```

Add to the `DependencyToken` enum (after `NotificationService`):

```ts
    TodoReminderService = 'TodoReminderService',
    DailyReminderScheduler = 'DailyReminderScheduler',
```

Add to the `Dependencies` type map (after `NotificationService`):

```ts
    [DependencyToken.TodoReminderService]: TodoReminderService;
    [DependencyToken.DailyReminderScheduler]: DailyReminderScheduler;
```

- [ ] **Step 2: Register the singletons**

In `packages/api/src/dependencies/index.ts`, add the imports near the other domain-service imports:

```ts
import { DailyReminderScheduler } from '../domain/DailyReminderScheduler';
import { TodoReminderService } from '../domain/TodoReminderService';
```

Add these registrations inside `registerDepdendencies` (place after the Todo services block):

```ts
    dependencyContainer.registerSingleton(
        DependencyToken.TodoReminderService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new TodoReminderService(
                    dependencyContainer.resolve(DependencyToken.TodoRepository),
                    dependencyContainer.resolve(DependencyToken.PushSubscriptionRepository),
                    dependencyContainer.resolve(DependencyToken.WebPushSender),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DailyReminderScheduler,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new DailyReminderScheduler(
                    dependencyContainer.resolve(DependencyToken.TodoReminderService),
                    { logger: dependencyContainer.resolve(DependencyToken.Logger) }
                );
            }
        }
    );
```

- [ ] **Step 3: Start the scheduler on boot**

In `packages/api/src/index.ts`, inside `onStartup`, after `logger.info(\`Shoppingo API server running on port ${port}\`);` (i.e. after `Bun.serve`), add:

```ts
        dependencyContainer.resolve(DependencyToken.DailyReminderScheduler).start();
        logger.info('Daily todo reminder scheduler started');
```

- [ ] **Step 4: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Run the full API test suite + coverage gate**

Run: `bun run --filter @shoppingo/api test`
Expected: PASS, coverage ≥ 90%.

- [ ] **Step 6: Verify builds**

Run: `bun run --filter @shoppingo/api build`
Expected: success.

Run: `bun run --filter @shoppingo/web build`
Expected: success (web recurrence re-export resolves in the bundle).

- [ ] **Step 7: Lint**

Run: `bun run lint:fix`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/dependencies/types.ts packages/api/src/dependencies/index.ts packages/api/src/index.ts
git commit -m "feat(api): wire daily todo reminder scheduler into startup"
```

---

## Self-Review Notes

- **Spec coverage:** scheduler (Task 4) ✓, due-today incl. recurrence/until/completedDates (Tasks 1+3) ✓, one summary push to `/calendar` (Task 3) ✓, reuse of WebPushSender/PushSubscriptionRepository + dead-sub cleanup (Task 3) ✓, shared recurrence module in `@shoppingo/types` (Task 1) ✓, DI wiring + boot start (Task 5) ✓, single-replica/missed-run acceptance (Global Constraints + scheduler doc) ✓, fixed 08:30 UK DST-aware (Task 4 `nextRunAt`) ✓.
- **Spec deviation:** the spec proposed a standalone `occursOn` unit test; this plan instead unit-tests `occursOn` directly in `packages/types` (Task 1, runnable via `bun test`) AND exercises every recurrence branch through `TodoReminderService` (Task 3, runs in CI). CI runs only the api suite, so the behaviourally-important coverage lives there.
- **Type consistency:** `findDueCandidates(dayEnd: Date)`, `occursOn(todo, day)`, `sendDailyReminders(now)`, `formatDueBody(titles)`, `nextRunAt(from, hour?, minute?)` used identically across producing and consuming tasks.
