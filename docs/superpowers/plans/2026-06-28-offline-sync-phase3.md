# Offline Sync — Phase 3 Implementation Plan (Todos, Labels, Recipes)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create, edit, delete, and (for todos) complete todos, labels, and recipes while offline, syncing to the API on reconnect via the existing outbox engine.

**Architecture:** Reuse the Phase 1/2 outbox engine. Widen the intent unions for three new entity types; add pure optimistic reducers and replay mappings; fold pending intents over each cold-start query; rewire `useTodos` / `useLabels` and the recipe mutation call sites to enqueue intents (optimistic + drain) instead of calling the API directly. Close the API idempotent-create gap so replay-after-lost-response is safe. Entities are id-addressed; offline-created entities mint a `crypto.randomUUID()` client id used as the stable key.

**Tech Stack:** React 19, react-query v3, `idb`, TypeScript. API: Hono + MongoDB. Web tests: **vitest** + `@testing-library/react`. API tests: **bun:test**.

**Design spec:** `docs/superpowers/specs/2026-06-28-offline-sync-phase3-design.md`.

## Context: Phase 1/2 engine (branch `feat/offline-sync-phase1`)

- `packages/web/src/offline/outboxStore.ts` — IndexedDB outbox + in-memory mirror. `OutboxIntent { seq, id, entityType, op, targetId, scope, payload, createdAt }`. Unions currently: `EntityType = 'item' | 'list'`, op = `ItemOp | ListOp`. API: `hydrate`, `enqueue`, `peekAll`, `remove`, `count`, `subscribe`, `_resetForTests`.
- `packages/web/src/offline/intents.ts` — pure reducers `applyItemIntent`, `applyListIntent` (+ `ItemView`, `ListView`). **Never import `../api` here.**
- `packages/web/src/offline/replay.ts` — `replayIntent(intent)` maps op → api call (the only api-touching half).
- `packages/web/src/offline/foldPending.ts` — `foldPendingItems(listTitle, data)`, `foldPendingLists(userId, lists)`.
- `packages/web/src/offline/drainer.ts` — `drainOutbox()`, `startDrainer()`. FIFO, single-flight, LWW: 2xx→remove, 404/409→discard, other→stop+backoff.
- `packages/web/src/hooks/useCreateList.ts` — the wiring pattern to mirror: optimistic `setQueryData` + `outboxStore.enqueue` + `void drainOutbox()`.
- API idempotent-create precedent: `ListService.addList(..., id?)` returns the existing list when `(title, id)` already match.

## Global Constraints

- Web tests import from `vitest`; IndexedDB-touching tests put `import 'fake-indexeddb/auto';` at the very top. **Never** `bun:test` in `packages/web`.
- API tests import from `bun:test`. Mirror each service test file's existing class-mock-repo fixtures (Map-backed `getById`/`insert`/`update`/`deleteById`), not `vi.fn`.
- Package manager is **Bun**. Before each commit: `bun run lint:fix` then `bun run tsc --noEmit` (root).
- CI merge gate is `bunx fallow@2.100.0 dead-code` — must stay green (no unused exports/files/deps). Any new export must be consumed by non-test code. Pre-push complexity warnings are NOT CI-gated; bypass with `git push --no-verify` if they block on complexity only.
- `intents.ts` must NOT import `../api` (the `api → foldPending → intents → api` cycle is why `replay.ts` exists).
- Do NOT stage pre-existing untracked files (`packages/api/tsconfig.check.json`, `docs/superpowers/plans/2026-06-06-*.md`). Stage only files you author. Never `git add -A`.
- Conventional Commits; end commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Pre-existing flaky API test (`middleware/auth.test.ts` network-failure mock) is not a regression — report counts, don't chase.
- Scope convention: todo/label/recipe intents use `scope = userId`. FIFO replay (lower `seq` first) guarantees a create reaches the server before later update/delete of the same entity. Do not reorder the queue.

---

### Task 1: API — `createTodo` accepts a client id and is idempotent

**Files:**
- Modify: `packages/api/src/domain/TodoService/index.ts` (`CreateTodoInput.id` + idempotency)
- Test: `packages/api/src/domain/TodoService/index.test.ts`

**Interfaces:**
- Produces: `CreateTodoInput` gains optional `id?: string`. `TodoService.createTodo(ownerId, input)` uses `input.id` as the todo id when provided; if a todo with that id already exists and is owned by `ownerId`, returns it unchanged. The todo handler already parses the body as `CreateTodoInput`, so no handler change is needed.

- [ ] **Step 1: Write failing service tests**

In `packages/api/src/domain/TodoService/index.test.ts`, inside the top-level `describe('TodoService', ...)` block (after the existing create tests), add:

```ts
describe('createTodo idempotency', () => {
    it('uses the caller-provided id when given', async () => {
        const todo = await svc.createTodo('user-1', { title: 'Buy milk', id: 'client-todo-uuid' });
        expect(todo.id).toBe('client-todo-uuid');
    });

    it('returns the existing todo without re-insert when id+owner already exist', async () => {
        const first = await svc.createTodo('user-1', { title: 'Buy milk', id: 'client-todo-uuid' });
        const second = await svc.createTodo('user-1', { title: 'Buy milk again', id: 'client-todo-uuid' });
        expect(second).toBe(first);
        expect(second.title).toBe('Buy milk');
        expect(await svc.getTodosByOwner('user-1')).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/api test`
Expected: FAIL — `createTodo` ignores `input.id`.

- [ ] **Step 3: Implement**

In `packages/api/src/domain/TodoService/index.ts`, add `id?: string` to `CreateTodoInput`:

```ts
export interface CreateTodoInput {
    title: string;
    dueDate?: Date;
    time?: string;
    labelId?: string;
    recurrence?: Recurrence;
    id?: string;
}
```

Then update `createTodo`:

