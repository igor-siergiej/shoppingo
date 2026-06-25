# Daily Todo Reminder — Design

**Date:** 2026-06-25
**Status:** Approved (pending spec review)

## Goal

Send each user a Web Push notification at **08:30 Europe/London every day** summarising the todos they have due that day. Reuses the existing Web Push infrastructure built for shared-list adds (`WebPushSender`, `PushSubscriptionRepository`, service worker `push`/`notificationclick` handlers).

## Behaviour Summary

- **When:** 08:30 `Europe/London` daily (DST-aware — fixed UK wall-clock time, not a fixed UTC offset).
- **Who:** every user who (a) has ≥1 push subscription and (b) has ≥1 todo due that day.
- **Which todos:** `done: false` AND landing on today — covers single-dated todos (`dueDate` == today) and recurring todos whose recurrence rule produces today (respecting `until` and `completedDates`). Overdue todos are **not** included.
- **What:** **one** summary push per user. Title `Todos due today`, body e.g. `Pay rent, Call dentist and 1 more`. Tapping opens `/calendar`.

## Architecture

Four new units, mirroring the existing clean-architecture layers. No changes to the send path or the service worker — the existing `push`/`notificationclick` handlers already render `{title, body, data.url}`.

### 1. Shared recurrence module (`packages/types`)

The recurrence expansion algorithm currently lives only in `packages/web/src/utils/recurrence.ts`. Move it into the shared `@shoppingo/types` package so both web and api consume one source of truth (avoids drift).

- **Create:** `packages/types/src/recurrence.ts` — move `expandOccurrences`, `Occurrence`, `isoDay`, and the internal helpers verbatim. Add a new exported predicate:
  ```ts
  // true if this todo has an (incomplete) occurrence on `day`
  export const occursOn = (todo: Todo, day: Date): boolean =>
      expandOccurrences(todo, day, day).some((o) => !o.done);
  ```
  `expandOccurrences` already filters `completedDates` and `until`, and a `[day, day]` range yields at most one occurrence, so `occursOn` needs no extra recurrence math.
- **Modify:** `packages/types/src/index.ts` — re-export from `./recurrence`.
- **Modify:** `packages/types/package.json` — add `date-fns` dependency (currently only web has it).
- **Modify:** `packages/web/src/utils/recurrence.ts` — replace body with a re-export from `@shoppingo/types` (keeps existing web import paths working); update web call sites only if a direct move is cleaner.

> Note: `done` semantics — for a non-recurring todo, `Occurrence.done` is `todo.done`; for a recurring todo it is `completedDates.has(isoDay(day))`. `occursOn` returning `!o.done` therefore correctly excludes a recurring instance already ticked off for today and a single todo already marked done.

### 2. Repository query (`TodoRepository.findDueCandidates`)

- **Modify:** `packages/api/src/domain/TodoRepository/index.ts` — add
  ```ts
  findDueCandidates(dayEnd: Date): Promise<Todo[]>;
  ```
- **Modify:** `packages/api/src/infrastructure/MongoTodoRepository/index.ts` — implement as a cheap pre-filter; exact day-matching is done in code via `occursOn`:
  ```ts
  async findDueCandidates(dayEnd: Date): Promise<Todo[]> {
      return this.collection()
          .find({ done: false, dueDate: { $lte: dayEnd } })
          .toArray();
  }
  ```
  Recurring todos anchored in the past must be included (their `dueDate` is ≤ today), so the filter keys on `dueDate <= end-of-today` rather than equality. `occursOn` then discards candidates not actually landing today.

### 3. Reminder service (`TodoReminderService`, domain)

- **Create:** `packages/api/src/domain/TodoReminderService/index.ts`
- **Create:** `packages/api/src/domain/TodoReminderService/index.test.ts`

Responsibilities:
1. `sendDailyReminders(now: Date)`:
   - Compute `dayEnd` = end of `now`'s local day (UK). Fetch candidates via `findDueCandidates`.
   - Filter with `occursOn(todo, now)`.
   - Group surviving todos by `ownerId`.
   - For each owner: build payload `{ title: 'Todos due today', body: formatDueBody(titles), data: { url: '/calendar' } }`, fetch subs via `PushSubscriptionRepository.findByUserIds([ownerId])`, send via `WebPushSender`, and clean up `gone` endpoints — identical fan-out/cleanup logic to `NotificationService`.
2. `formatDueBody(titles: string[])`: same shape as `NotificationService.formatAddedBody` — first 3 names then `and N more`. Extract the shared shaping into a small helper if convenient, otherwise duplicate the 4-line function (low cost, keeps services decoupled).

