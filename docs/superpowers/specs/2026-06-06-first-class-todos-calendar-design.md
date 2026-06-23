# First-class Todos + Calendar View — Design

Date: 2026-06-06
Status: Approved (pending spec review)

## Summary

Promote todos from list-bound items to a first-class entity with their own
collection, API, and UI. Add a month-grid **Calendar** view to schedule and see
todos, plus an **Inbox** for undated todos. Add a Calendar icon to the existing
bottom nav bar; the center `+` becomes a context-aware add that creates a todo
on the calendar/inbox.

Today a "todo" is an `Item` inside a `listType: 'todo'` `List`, with an optional
`dueDate`. That model is replaced by a dedicated `Todo` entity.

## Decisions

- Todos are **first-class** (own entity/collection/service), not list items.
- `ListType.TODO` is **dropped** from new code; lists become shopping-only.
- **No migration.** Existing todo-list documents are left untouched and ignored
  (legacy). New code no longer handles `ListType.TODO`.
- Todo features in scope: title, done-state, due date, **time of day**,
  **grouping label/colour**, **recurrence**. No free-text notes.
- Labels are a **managed entity** (own collection + CRUD): create, rename,
  recolour, delete, and filter the calendar by label. Todos reference a label.
- Undated todos live in an **Inbox**, surfaced as a **collapsible drawer below
  the always-visible calendar**, with **drag-to-schedule** onto a day.
- **Sharing is out of scope** (future epic). Model keeps `ownerId` and leaves
  room to add `users[]` later.
- Recurrence: **rule + client-side virtual expansion** with per-occurrence
  completion via `completedDates[]`.

## Data Model (`packages/types`)

Drop the `TODO` member from `ListType`, keeping the enum with `SHOPPING` only.
`List.listType` is retained (always `SHOPPING`) so existing shopping-list code
stays unchanged.

```ts
interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;          // every N units
  until?: Date;              // optional series end (inclusive)
}

interface Todo {
  id: string;
  ownerId: string;           // sharing deferred; users[] added in future epic
  title: string;
  done: boolean;             // completion for non-recurring todos
  dateAdded: Date;
  dueDate?: Date;            // the scheduled day; undefined = Inbox/unscheduled
  time?: string;             // 'HH:mm'; absent = "all day"
  labelId?: string;          // references a Label; undefined = no label
  recurrence?: Recurrence;   // present = recurring
  completedDates?: string[]; // ISO day strings completed (recurring only)
}

interface Label {
  id: string;
  ownerId: string;
  name: string;
  color: string;             // hex; drives calendar dot/bar colour
}

interface TodoResponse extends Todo {}    // mirror List/Recipe response pattern
interface LabelResponse extends Label {}
```

Labels are a **managed entity**, not inline. A todo references a label via
`labelId`. Deleting a label clears `labelId` on todos that referenced it (the
todos remain, unlabelled).

## Backend (`packages/api`)

Mirror the existing Recipe/List clean-architecture pattern exactly:

- `domain/TodoRepository` — interface
- `infrastructure/MongoTodoRepository` — Mongo implementation
- `domain/TodoService` — CRUD + toggle-complete, `ownerId` authorization checks
- `interfaces/TodoHandlers` — Koa handlers
- `routes/index.ts` — new routes (all `authenticate`)
- A parallel `Label` stack: `domain/LabelRepository`,
  `infrastructure/MongoLabelRepository`, `domain/LabelService` (CRUD +
  `ownerId` checks), `interfaces/LabelHandlers`.
- `dependencies/`: add `CollectionNames.Todo` + `CollectionNames.Label`, and
  `DependencyToken.{TodoRepository,TodoService,LabelRepository,LabelService}`,
  wired in `dependencies/index.ts`.

Routes:

```
GET    /api/todos              # all todos for the authenticated user
PUT    /api/todos              # create
POST   /api/todos/:id          # update
DELETE /api/todos/:id          # delete
POST   /api/todos/:id/complete # body { date?: string }
                               #   non-recurring → toggle `done`
                               #   recurring     → add/remove date in completedDates[]

GET    /api/labels             # all labels for the authenticated user
PUT    /api/labels             # create
POST   /api/labels/:id         # update (rename / recolour)
DELETE /api/labels/:id         # delete (clears labelId on referencing todos)
```

The API stays plain CRUD. **No occurrence expansion server-side** — recurrence
is expanded on the client. Deleting a label cascades to clear `labelId` on the
owner's todos (handled in `LabelService` / repository).

## Recurrence (Approach B — rule + virtual expansion)

- Store a single `Todo` with a `recurrence` rule.
- Client util `expandOccurrences(todo, rangeStart, rangeEnd): Occurrence[]`
  (using `date-fns`) generates occurrences within the visible range.