```ts
async createTodo(ownerId: string, input: CreateTodoInput): Promise<Todo> {
    if (input.id) {
        const existing = await this.repo.getById(input.id);
        if (existing && existing.ownerId === ownerId) {
            return existing; // idempotent replay
        }
    }
    const todo: Todo = {
        id: input.id ?? this.idGenerator.generate(),
        ownerId,
        title: input.title,
        done: false,
        dateAdded: new Date(),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.time !== undefined && { time: input.time }),
        ...(input.labelId !== undefined && { labelId: input.labelId }),
        ...(input.recurrence !== undefined && { recurrence: input.recurrence, completedDates: [] }),
    };
    await this.repo.insert(todo);
    this.logger?.info('Todo created', { todoId: todo.id, ownerId });
    return todo;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `bun run --filter @shoppingo/api test` → PASS (incl. existing todo tests).
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
bun run lint:fix
git add packages/api/src/domain/TodoService/index.ts packages/api/src/domain/TodoService/index.test.ts
git commit -m "$(cat <<'EOF'
feat(api): accept client id on todo create for idempotent offline replay

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: API — `createLabel` accepts a client id and is idempotent

**Files:**
- Modify: `packages/api/src/domain/LabelService/index.ts` (`CreateLabelInput.id` + idempotency)
- Test: `packages/api/src/domain/LabelService/index.test.ts`

**Interfaces:**
- Produces: `CreateLabelInput` gains optional `id?: string`. `LabelService.createLabel(ownerId, input)` uses `input.id`; idempotent-returns the existing label when `(id, ownerId)` already match. Handler parses the body as `CreateLabelInput`; no handler change needed.

- [ ] **Step 1: Write failing service tests**

In `packages/api/src/domain/LabelService/index.test.ts`, inside the top-level `describe('LabelService', ...)` block add:

```ts
describe('createLabel idempotency', () => {
    it('uses the caller-provided id when given', async () => {
        const label = await svc.createLabel('user-1', { name: 'Home', color: '#fff', id: 'client-label-uuid' });
        expect(label.id).toBe('client-label-uuid');
    });

    it('returns the existing label without re-insert when id+owner already exist', async () => {
        const first = await svc.createLabel('user-1', { name: 'Home', color: '#fff', id: 'client-label-uuid' });
        const second = await svc.createLabel('user-1', { name: 'Work', color: '#000', id: 'client-label-uuid' });
        expect(second).toBe(first);
        expect(second.name).toBe('Home');
        expect(await svc.getLabelsByOwner('user-1')).toHaveLength(1);
    });
});
```

> Use the file's existing `svc` / `labels` / `todos` fixtures from its `beforeEach`. If `svc.getLabelsByOwner` is not the exact accessor name in the file, use the file's equivalent owner-listing method.

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/api test`
Expected: FAIL — `createLabel` ignores `input.id`.

- [ ] **Step 3: Implement**

In `packages/api/src/domain/LabelService/index.ts`, add `id?: string` to `CreateLabelInput`:

```ts
export interface CreateLabelInput {
    name: string;
    color: string;
    id?: string;
}
```

Then update `createLabel`:

```ts
async createLabel(ownerId: string, input: CreateLabelInput): Promise<Label> {
    if (input.id) {
        const existing = await this.labels.getById(input.id);
        if (existing && existing.ownerId === ownerId) {
            return existing; // idempotent replay
        }
    }
    const label: Label = {
        id: input.id ?? this.idGenerator.generate(),
        ownerId,
        name: input.name,
        color: input.color,
    };
    await this.labels.insert(label);
    return label;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `bun run --filter @shoppingo/api test` → PASS.
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
bun run lint:fix
git add packages/api/src/domain/LabelService/index.ts packages/api/src/domain/LabelService/index.test.ts
git commit -m "$(cat <<'EOF'
feat(api): accept client id on label create for idempotent offline replay

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: API — `createRecipe` accepts a client id and is idempotent

**Files:**
- Modify: `packages/api/src/domain/RecipeService/index.ts` (`createRecipe` trailing `id?` + idempotency)
- Modify: `packages/api/src/interfaces/RecipeHandlers/index.ts` (`createRecipe` handler reads `id` from body, threads it)
- Test: `packages/api/src/domain/RecipeService/index.test.ts`

**Interfaces:**
- Produces: `RecipeService.createRecipe(title, ingredients, ownerId, owner, link?, instructions?, selectedUsers?, id?)` — uses `id` as the recipe id when provided; idempotent-returns the existing recipe when `(id, ownerId)` match (ingredients keep their server-minted ids). `PUT /api/recipes` body accepts optional `id: string`.

- [ ] **Step 1: Write failing service tests**

In `packages/api/src/domain/RecipeService/index.test.ts`, inside `describe('RecipeService.createRecipe', ...)` add:

```ts
it('uses the caller-provided id when given', async () => {
    const svc = new RecipeService(repo as any, ids);
    const recipe = await svc.createRecipe('Pasta', [], owner.id, owner, undefined, undefined, [], 'client-recipe-uuid');
    expect(recipe.id).toBe('client-recipe-uuid');
});

