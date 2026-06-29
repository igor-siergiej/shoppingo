# Offline Sync — Phase 3 Design (Todos, Labels, Recipes)

**Date:** 2026-06-28
**Umbrella spec:** `2026-06-27-offline-sync-outbox-design.md` (Phase 3 = "extend the engine to todos, labels, recipes").
**Builds on:** Phase 1 (engine + shopping-list items) and Phase 2 (offline list creation), both on `feat/offline-sync-phase1`.

## Goal

Let users create, edit, and delete **todos**, **labels**, and **recipes** while offline, with optimistic local views that survive a full app close, then sync to the API on reconnect. Reuse the Phase 1/2 outbox engine — add op cases to the intent layer + optimistic reducers, wire each entity's mutation hook, and close the API idempotent-create gap.

## Scope decisions (locked)

- **One combined Phase 3 plan** (not split per entity).
- **All mutations** routed offline per entity: create + update + delete, plus **todo complete**. Update/delete are already id-addressed server-side, so they replay as-is once wired.
- **Recipe creation is text-only offline** (title / ingredients / instructions / link). Recipe **images** — AI generate, file upload, revert — stay **online-only** and are untouched by this phase (binary payloads can't be queued in the outbox).

## The API idempotent-create gap (the real work)

Confirmed by inspection — every create path server-mints the id and has no idempotency branch:

| Entity | Service | Line | Client `id`? | Idempotent? |
|--------|---------|------|:---:|:---:|
| Todo | `TodoService.createTodo` | `domain/TodoService/index.ts:33` | ❌ | ❌ |
| Label | `LabelService.createLabel` | `domain/LabelService/index.ts:32` | ❌ | ❌ |
| Recipe | `RecipeService.createRecipe` | `domain/RecipeService/index.ts:87` | ❌ | ❌ |

Handlers (`TodoHandlers/index.ts:12`, `LabelHandlers/index.ts:12`, `RecipeHandlers/index.ts:91`) pass the request body straight through without reading `id`.

Without a client id + idempotency, a replay-after-lost-response double-inserts. Each entity needs the **Phase 2 Task 1 treatment**:

- Service `create*` accepts a trailing optional `id?: string`; uses it as the new entity id when provided; if an entity with that id already exists (owned by the caller), return it unchanged (idempotent replay). Reuse each repo's existing `findById`/`getById` (the `update*` paths already look entities up by id, so the lookup exists).
- Handler reads `id` from the JSON body and threads it to the service.
- Web api `createTodo` / `createLabel` / `addRecipe` accept an optional `id` and include it in the request body only when defined.

**Recipe wrinkle:** `createRecipe` also mints **ingredient** ids server-side (`RecipeService` ~L102). Recipe-level idempotency (return existing on id match) covers this — the replay returns the already-persisted recipe with its server ingredient ids; the optimistic client view is replaced by server truth on the next refetch. Do **not** attempt client-minted ingredient ids.

## Engine extension (web, all under `packages/web/src/offline/`)

### Outbox types (`outboxStore.ts`)
Widen the unions only (no behavioural change to the store):

```ts
export type ItemOp = 'item.add' | 'item.toggle' | 'item.delete' | 'item.rename' | 'item.quantity';
export type ListOp = 'list.create';
export type TodoOp = 'todo.create' | 'todo.update' | 'todo.delete' | 'todo.complete';
export type LabelOp = 'label.create' | 'label.update' | 'label.delete';
export type RecipeOp = 'recipe.create' | 'recipe.update' | 'recipe.delete';
export type EntityType = 'item' | 'list' | 'todo' | 'label' | 'recipe';
// OutboxIntent.op: ItemOp | ListOp | TodoOp | LabelOp | RecipeOp
```

### Scope convention
`scope = userId` for todo / label / recipe intents (these collections are user-global; there is no per-list scope as with items). Folds filter `intent.scope === userId`.

### Intent reducers (`intents.ts`, pure — never import `../api`)
- `applyTodoIntent(todos, intent)`:
  - `todo.create` → append from payload (idempotent if `targetId` present).
  - `todo.update` → merge `payload` (a `Partial<Todo>`) into the matching todo by `targetId`.
  - `todo.delete` → filter out by `targetId`.
  - `todo.complete` → set `done: true`; if the todo is recurring, append the completed date to `completedDates` instead of / in addition to `done` (match the server's complete semantics).
- `applyLabelIntent(labels, intent)`: `create` append (idempotent), `update` merge `{name?,color?}`, `delete` filter.
- `applyRecipeIntent(recipes, intent)`: `create` append text-only recipe (idempotent), `update` merge title/ingredients/link/instructions, `delete` filter. Reuse `Recipe`/`Todo`/`Label` from `@shoppingo/types` for the view types where practical; introduce minimal local view types only if the server type is awkward to satisfy optimistically.

### Replay (`replay.ts`, the api-touching half)
Add op cases mapping to existing api fns, respecting method asymmetry:
- `todo.create` → `createTodo(body, targetId)`; `todo.update` → `updateTodo(targetId, body)` (POST); `todo.delete` → `deleteTodo(targetId)`; `todo.complete` → `completeTodo(targetId, date?)`.
- `label.create` → `createLabel(body, targetId)`; `label.update` → `updateLabel(targetId, body)`; `label.delete` → `deleteLabel(targetId)`.
- `recipe.create` → `addRecipe(title, user, selectedUsers, ingredients, link, instructions, targetId)` (text-only); `recipe.update` → `updateRecipe(targetId, ...)` (PUT); `recipe.delete` → `deleteRecipe(targetId)`.

### Cold-start fold (`foldPending.ts`)
- `foldPendingTodos(userId, todos)`, `foldPendingLabels(userId, labels)`, `foldPendingRecipes(userId, recipes)` — each applies pending intents of the matching `entityType` and `scope === userId`, in seq order, over fresh server data.

## Query wiring (`api/index.ts`)
- `getTodosQuery()` → `getTodosQuery(userId)`; `getLabelsQuery()` → `getLabelsQuery(userId)`. Query keys stay `['todos']` / `['labels']` (single user per session); the `queryFn` folds with `userId`. `getRecipesQuery(userId)` already takes userId — add the recipe fold to its `queryFn`.
- Update call sites: `useTodos` / `useLabels` must pass the current user's id (from `useUser`).

## Hook rewiring
Mirror `useCreateList`: in `useTodos`, `useLabels`, and the recipe mutation hook(s), replace each `useMutation`→api call with: optimistic `queryClient.setQueryData` + `outboxStore.enqueue({ entityType, op, targetId, scope: userId, payload, ... })` + `void drainOutbox()`. **Keep the returned function signatures identical** (`createTodo(body)`, `updateTodo(id, body)`, `deleteTodo(id)`, `completeTodo(id, date?)`, label equivalents, recipe equivalents) so existing call sites need no change. Mint `crypto.randomUUID()` as `targetId` for creates.

## FIFO / ordering
Same load-bearing invariant as Phases 1–2: the queue replays by `seq`. A create must precede later update/delete of the same entity. Do not add out-of-order draining. An update/delete replayed before its create would 404 and drop-if-gone would discard it — FIFO + single-flight prevents this.

## Testing
- **Web (vitest, `fake-indexeddb/auto` at top of IndexedDB-touching tests):** reducers (`applyTodoIntent`/`applyLabelIntent`/`applyRecipeIntent`), folds (`foldPendingTodos`/`Labels`/`Recipes`), and hook tests (enqueue + optimistic) per entity.
- **API (bun:test):** per service — create uses caller-provided id; idempotent return on existing id without re-insert. Per handler — threads `id` from body. Adapt to each test file's existing mock-repo style (real mock repos, not `vi.fn`, as in `ListService`).
- **Gates:** `bun run tsc --noEmit` clean; `bunx fallow@2.100.0 dead-code` green (any new export must be consumed by non-test code; any test-only dep added to `.fallowrc.json`); both builds pass.

## Constraints (carried from Phases 1–2)
- Web tests `vitest`; API tests `bun:test`. Never `bun:test` in `packages/web`.
- `intents.ts` stays free of `../api` imports (the `api → foldPending → intents → api` cycle is why `replay.ts` exists).
- Package manager Bun. `bun run lint:fix` then `bun run tsc --noEmit` before each commit.
- Do not stage pre-existing untracked files (`packages/api/tsconfig.check.json`, `docs/superpowers/plans/2026-06-06-*.md`). Stage only files you author.
- Conventional Commits; commit bodies end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Pre-existing flaky API test (`middleware/auth.test.ts` network-failure mock) is not a regression — report counts, don't chase.

## Proposed task decomposition (for the plan)
1. **API idempotent create** — todo + label + recipe services + handlers + tests (the gap fix).
2. **Web engine** — widen outbox types; `applyTodoIntent`/`applyLabelIntent`/`applyRecipeIntent` + reducers tests; replay op cases; web api create fns accept `id`.
3. **Web folds + query wiring** — `foldPendingTodos`/`Labels`/`Recipes`; `getTodosQuery(userId)`/`getLabelsQuery(userId)` signature change + recipe fold; update call sites.
4. **Wire `useTodos`** through the outbox.
5. **Wire `useLabels`** through the outbox.
6. **Wire recipe mutations** (create text-only / update / delete) through the outbox; final whole-phase verification + DevTools smoke test.