- Each occurrence's done-state = `completedDates.includes(isoDay(occurrence))`.
- Completing/uncompleting an occurrence calls `/complete` with that occurrence's
  ISO day; non-recurring todos call `/complete` with no date to toggle `done`.
- `until` bounds the series; absent = open-ended (only ever expanded within a
  bounded visible range, so storage and compute stay bounded).

## Web — Calendar page (`packages/web`)

- `pages/CalendarPage`:
  - **Month grid** (`MonthGrid` / `DayCell`), coloured dots per day from each
    todo's label colour. Month navigation (prev/next).
  - Tap a day → todo list below for that day (colour bar + time, "all day"
    when `time` absent).
  - **Inbox drawer** (`InboxDrawer`): a collapsible panel pinned to the bottom,
    below the always-visible calendar. Lists undated todos (`dueDate`
    undefined). **Drag** an inbox todo onto a `DayCell` to schedule it (sets
    `dueDate`); a tap-to-edit fallback also lets you pick a date. Dragging onto
    the inbox unschedules.
  - **Label filter**: filter the calendar/day list by one or more labels.
- `AddTodoDrawer` (added to ToolBar drawers): reuses existing `DueDateField`;
  new `TimeField`, `LabelSelect` (pick an existing label or create one inline),
  `RecurrenceField`. Tapping a day prefills its date.
- `ManageLabelsDrawer`: create / rename / recolour / delete labels (pattern
  mirrors the existing `ManageUsersDrawer`).
- `hooks/useTodos`, `hooks/useLabels` — react-query data layers.
- `api/index.ts` — todo + label client functions.
- Reuse existing `DueDateField`, `DueDateBadge`, `normaliseDueDate`.
- Drag-and-drop: prefer the library already present (`motion`) or a small
  pointer-based handler; avoid adding a heavy dnd dependency unless needed.

## Web — Navigation (`ToolBarAppBar`)

New persistent bottom bar, **evenly spaced**:

```
[ Cart ]   [ Recipes ]   [  +  ]   [ Calendar ]   [ Menu ]
```

- Calendar icon sits **to the right of the `+`**.
- Replace the current `1fr auto 1fr` grid with an evenly-spaced flex row.
- Center `+` is context-aware: item (lists), recipe (recipes), **todo
  (calendar/inbox)**.
- Contextual clear/remove actions surface in selection mode rather than
  occupying the five persistent slots.
- Add `/calendar` route to the router (`packages/web/src/index.tsx`), lazy-loaded
  like other pages.

## Removed / changed from current todo handling

- Drop `ListType.TODO` handling: the TODO branch of `AddItemDrawer` (its
  `dueDate` field), the `DueDateBadge` rendering inside `ItemCheckBoxCard` for
  TODO lists, and any list-type todo UI move to the new todo UI. `DueDateField`,
  `DueDateBadge`, `normaliseDueDate` are kept and reused.

## Testing (Bun native test runner, `bun:test`)

- `expandOccurrences`: freq/interval/until edge cases, `completedDates` mapping,
  range boundaries.
- `TodoService`: CRUD + `ownerId` authorization, complete/uncomplete (recurring
  and non-recurring).
- `LabelService`: CRUD + `ownerId` authorization; delete cascades to clear
  `labelId` on referencing todos.
- `MongoTodoRepository` / `MongoLabelRepository`: persistence.
- `CalendarPage` / `MonthGrid` / `InboxDrawer` / `AddTodoDrawer` /
  `ManageLabelsDrawer`: render, day selection, add flow, drag-to-schedule,
  label CRUD, label filter.
- `ToolBarAppBar`: renders evenly-spaced bar with Calendar slot; context add
  resolves to todo on calendar.
- Maintain API 90% coverage threshold.

## E2E tests (Playwright)

`@playwright/test` and the `test:e2e` / `test:e2e:ui` scripts already exist in
the root `package.json`, but there is no `playwright.config` or `e2e/` directory
yet — both need scaffolding as part of this work.

- Add `playwright.config.ts` (base URL = web dev server on port 4000; start
  web + api, ideally via `start:with-mock` for deterministic auth).
- Create an `e2e/` directory with todo/calendar flows:
  - Create a todo from the calendar `+`, see it on the tapped day.
  - Create an undated todo, see it in the Inbox drawer; drag it onto a day to
    schedule it.
  - Toggle a todo done (single) and verify state.
  - Create a recurring todo and verify it appears on multiple days; complete one
    occurrence and confirm only that day is marked done.
  - Create a label, assign it to a todo, and verify its colour on the calendar;
    filter by that label.
  - Nav: Calendar tab is present right of `+` and routes to the calendar.
- Keep the suite small and deterministic (mock auth, seeded/clean state).

## Out of scope (future epics)

- Sharing todos with multiple users (`users[]`, per-todo auth, shared calendars).
- Free-text notes/description.
- Migrating legacy todo-list data.