it('returns the existing recipe without re-insert when id+owner already exist', async () => {
    const svc = new RecipeService(repo as any, ids);
    const first = await svc.createRecipe('Pasta', [], owner.id, owner, undefined, undefined, [], 'client-recipe-uuid');
    const second = await svc.createRecipe('Risotto', [], owner.id, owner, undefined, undefined, [], 'client-recipe-uuid');
    expect(second).toBe(first);
    expect(second.title).toBe('Pasta');
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/api test`
Expected: FAIL — `createRecipe` has no `id` param / ignores it.

- [ ] **Step 3: Implement in the service**

In `packages/api/src/domain/RecipeService/index.ts`, add a trailing `id?: string` param and an idempotency guard at the top of the `try`:

```ts
async createRecipe(
    title: string,
    ingredients: Ingredient[],
    ownerId: string,
    owner: User,
    link?: string,
    instructions?: string[],
    selectedUsers?: string[],
    id?: string
): Promise<Recipe> {
    try {
        if (id) {
            const existing = await this.recipeRepository.getById(id);
            if (existing && existing.ownerId === ownerId) {
                return existing; // idempotent replay
            }
        }
        const users = await this.resolveSharedUsers(title, owner, selectedUsers);
        const recipe: Recipe = {
            id: id ?? this.idGenerator.generate(),
            title,
            ingredients: ingredients.map((ing) => ({
                ...ing,
                id: this.idGenerator.generate(),
            })),
            ownerId,
            users,
            dateAdded: new Date(),
            ...(link !== undefined && { link }),
            ...(instructions !== undefined && { instructions }),
        };
        const created = await this.recipeRepository.insert(recipe);
        this.logger?.info('Recipe created', {
            recipeId: created.id,
            recipeTitle: title,
            owner: owner.username,
            ingredientCount: created.ingredients.length,
        });
        return created;
    } catch (error) {
        this.logger?.error('Failed to create recipe', { recipeTitle: title, owner: owner.username, error });
        throw error;
    }
}
```

- [ ] **Step 4: Thread `id` in the handler**

In `packages/api/src/interfaces/RecipeHandlers/index.ts`, `createRecipe` handler — add `id` to the destructure and pass it as the 8th arg:

```ts
const { title, ingredients, link, instructions, selectedUsers, id } = await c.req.json<{
    title: string;
    ingredients: Ingredient[];
    link?: string;
    instructions?: string[];
    selectedUsers?: string[];
    id?: string;
}>();
```

```ts
const recipe = await getRecipeService().createRecipe(
    title,
    ingredients,
    authenticatedUser.id,
    authenticatedUser,
    link,
    instructions,
    selectedUsers,
    id
);
```

- [ ] **Step 5: Run tests + typecheck**

Run: `bun run --filter @shoppingo/api test` → PASS.
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
bun run lint:fix
git add packages/api/src/domain/RecipeService/index.ts packages/api/src/interfaces/RecipeHandlers/index.ts packages/api/src/domain/RecipeService/index.test.ts
git commit -m "$(cat <<'EOF'
feat(api): accept client id on recipe create for idempotent offline replay

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Web — widen outbox types, intent reducers, replay, api create-id params

**Files:**
- Modify: `packages/web/src/offline/outboxStore.ts` (widen op/entity unions)
- Modify: `packages/web/src/offline/intents.ts` (`applyTodoIntent`, `applyLabelIntent`, `applyRecipeIntent`)
- Modify: `packages/web/src/offline/replay.ts` (op cases)
- Modify: `packages/web/src/api/index.ts` (`createTodo`, `createLabel`, `addRecipe` accept `id`)
- Test: `packages/web/src/offline/intents.test.ts` (extend)

**Interfaces:**
- Consumes: `Todo`, `Label`, `Recipe`, `Ingredient` from `@shoppingo/types`; api fns from `../api`.
- Produces:
  - outbox unions widened (below).
  - `applyTodoIntent(todos: Todo[], intent): Todo[]`, `applyLabelIntent(labels: Label[], intent): Label[]`, `applyRecipeIntent(recipes: Recipe[], intent): Recipe[]`.
  - `replayIntent` handles `todo.*`, `label.*`, `recipe.*`.
  - web `createTodo(body, id?)`, `createLabel(body, id?)`, `addRecipe(title, user, selectedUsers?, ingredients?, link?, instructions?, id?)`.

- [ ] **Step 1: Widen outbox types**

In `packages/web/src/offline/outboxStore.ts`:

```ts
export type ItemOp = 'item.add' | 'item.toggle' | 'item.delete' | 'item.rename' | 'item.quantity';
export type ListOp = 'list.create';
export type TodoOp = 'todo.create' | 'todo.update' | 'todo.delete' | 'todo.complete';
export type LabelOp = 'label.create' | 'label.update' | 'label.delete';
export type RecipeOp = 'recipe.create' | 'recipe.update' | 'recipe.delete';
export type EntityType = 'item' | 'list' | 'todo' | 'label' | 'recipe';

export interface OutboxIntent {
    seq: number;
    id: string;
    entityType: EntityType;
    op: ItemOp | ListOp | TodoOp | LabelOp | RecipeOp;
    targetId: string;
    scope: string;
    payload: Record<string, unknown>;
    createdAt: number;
}
```

- [ ] **Step 2: Write failing reducer tests**

In `packages/web/src/offline/intents.test.ts` add (the file already imports `OutboxIntent`):

```ts
import { applyLabelIntent, applyRecipeIntent, applyTodoIntent } from './intents';

const todoIntent = (op: OutboxIntent['op'], targetId: string, payload = {}): OutboxIntent =>
    ({ seq: 1, id: 'i', entityType: 'todo', op, targetId, scope: 'user-1', payload, createdAt: 0 });

describe('applyTodoIntent', () => {
    it('todo.create appends a new todo', () => {
        const r = applyTodoIntent([], todoIntent('todo.create', 'T1', { title: 'Buy milk', ownerId: 'user-1' }));
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ id: 'T1', title: 'Buy milk', done: false, ownerId: 'user-1' });
    });
    it('todo.create is idempotent when id already present', () => {
        const existing = [{ id: 'T1', ownerId: 'user-1', title: 'Buy milk', done: false, dateAdded: new Date() }];
        expect(applyTodoIntent(existing as never, todoIntent('todo.create', 'T1', { title: 'x' }))).toHaveLength(1);
    });
    it('todo.update merges fields by id', () => {
        const existing = [{ id: 'T1', ownerId: 'user-1', title: 'Buy milk', done: false, dateAdded: new Date() }];
        const r = applyTodoIntent(existing as never, todoIntent('todo.update', 'T1', { title: 'Buy oat milk' }));
        expect(r[0].title).toBe('Buy oat milk');
    });
    it('todo.delete removes by id', () => {
        const existing = [{ id: 'T1', ownerId: 'user-1', title: 'Buy milk', done: false, dateAdded: new Date() }];
        expect(applyTodoIntent(existing as never, todoIntent('todo.delete', 'T1'))).toHaveLength(0);
    });
    it('todo.complete toggles done for a non-recurring todo', () => {
        const existing = [{ id: 'T1', ownerId: 'user-1', title: 'Buy milk', done: false, dateAdded: new Date() }];
        expect(applyTodoIntent(existing as never, todoIntent('todo.complete', 'T1'))[0].done).toBe(true);
    });
});

const labelIntent = (op: OutboxIntent['op'], targetId: string, payload = {}): OutboxIntent =>
    ({ seq: 1, id: 'i', entityType: 'label', op, targetId, scope: 'user-1', payload, createdAt: 0 });

describe('applyLabelIntent', () => {
    it('label.create appends a new label', () => {
        const r = applyLabelIntent([], labelIntent('label.create', 'L1', { name: 'Home', color: '#fff', ownerId: 'user-1' }));
        expect(r[0]).toMatchObject({ id: 'L1', name: 'Home', color: '#fff', ownerId: 'user-1' });
    });
    it('label.update merges fields by id', () => {
        const existing = [{ id: 'L1', ownerId: 'user-1', name: 'Home', color: '#fff' }];
        expect(applyLabelIntent(existing as never, labelIntent('label.update', 'L1', { color: '#000' }))[0].color).toBe('#000');
    });
    it('label.delete removes by id', () => {
        const existing = [{ id: 'L1', ownerId: 'user-1', name: 'Home', color: '#fff' }];
        expect(applyLabelIntent(existing as never, labelIntent('label.delete', 'L1'))).toHaveLength(0);
    });
});

const recipeIntent = (op: OutboxIntent['op'], targetId: string, payload = {}): OutboxIntent =>
    ({ seq: 1, id: 'i', entityType: 'recipe', op, targetId, scope: 'user-1', payload, createdAt: 0 });

describe('applyRecipeIntent', () => {
    it('recipe.create appends a text-only recipe', () => {
        const r = applyRecipeIntent([], recipeIntent('recipe.create', 'R1', { title: 'Pasta', ownerId: 'user-1' }));
        expect(r[0]).toMatchObject({ id: 'R1', title: 'Pasta', ownerId: 'user-1' });
        expect(Array.isArray(r[0].ingredients)).toBe(true);
    });
    it('recipe.update merges title by id', () => {
        const existing = [{ id: 'R1', title: 'Pasta', ingredients: [], ownerId: 'user-1', users: [], dateAdded: new Date() }];
        expect(applyRecipeIntent(existing as never, recipeIntent('recipe.update', 'R1', { title: 'Risotto' }))[0].title).toBe('Risotto');
    });
    it('recipe.delete removes by id', () => {
        const existing = [{ id: 'R1', title: 'Pasta', ingredients: [], ownerId: 'user-1', users: [], dateAdded: new Date() }];
        expect(applyRecipeIntent(existing as never, recipeIntent('recipe.delete', 'R1'))).toHaveLength(0);
    });
});
```

- [ ] **Step 3: Run, verify fail**

Run: `bun run --filter @shoppingo/web test intents`
Expected: FAIL — reducers not exported.

- [ ] **Step 4: Implement reducers**

In `packages/web/src/offline/intents.ts` (keep the file pure — no `../api`). Add at top:

```ts
import type { Ingredient, Label, Recipe, Todo } from '@shoppingo/types';
```

Append after the existing reducers:

```ts
export const applyTodoIntent = (todos: Todo[], intent: OutboxIntent): Todo[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'todo.create': {
            if (todos.some((t) => t.id === intent.targetId)) return todos;
            return [
                ...todos,
                {
                    id: intent.targetId,
                    ownerId: String(p.ownerId ?? ''),
                    title: String(p.title ?? ''),
                    done: false,
                    dateAdded: new Date(),
                    ...(p.dueDate !== undefined && { dueDate: p.dueDate as Todo['dueDate'] }),
                    ...(p.time !== undefined && { time: String(p.time) }),
                    ...(p.labelId !== undefined && { labelId: String(p.labelId) }),
                    ...(p.recurrence !== undefined && { recurrence: p.recurrence as Todo['recurrence'], completedDates: [] }),
                } as Todo,
            ];
        }
        case 'todo.update':
            return todos.map((t) => (t.id === intent.targetId ? { ...t, ...(p as Partial<Todo>) } : t));
        case 'todo.delete':
            return todos.filter((t) => t.id !== intent.targetId);
        case 'todo.complete':
            return todos.map((t) => {
                if (t.id !== intent.targetId) return t;
                const date = p.date as string | undefined;
                if (t.recurrence && date) {
                    const current = t.completedDates ?? [];
                    const completedDates = current.includes(date)
                        ? current.filter((d) => d !== date)
                        : [...current, date];
                    return { ...t, completedDates };
                }
                return { ...t, done: !t.done };
            });
        default:
            return todos;
    }
};