Guarded by `WebPushSender.isConfigured()` — no-op when VAPID keys absent (same as `NotificationService`).

Constructor deps: `TodoRepository`, `PushSubscriptionRepository`, `WebPushSender`, `Logger?`.

### 4. Scheduler (`DailyReminderScheduler`, domain)

- **Create:** `packages/api/src/domain/DailyReminderScheduler/index.ts`
- **Create:** `packages/api/src/domain/DailyReminderScheduler/index.test.ts`

In-process, single-replica (consistent with `NotificationService`'s in-memory debounce assumption). Responsibilities:

- `start()`: compute ms until the next 08:30 `Europe/London`, `setTimeout` to it; on fire, call `reminderService.sendDailyReminders(new Date())`, then recompute and reschedule the next 08:30 (recomputing each cycle self-corrects across DST transitions and clock drift).
- `nextRunAt(from: Date): Date`: pure, **unit-tested across a DST boundary**. Computes the next instant whose UK wall-clock time is 08:30. Implementation uses an `Intl.DateTimeFormat` with `timeZone: 'Europe/London'` to read the UK offset for a candidate date (no new dependency).
- In-memory `lastRunDay` (ISO day string) guard: skip if a run already happened for that UK day (defends against double-fire / rapid reschedule).
- Injectable `now: () => Date` and `setTimeoutFn` for deterministic tests.
- `stop()`: clears the pending timer (used in tests; optional in bootstrap).

**Missed-run policy (accepted):** if the API process is down at 08:30, that day's reminder is skipped. No catch-up on late start. Documented as a known limitation, same spirit as the `NotificationService` single-replica note.

### 5. Wiring

- **Modify:** `packages/api/src/dependencies/types.ts` — add `TodoReminderService` and `DailyReminderScheduler` `DependencyToken`s.
- **Modify:** `packages/api/src/dependencies/index.ts` — register both as singletons (factory-class pattern matching the file). `TodoReminderService` resolves `TodoRepository`, `PushSubscriptionRepository`, `WebPushSender`, `Logger`. `DailyReminderScheduler` resolves `TodoReminderService`, `Logger`.
- **Modify:** API bootstrap (where the Koa server calls `.listen` — alongside `registerDepdendencies()`): after dependencies are registered, resolve `DailyReminderScheduler` and call `.start()`.

## Data Flow

```
DailyReminderScheduler.start()
  └─ setTimeout(nextRunAt(now) - now)
       └─ TodoReminderService.sendDailyReminders(now)
            ├─ TodoRepository.findDueCandidates(endOfDay(now))      // Mongo: done:false, dueDate<=end
            ├─ filter occursOn(todo, now)                           // shared recurrence util
            ├─ group by ownerId
            └─ per owner:
                 ├─ PushSubscriptionRepository.findByUserIds([ownerId])
                 ├─ WebPushSender.send(sub, {title,body,data.url:'/calendar'})
                 └─ repo.deleteByEndpoints(gone)
       └─ reschedule nextRunAt(...)   // DST self-correcting
```

## Error Handling

- Per-owner fan-out wrapped in try/catch with `logger.error` (one owner's failure must not abort the sweep) — mirror `NotificationService.fanOut`.
- Scheduler fire wrapped so a sweep error still reschedules the next day.
- `WebPushSender` already maps `404/410` → `gone` for dead-subscription cleanup; reused unchanged.

## Testing (Bun native `bun:test`, ≥90% api coverage)

- **`occursOn`** (in types): single due today / not today; recurring landing today; recurring excluded by `until`; recurring excluded by `completedDates`; done single excluded.
- **`findDueCandidates`**: builds the `done:false, dueDate:{$lte}` query (mock collection).
- **`TodoReminderService`**: groups multiple todos per owner into one push; skips owners with no due todos; skips when no subscriptions; `gone` endpoints cleaned up; no-op when `isConfigured()` false; `formatDueBody` truncation (`and N more`).
- **`DailyReminderScheduler.nextRunAt`**: from before 08:30 → today 08:30; from after 08:30 → tomorrow 08:30; **across the BST↔GMT boundary** the wall-clock stays 08:30; `lastRunDay` guard prevents double-fire.

No e2e for this phase.

## Out of Scope / YAGNI

- Per-user configurable reminder time or timezone (fixed 08:30 UK).
- Overdue / upcoming-todo reminders.
- Catch-up for missed runs after downtime.
- Multi-replica coordination (shared store / leader election) — revisit only if the API scales out.
- Web UI for the reminder (none needed; it's a backend trigger over existing push opt-in).