export const applyLabelIntent = (labels: Label[], intent: OutboxIntent): Label[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'label.create': {
            if (labels.some((l) => l.id === intent.targetId)) return labels;
            return [
                ...labels,
                { id: intent.targetId, ownerId: String(p.ownerId ?? ''), name: String(p.name ?? ''), color: String(p.color ?? '') },
            ];
        }
        case 'label.update':
            return labels.map((l) =>
                l.id === intent.targetId
                    ? {
                          ...l,
                          ...(p.name !== undefined && { name: String(p.name) }),
                          ...(p.color !== undefined && { color: String(p.color) }),
                      }
                    : l
            );
        case 'label.delete':
            return labels.filter((l) => l.id !== intent.targetId);
        default:
            return labels;
    }
};

export const applyRecipeIntent = (recipes: Recipe[], intent: OutboxIntent): Recipe[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'recipe.create': {
            if (recipes.some((r) => r.id === intent.targetId)) return recipes;
            const rawIngredients = (p.ingredients as Array<Omit<Ingredient, 'id'>> | undefined) ?? [];
            return [
                ...recipes,
                {
                    id: intent.targetId,
                    title: String(p.title ?? ''),
                    ingredients: rawIngredients.map((ing) => ({ ...ing, id: crypto.randomUUID() })) as Ingredient[],
                    ownerId: String(p.ownerId ?? ''),
                    users: (p.users as Recipe['users']) ?? [],
                    dateAdded: new Date(),
                    ...(p.link !== undefined && { link: String(p.link) }),
                    ...(p.instructions !== undefined && { instructions: p.instructions as string[] }),
                } as Recipe,
            ];
        }
        case 'recipe.update':
            return recipes.map((r) =>
                r.id === intent.targetId
                    ? {
                          ...r,
                          ...(p.title !== undefined && { title: String(p.title) }),
                          ...(p.ingredients !== undefined && { ingredients: p.ingredients as Ingredient[] }),
                          ...(p.link !== undefined && { link: String(p.link) }),
                          ...(p.instructions !== undefined && { instructions: p.instructions as string[] }),
                      }
                    : r
            );
        case 'recipe.delete':
            return recipes.filter((r) => r.id !== intent.targetId);
        default:
            return recipes;
    }
};
```

> If `crypto.randomUUID` is unavailable in the jsdom test env, the reducer ingredient-id test only checks `Array.isArray`, so it passes regardless; production runs in a secure context where `crypto.randomUUID` exists.

- [ ] **Step 5: Extend `addList`/web api create fns with `id`**

In `packages/web/src/api/index.ts`:

```ts
export const createTodo = async (body: CreateTodoBody, id?: string): Promise<Todo> => {
    return await makeRequest({
        pathname: '/api/todos',
        method: MethodType.PUT,
        operationString: 'create todo',
        body: JSON.stringify(id !== undefined ? { ...body, id } : body),
    });
};

export const createLabel = async (body: { name: string; color: string }, id?: string): Promise<Label> => {
    return await makeRequest({
        pathname: '/api/labels',
        method: MethodType.PUT,
        operationString: 'create label',
        body: JSON.stringify(id !== undefined ? { ...body, id } : body),
    });
};
```

And extend `addRecipe` with a trailing `id?`:

```ts
export const addRecipe = async (
    title: string,
    user: User,
    selectedUsers?: Array<string>,
    ingredients?: Array<{ name: string; quantity?: number; unit?: string }>,
    link?: string,
    instructions?: string[],
    id?: string
): Promise<Recipe> => {
    const dateAdded = generateTimestamp(new Date());
    const requestBody = {
        title,
        dateAdded,
        user,
        selectedUsers: selectedUsers || [],
        ...(ingredients !== undefined && { ingredients }),
        ...(link !== undefined && { link }),
        ...(instructions !== undefined && { instructions }),
        ...(id !== undefined && { id }),
    };

    const result = await makeRequest({
        pathname: '/api/recipes',
        method: MethodType.PUT,
        operationString: 'add recipe',
        body: JSON.stringify(requestBody),
    });

    return result as Recipe;
};
```

> Confirm the existing `createLabel` body shape matches the current implementation before editing (only add the `id` branch; keep `createTodo`'s existing body passthrough). If the current `createTodo`/`createLabel` already JSON-stringify `body` directly, the only change is the conditional `id` spread.

- [ ] **Step 6: Map new ops in `replay.ts`**

In `packages/web/src/offline/replay.ts`, extend the import and add cases:

```ts
import {
    addItem,
    addList,
    addRecipe,
    createLabel,
    createTodo,
    completeTodo,
    deleteItem,
    deleteLabel,
    deleteRecipe,
    deleteTodo,
    updateItem,
    updateItemName,
    updateItemQuantity,
    updateLabel,
    updateRecipe,
    updateTodo,
} from '../api';
```

Add inside the `switch (intent.op)`:

```ts
case 'todo.create':
    await createTodo(intent.payload as Parameters<typeof createTodo>[0], intent.targetId);
    return;
case 'todo.update':
    await updateTodo(intent.targetId, intent.payload as Parameters<typeof updateTodo>[1]);
    return;
case 'todo.delete':
    await deleteTodo(intent.targetId);
    return;
case 'todo.complete':
    await completeTodo(intent.targetId, intent.payload.date as string | undefined);
    return;
case 'label.create':
    await createLabel(intent.payload as Parameters<typeof createLabel>[0], intent.targetId);
    return;
case 'label.update':
    await updateLabel(intent.targetId, intent.payload as Parameters<typeof updateLabel>[1]);
    return;
case 'label.delete':
    await deleteLabel(intent.targetId);
    return;
case 'recipe.create': {
    const p = intent.payload;
    await addRecipe(
        String(p.title),
        p.user as Parameters<typeof addRecipe>[1],
        (p.selectedUsers as string[] | undefined) ?? [],
        p.ingredients as Parameters<typeof addRecipe>[3] | undefined,
        p.link as string | undefined,
        p.instructions as string[] | undefined,
        intent.targetId
    );
    return;
}
case 'recipe.update': {
    const p = intent.payload;
    await updateRecipe(
        intent.targetId,
        String(p.title),
        p.ingredients as Parameters<typeof updateRecipe>[2],
        p.coverImageKey as string | undefined,
        p.link as string | undefined,
        p.instructions as string[] | undefined
    );
    return;
}
case 'recipe.delete':
    await deleteRecipe(intent.targetId);
    return;
```

- [ ] **Step 7: Run tests + typecheck**

Run: `bun run --filter @shoppingo/web test intents` → PASS.
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 8: Commit**

```bash
bun run lint:fix
git add packages/web/src/offline/outboxStore.ts packages/web/src/offline/intents.ts packages/web/src/offline/replay.ts packages/web/src/api/index.ts packages/web/src/offline/intents.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add todo/label/recipe intent reducers and replay mapping

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Web — fold pending todo/label/recipe intents into their queries

**Files:**
- Modify: `packages/web/src/offline/foldPending.ts` (`foldPendingTodos`, `foldPendingLabels`, `foldPendingRecipes`)
- Modify: `packages/web/src/api/index.ts` (`getTodosQuery(userId)`, `getLabelsQuery(userId)`, recipe fold in `getRecipesQuery`)
- Modify: `packages/web/src/hooks/useTodos.ts`, `packages/web/src/hooks/useLabels.ts` (pass `userId` to the query — call-site updates only)
- Test: `packages/web/src/offline/foldPending.test.ts` (extend)

**Interfaces:**
- Consumes: `applyTodoIntent`/`applyLabelIntent`/`applyRecipeIntent` (Task 4); `outboxStore.peekAll`.
- Produces: `foldPendingTodos(userId, todos)`, `foldPendingLabels(userId, labels)`, `foldPendingRecipes(userId, recipes)`; `getTodosQuery(userId)`, `getLabelsQuery(userId)`.

- [ ] **Step 1: Write failing fold tests**

In `packages/web/src/offline/foldPending.test.ts` add:

```ts
import { foldPendingLabels, foldPendingRecipes, foldPendingTodos } from './foldPending';

describe('foldPendingTodos', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });
    it('appends pending todo.create for the given user', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'todo', op: 'todo.create', targetId: 'T1', scope: 'user-1', payload: { title: 'Buy milk', ownerId: 'user-1' }, createdAt: 0 });
        const server = [{ id: 'S1', ownerId: 'user-1', title: 'Existing', done: false, dateAdded: new Date() }];
        expect(foldPendingTodos('user-1', server as never).map((t) => t.id)).toEqual(['S1', 'T1']);
    });
    it('ignores todo intents scoped to another user', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'todo', op: 'todo.create', targetId: 'T1', scope: 'user-2', payload: { title: 'x' }, createdAt: 0 });
        const server = [{ id: 'S1', ownerId: 'user-1', title: 'Existing', done: false, dateAdded: new Date() }];
        expect(foldPendingTodos('user-1', server as never)).toHaveLength(1);
    });
});

describe('foldPendingLabels', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });
    it('appends pending label.create for the given user', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'label', op: 'label.create', targetId: 'L1', scope: 'user-1', payload: { name: 'Home', color: '#fff', ownerId: 'user-1' }, createdAt: 0 });
        const server = [{ id: 'S1', ownerId: 'user-1', name: 'Work', color: '#000' }];
        expect(foldPendingLabels('user-1', server as never).map((l) => l.id)).toEqual(['S1', 'L1']);
    });
});

describe('foldPendingRecipes', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });
    it('appends pending recipe.create for the given user', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'recipe', op: 'recipe.create', targetId: 'R1', scope: 'user-1', payload: { title: 'Pasta', ownerId: 'user-1' }, createdAt: 0 });
        const server = [{ id: 'S1', title: 'Soup', ingredients: [], ownerId: 'user-1', users: [], dateAdded: new Date() }];
        expect(foldPendingRecipes('user-1', server as never).map((r) => r.id)).toEqual(['S1', 'R1']);
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test foldPending`
Expected: FAIL — folds not exported.

- [ ] **Step 3: Implement folds**

In `packages/web/src/offline/foldPending.ts`, extend the imports and append:

```ts
import type { Item, Label, ListResponse, ListType, Recipe, Todo, User } from '@shoppingo/types';
import { applyItemIntent, applyLabelIntent, applyListIntent, applyRecipeIntent, applyTodoIntent, type ItemView, type ListView } from './intents';
```

```ts
export const foldPendingTodos = (userId: string, todos: Todo[]): Todo[] => {
    const pending = outboxStore.peekAll().filter((i) => i.entityType === 'todo' && i.scope === userId);
    if (pending.length === 0) return todos;
    return pending.reduce<Todo[]>((acc, intent) => applyTodoIntent(acc, intent), todos);
};

export const foldPendingLabels = (userId: string, labels: Label[]): Label[] => {
    const pending = outboxStore.peekAll().filter((i) => i.entityType === 'label' && i.scope === userId);
    if (pending.length === 0) return labels;
    return pending.reduce<Label[]>((acc, intent) => applyLabelIntent(acc, intent), labels);
};

export const foldPendingRecipes = (userId: string, recipes: Recipe[]): Recipe[] => {
    const pending = outboxStore.peekAll().filter((i) => i.entityType === 'recipe' && i.scope === userId);
    if (pending.length === 0) return recipes;
    return pending.reduce<Recipe[]>((acc, intent) => applyRecipeIntent(acc, intent), recipes);
};
```

> Keep the existing `foldPendingItems` / `foldPendingLists` exactly as they are; only the import line and the three new functions are added.

- [ ] **Step 4: Wire the queries**

In `packages/web/src/api/index.ts`:

```ts
import { foldPendingItems, foldPendingLabels, foldPendingLists, foldPendingRecipes, foldPendingTodos } from '../offline/foldPending';
```

```ts
export const getTodosQuery = (userId: string) => ({
    queryKey: ['todos'],
    queryFn: async () => foldPendingTodos(userId, await getTodos()),
});

export const getLabelsQuery = (userId: string) => ({
    queryKey: ['labels'],
    queryFn: async () => foldPendingLabels(userId, await getLabels()),
});

export const getRecipesQuery = (userId: string) => ({
    queryKey: ['recipes', userId],
    queryFn: async () => foldPendingRecipes(userId, await getRecipes(userId)),
});
```

- [ ] **Step 5: Update call sites for the signature change**

In `packages/web/src/hooks/useTodos.ts`, pass the user id. Add `import { useUser } from '@imapps/web-utils';`, read `const { user } = useUser();`, and change the query line to:

```ts
const { data, isLoading, isError, refetch } = useQuery<Todo[]>(getTodosQuery(user?.id ?? ''));
```

In `packages/web/src/hooks/useLabels.ts`, the same:

```ts
const { data, isLoading, refetch } = useQuery<Label[]>(getLabelsQuery(user?.id ?? ''));
```

> Search for any other callers of `getTodosQuery(` / `getLabelsQuery(` and update them to pass the user id. `getRecipesQuery` already takes a userId — no recipe call-site change.

- [ ] **Step 6: Run tests + typecheck**

Run: `bun run --filter @shoppingo/web test foldPending` → PASS.
Run: `bun run tsc --noEmit` → clean (resolves all `getTodosQuery`/`getLabelsQuery` callers).

- [ ] **Step 7: Commit**

```bash
bun run lint:fix
git add packages/web/src/offline/foldPending.ts packages/web/src/api/index.ts packages/web/src/hooks/useTodos.ts packages/web/src/hooks/useLabels.ts packages/web/src/offline/foldPending.test.ts
git commit -m "$(cat <<'EOF'
feat(web): fold pending todo/label/recipe intents into their queries

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Web — route todo mutations through the outbox

**Files:**
- Modify: `packages/web/src/hooks/useTodos.ts`
- Test: `packages/web/src/hooks/useTodos.test.tsx` (extend)

**Interfaces:**
- Consumes: `outboxStore.enqueue`, `drainOutbox`, `getTodosQuery` (Task 5).
- Produces: `useTodos` returns the same `{ createTodo, updateTodo, deleteTodo, completeTodo }` signatures; each enqueues an intent + optimistic cache update + drain.

- [ ] **Step 1: Write the failing test**

In `packages/web/src/hooks/useTodos.test.tsx`, add (ensure `import 'fake-indexeddb/auto';` is at the very top of the file, and mock the drainer):

```ts
import { outboxStore } from '../offline/outboxStore';
// at top, alongside other vi.mock calls:
vi.mock('../offline/drainer', () => ({ drainOutbox: vi.fn().mockResolvedValue(undefined) }));

it('createTodo enqueues a todo.create intent and optimistically adds it', async () => {
    await outboxStore._resetForTests();
    // render useTodos via the file's existing wrapper/QueryClient helper
    const { result } = renderHook(() => useTodos(), { wrapper });
    await act(async () => { await result.current.createTodo({ title: 'Buy milk' }); });
    await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
    const intent = outboxStore.peekAll()[0];
    expect(intent.op).toBe('todo.create');
    expect(intent.entityType).toBe('todo');
    expect(intent.payload).toMatchObject({ title: 'Buy milk' });
});
```

> Mirror the file's existing `renderHook` wrapper (`QueryClientProvider`) and the mocked `useUser` (user id `user-1`). If the file mocks `../api`, remove/relax those mocks for the create path since the hook no longer calls `apiCreate` directly. The test must assert the outbox enqueue, not an api-fn call.

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test useTodos`
Expected: FAIL — no intent enqueued (hook still calls the api mutation).

- [ ] **Step 3: Implement**

Rewrite `packages/web/src/hooks/useTodos.ts` to enqueue intents (keep the returned signatures identical):

```ts
import { useUser } from '@imapps/web-utils';
import type { Todo } from '@shoppingo/types';
import { useQuery, useQueryClient } from 'react-query';
import { type CreateTodoBody, getTodosQuery } from '../api';
import { drainOutbox } from '../offline/drainer';
import { outboxStore } from '../offline/outboxStore';

export const useTodos = () => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const userId = user?.id ?? '';

    const { data, isLoading, isError, refetch } = useQuery<Todo[]>(getTodosQuery(userId));

    const patchCache = (fn: (todos: Todo[]) => Todo[]) =>
        queryClient.setQueryData<Todo[]>(['todos'], (old) => fn(old ?? []));

    return {
        todos: data ?? [],
        isLoading,
        isError,
        refetch,
        createTodo: async (body: CreateTodoBody) => {
            const id = crypto.randomUUID();
            patchCache((todos) => [
                ...todos,
                { id, ownerId: userId, title: body.title, done: false, dateAdded: new Date(),
                  ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
                  ...(body.time !== undefined && { time: body.time }),
                  ...(body.labelId !== undefined && { labelId: body.labelId }),
                  ...(body.recurrence !== undefined && { recurrence: body.recurrence, completedDates: [] }) } as Todo,
            ]);
            await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'todo', op: 'todo.create', targetId: id, scope: userId, payload: { ...body, ownerId: userId }, createdAt: Date.now() });
            void drainOutbox();
        },
        updateTodo: async (id: string, body: Partial<Todo>) => {
            patchCache((todos) => todos.map((t) => (t.id === id ? { ...t, ...body } : t)));
            await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'todo', op: 'todo.update', targetId: id, scope: userId, payload: body as Record<string, unknown>, createdAt: Date.now() });
            void drainOutbox();
        },
        deleteTodo: async (id: string) => {
            patchCache((todos) => todos.filter((t) => t.id !== id));
            await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'todo', op: 'todo.delete', targetId: id, scope: userId, payload: {}, createdAt: Date.now() });
            void drainOutbox();
        },
        completeTodo: async (id: string, date?: string) => {
            patchCache((todos) => todos.map((t) => {
                if (t.id !== id) return t;
                if (t.recurrence && date) {
                    const current = t.completedDates ?? [];
                    const completedDates = current.includes(date) ? current.filter((d) => d !== date) : [...current, date];
                    return { ...t, completedDates };
                }
                return { ...t, done: !t.done };
            }));
            await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'todo', op: 'todo.complete', targetId: id, scope: userId, payload: date !== undefined ? { date } : {}, createdAt: Date.now() });
            void drainOutbox();
        },
    };
};
```

> The optimistic cache writes duplicate the reducer logic intentionally — the reducer is for cold-start fold (no cache yet), the cache patch is for the live in-memory view. Both must agree.

- [ ] **Step 4: Run, verify pass**

Run: `bun run --filter @shoppingo/web test useTodos` → PASS.
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
bun run lint:fix
git add packages/web/src/hooks/useTodos.ts packages/web/src/hooks/useTodos.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): route todo mutations through the outbox queue

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Web — route label mutations through the outbox

**Files:**
- Modify: `packages/web/src/hooks/useLabels.ts`
- Test: `packages/web/src/hooks/useLabels.test.tsx` (create if absent)

**Interfaces:**
- Produces: `useLabels` returns the same `{ createLabel, updateLabel, deleteLabel }` signatures; each enqueues an intent + optimistic cache update + drain.

- [ ] **Step 1: Write the failing test**

Create/extend `packages/web/src/hooks/useLabels.test.tsx` (mirror `useCreateList.test.tsx` for the wrapper + `useUser` mock; `import 'fake-indexeddb/auto';` first):

```ts
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../offline/drainer', () => ({ drainOutbox: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@imapps/web-utils', () => ({ useUser: () => ({ user: { id: 'user-1', username: 'me' } }) }));
import { outboxStore } from '../offline/outboxStore';
import { useLabels } from './useLabels';

const wrap = (client: QueryClient) =>
    ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

describe('useLabels offline', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });
    it('createLabel enqueues a label.create intent', async () => {
        const client = new QueryClient();
        client.setQueryData(['labels'], []);
        const { result } = renderHook(() => useLabels(), { wrapper: wrap(client) });
        await act(async () => { await result.current.createLabel({ name: 'Home', color: '#fff' }); });
        await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
        expect(outboxStore.peekAll()[0]).toMatchObject({ op: 'label.create', entityType: 'label', scope: 'user-1' });
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test useLabels`
Expected: FAIL — no intent enqueued.

- [ ] **Step 3: Implement**

Rewrite `packages/web/src/hooks/useLabels.ts`:

```ts
import { useUser } from '@imapps/web-utils';
import type { Label } from '@shoppingo/types';
import { useQuery, useQueryClient } from 'react-query';
import { getLabelsQuery } from '../api';
import { drainOutbox } from '../offline/drainer';
import { outboxStore } from '../offline/outboxStore';

export const useLabels = () => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const userId = user?.id ?? '';

    const { data, isLoading, refetch } = useQuery<Label[]>(getLabelsQuery(userId));

    const patchCache = (fn: (labels: Label[]) => Label[]) =>
        queryClient.setQueryData<Label[]>(['labels'], (old) => fn(old ?? []));

    return {
        labels: data ?? [],
        isLoading,
        refetch,
        createLabel: async (body: { name: string; color: string }) => {
            const id = crypto.randomUUID();
            patchCache((labels) => [...labels, { id, ownerId: userId, name: body.name, color: body.color }]);
            await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'label', op: 'label.create', targetId: id, scope: userId, payload: { ...body, ownerId: userId }, createdAt: Date.now() });
            void drainOutbox();
        },
        updateLabel: async (id: string, body: { name?: string; color?: string }) => {
            patchCache((labels) => labels.map((l) => (l.id === id ? { ...l, ...body } : l)));
            await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'label', op: 'label.update', targetId: id, scope: userId, payload: body as Record<string, unknown>, createdAt: Date.now() });
            void drainOutbox();
        },
        deleteLabel: async (id: string) => {
            patchCache((labels) => labels.filter((l) => l.id !== id));
            await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'label', op: 'label.delete', targetId: id, scope: userId, payload: {}, createdAt: Date.now() });
            void drainOutbox();
        },
    };
};
```

- [ ] **Step 4: Run, verify pass**

Run: `bun run --filter @shoppingo/web test useLabels` → PASS.
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
bun run lint:fix
git add packages/web/src/hooks/useLabels.ts packages/web/src/hooks/useLabels.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): route label mutations through the outbox queue

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Web — route recipe mutations through the outbox + final verification

**Files:**
- Create: `packages/web/src/hooks/useRecipeMutations.ts`
- Test: `packages/web/src/hooks/useRecipeMutations.test.tsx`
- Modify: `packages/web/src/pages/RecipesPage/index.tsx` (create via hook)
- Modify: `packages/web/src/pages/RecipeDetailPage/index.tsx` (update/delete via hook)

**Interfaces:**
- Consumes: `outboxStore.enqueue`, `drainOutbox`, `applyRecipeIntent` (via fold).
- Produces: `useRecipeMutations(user)` → `{ createRecipe, updateRecipe, deleteRecipe }`:
  - `createRecipe(title, selectedUsers, ingredients?, link?, instructions?) => Promise<string>` (returns the new recipe id; text-only — no image),
  - `updateRecipe(recipeId, title, ingredients, coverImageKey?, link?, instructions?) => Promise<void>`,
  - `deleteRecipe(recipeId) => Promise<void>`.

- [ ] **Step 1: Write the failing hook test**

Create `packages/web/src/hooks/useRecipeMutations.test.tsx`:

```ts
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../offline/drainer', () => ({ drainOutbox: vi.fn().mockResolvedValue(undefined) }));
import { outboxStore } from '../offline/outboxStore';
import { useRecipeMutations } from './useRecipeMutations';

const user = { id: 'user-1', username: 'me' };
const wrap = (client: QueryClient) =>
    ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

describe('useRecipeMutations', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });

    it('createRecipe enqueues a recipe.create intent and optimistically adds it', async () => {
        const client = new QueryClient();
        client.setQueryData(['recipes', 'user-1'], []);
        const { result } = renderHook(() => useRecipeMutations(user), { wrapper: wrap(client) });
        await act(async () => { await result.current.createRecipe('Pasta', [], []); });
        await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
        expect(outboxStore.peekAll()[0]).toMatchObject({ op: 'recipe.create', entityType: 'recipe', scope: 'user-1' });
        const cached = client.getQueryData(['recipes', 'user-1']) as Array<{ title: string }>;
        expect(cached.map((r) => r.title)).toContain('Pasta');
    });

    it('deleteRecipe enqueues a recipe.delete intent', async () => {
        const client = new QueryClient();
        client.setQueryData(['recipes', 'user-1'], [{ id: 'R1', title: 'Pasta', ingredients: [], ownerId: 'user-1', users: [], dateAdded: new Date() }]);
        const { result } = renderHook(() => useRecipeMutations(user), { wrapper: wrap(client) });
        await act(async () => { await result.current.deleteRecipe('R1'); });
        await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
        expect(outboxStore.peekAll()[0]).toMatchObject({ op: 'recipe.delete', targetId: 'R1' });
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test useRecipeMutations`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `packages/web/src/hooks/useRecipeMutations.ts`:

```ts
import type { Ingredient, Recipe, User } from '@shoppingo/types';
import { useQueryClient } from 'react-query';
import { drainOutbox } from '../offline/drainer';
import { outboxStore } from '../offline/outboxStore';

type NewIngredient = { name: string; quantity?: number; unit?: string };

export const useRecipeMutations = (user: User | undefined) => {
    const queryClient = useQueryClient();
    const userId = user?.id ?? '';

    const patchList = (fn: (recipes: Recipe[]) => Recipe[]) =>
        queryClient.setQueryData<Recipe[]>(['recipes', userId], (old) => fn(old ?? []));

    return {
        createRecipe: async (
            title: string,
            selectedUsers: string[],
            ingredients?: NewIngredient[],
            link?: string,
            instructions?: string[]
        ): Promise<string> => {
            const id = crypto.randomUUID();
            patchList((recipes) => [
                ...recipes,
                {
                    id,
                    title,
                    ingredients: (ingredients ?? []).map((ing) => ({ ...ing, id: crypto.randomUUID() })) as Ingredient[],
                    ownerId: userId,
                    users: user ? [user] : [],
                    dateAdded: new Date(),
                    ...(link !== undefined && { link }),
                    ...(instructions !== undefined && { instructions }),
                } as Recipe,
            ]);
            await outboxStore.enqueue({
                id: crypto.randomUUID(),
                entityType: 'recipe',
                op: 'recipe.create',
                targetId: id,
                scope: userId,
                payload: { title, selectedUsers, ingredients, link, instructions, user, ownerId: userId },
                createdAt: Date.now(),
            });
            void drainOutbox();
            return id;
        },
        updateRecipe: async (
            recipeId: string,
            title: string,
            ingredients: Ingredient[],
            coverImageKey?: string,
            link?: string,
            instructions?: string[]
        ): Promise<void> => {
            patchList((recipes) =>
                recipes.map((r) =>
                    r.id === recipeId
                        ? { ...r, title, ingredients, ...(coverImageKey !== undefined && { coverImageKey }), ...(link !== undefined && { link }), ...(instructions !== undefined && { instructions }) }
                        : r
                )
            );
            queryClient.setQueryData<Recipe | null>(['recipe', recipeId], (old) =>
                old ? { ...old, title, ingredients, ...(coverImageKey !== undefined && { coverImageKey }), ...(link !== undefined && { link }), ...(instructions !== undefined && { instructions }) } : old
            );
            await outboxStore.enqueue({
                id: crypto.randomUUID(),
                entityType: 'recipe',
                op: 'recipe.update',
                targetId: recipeId,
                scope: userId,
                payload: { title, ingredients, ...(coverImageKey !== undefined && { coverImageKey }), ...(link !== undefined && { link }), ...(instructions !== undefined && { instructions }) },
                createdAt: Date.now(),
            });
            void drainOutbox();
        },
        deleteRecipe: async (recipeId: string): Promise<void> => {
            patchList((recipes) => recipes.filter((r) => r.id !== recipeId));
            await outboxStore.enqueue({
                id: crypto.randomUUID(),
                entityType: 'recipe',
                op: 'recipe.delete',
                targetId: recipeId,
                scope: userId,
                payload: {},
                createdAt: Date.now(),
            });
            void drainOutbox();
        },
    };
};
```

- [ ] **Step 4: Run, verify pass**

Run: `bun run --filter @shoppingo/web test useRecipeMutations` → PASS.

- [ ] **Step 5: Wire `RecipesPage` (create) and `RecipeDetailPage` (update/delete)**

In `packages/web/src/pages/RecipesPage/index.tsx`: replace the `addRecipe(...)` create call with `useRecipeMutations(user).createRecipe(...)`. Read the current `addRecipe` call's argument order and map it to `createRecipe(title, selectedUsers, ingredients?, link?, instructions?)`. Drop the now-unused `addRecipe` import. Keep `generateRecipeAiImage` / `uploadRecipeImage` and the auto-image `useEffect` exactly as-is (online-only image flows). After a successful create, keep the existing navigation/toast.

In `packages/web/src/pages/RecipeDetailPage/index.tsx`: replace each `await updateRecipe(...)` and `await deleteRecipe(...)` call with the hook's `updateRecipe` / `deleteRecipe` (`const { updateRecipe, deleteRecipe } = useRecipeMutations(user);`). The hook's `updateRecipe` signature matches the api fn exactly (`recipeId, title, ingredients, coverImageKey?, link?, instructions?`), so call sites pass identical args. Drop the now-unused `updateRecipe` / `deleteRecipe` api imports. Leave all image actions (`generateRecipeAiImage`, `revertRecipeAiImage`, `uploadRecipeImage`) calling the api directly — online-only.

> `useRecipeMutations` needs `user` from `useUser()`. Both pages already read `const { user } = useUser();`. If a page reaches an `updateRecipe`/`deleteRecipe` call before the `useUser` guard, hoist the hook call to the top level of the component (rules of hooks) and let the optimistic write no-op on an empty `userId`.

- [ ] **Step 6: Full verification**

```bash
bun run lint:fix
bun run tsc --noEmit
bun run --filter @shoppingo/web test
bun run --filter @shoppingo/api test   # expect the 1 known pre-existing middleware/auth network-mock failure; report counts
bunx fallow@2.100.0 dead-code          # MUST be green
bun run --filter @shoppingo/web build
bun run --filter @shoppingo/api build
```

- [ ] **Step 7: Manual smoke test (DevTools)**

1. `bun run start`, log in. DevTools → Network → **Offline**.
2. Create a todo, a label, and a text-only recipe. Confirm each appears; the pending badge counts all three.
3. Reload offline — all three persist (cold-start fold of `['todos']`, `['labels']`, `['recipes', userId]`).
4. Edit the todo, toggle its done state, edit the label color, edit the recipe title — confirm optimistic updates.
5. Go **Online**. Watch the badge drain to zero. Refresh: all create/edit/delete changes are on the server, in FIFO order (create before edit).
6. `Application → IndexedDB → shoppingo-outbox` → `intents` empties.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/hooks/useRecipeMutations.ts packages/web/src/hooks/useRecipeMutations.test.tsx packages/web/src/pages/RecipesPage/index.tsx packages/web/src/pages/RecipeDetailPage/index.tsx
git commit -m "$(cat <<'EOF'
feat(web): route recipe mutations through the outbox queue

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- API idempotent-create gap (todo/label/recipe) → Tasks 1, 2, 3. ✔
- Widen outbox unions + scope=userId → Task 4 Step 1; scope used in every enqueue (Tasks 6–8) and fold filter (Task 5). ✔
- Optimistic reducers (create/update/delete + todo complete) → Task 4. ✔
- Replay op→endpoint mapping with POST/PUT asymmetry (todo.update POST, recipe.update PUT, todo.complete POST /complete) → Task 4 Step 6. ✔
- Cold-start folds + query wiring + signature changes (`getTodosQuery(userId)`/`getLabelsQuery(userId)`) → Task 5. ✔
- Hook rewiring with stable signatures → Tasks 6 (todos), 7 (labels), 8 (recipes). ✔
- Recipe text-only offline; images online-only untouched → Task 8 Steps 3, 5. ✔
- FIFO/single-flight ordering invariant → Global Constraints; reused from Phase 1 drainer (unchanged). ✔

**Placeholder scan:** No TBD/TODO. Task 6 Step 1, Task 8 Step 5 say "mirror the file's existing wrapper" / "map to the current arg order" because the exact surrounding lines must be confirmed at edit time; the required action (assert enqueue / swap api call for hook, drop unused import) is explicit with full hook code given.

**Type consistency:** `EntityType`/op unions defined Task 4 Step 1, consumed by every later enqueue and fold. `applyTodoIntent(Todo[])`/`applyLabelIntent(Label[])`/`applyRecipeIntent(Recipe[])` defined Task 4, consumed Task 5. `foldPendingTodos/Labels/Recipes(userId, data)` defined Task 5, consumed in the query path. `getTodosQuery(userId)`/`getLabelsQuery(userId)` signature change (Task 5) reflected in `useTodos`/`useLabels` (Tasks 5–7). Web `createTodo(body,id?)`/`createLabel(body,id?)`/`addRecipe(...,id?)` (Task 4) consumed by `replayIntent` (Task 4 Step 6). `useRecipeMutations.updateRecipe` mirrors api `updateRecipe` arg order so RecipeDetailPage call sites are unchanged.

**Ordering edge:** an update/delete replayed before its create would 404 → drop-if-gone discards it. FIFO (seq order) + single-flight prevents this; do not add out-of-order draining.
