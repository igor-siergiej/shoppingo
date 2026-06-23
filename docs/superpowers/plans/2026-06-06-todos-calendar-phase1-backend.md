# Todos + Calendar — Phase 1: Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class `Todo` and `Label` entities to the API — types, Mongo repositories, domain services, Koa handlers, routes, and DI wiring — mirroring the existing Recipe/List clean-architecture.

**Architecture:** Each entity gets the standard four layers: a repository interface (`domain/`), a Mongo implementation (`infrastructure/`), a domain service with `ownerId` authorization (`domain/`), and Koa handlers (`interfaces/`) wired into `routes/index.ts` and the DI container. Recurrence is stored as a rule and never expanded server-side. Deleting a label cascades to clear `labelId` on the owner's todos.

**Tech Stack:** TypeScript, Koa, MongoDB native driver, Bun native test runner (`bun:test`), `@imapps/api-utils` DI container.

**Phase:** 1 of 3 (Backend). Phase 2 = Web, Phase 3 = E2E.

**Spec:** `docs/superpowers/specs/2026-06-06-first-class-todos-calendar-design.md`

---

## File Structure

**Shared types**
- Modify: `packages/types/src/index.ts` — drop `ListType.TODO`; add `Recurrence`, `Todo`, `TodoResponse`, `Label`, `LabelResponse`.

**API — Todo**
- Create: `packages/api/src/domain/TodoRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoTodoRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoTodoRepository/index.test.ts`
- Create: `packages/api/src/domain/TodoService/index.ts`
- Create: `packages/api/src/domain/TodoService/index.test.ts`
- Create: `packages/api/src/interfaces/TodoHandlers/index.ts`

**API — Label**
- Create: `packages/api/src/domain/LabelRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoLabelRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoLabelRepository/index.test.ts`
- Create: `packages/api/src/domain/LabelService/index.ts`
- Create: `packages/api/src/domain/LabelService/index.test.ts`
- Create: `packages/api/src/interfaces/LabelHandlers/index.ts`

**Wiring**
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Modify: `packages/api/src/routes/index.ts`

---

## Task 1: Shared types

**Files:**
- Modify: `packages/types/src/index.ts:1-4` (the `ListType` enum) and append new interfaces.

- [ ] **Step 1: Drop `TODO` from `ListType`**

Replace the enum at the top of `packages/types/src/index.ts`:

```ts
export enum ListType {
    SHOPPING = 'shopping',
}
```

- [ ] **Step 2: Append Todo + Label types**

Add at the end of `packages/types/src/index.ts`:

```ts
export interface Recurrence {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // every N units
    until?: Date; // optional inclusive series end
}

export interface Todo {
    id: string;
    ownerId: string;
    title: string;
    done: boolean;
    dateAdded: Date;
    dueDate?: Date; // undefined = Inbox/unscheduled
    time?: string; // 'HH:mm'; absent = all-day
    labelId?: string;
    recurrence?: Recurrence;
    completedDates?: string[]; // ISO day strings completed (recurring only)
}

export interface TodoResponse extends Todo {}

export interface Label {
    id: string;
    ownerId: string;
    name: string;
    color: string; // hex
}

export interface LabelResponse extends Label {}
```

- [ ] **Step 3: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS for the `types` package. The `api`/`web` packages may now show errors where `ListType.TODO` was used — those are addressed in their respective phases; for Phase 1, only the API references matter and are handled in Task 9.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add Todo and Label entities, drop ListType.TODO"
```

---

## Task 2: TodoRepository interface

**Files:**
- Create: `packages/api/src/domain/TodoRepository/index.ts`

- [ ] **Step 1: Write the interface**

```ts
import type { Todo } from '@shoppingo/types';

export interface TodoRepository {
    getById(todoId: string): Promise<Todo | null>;
    findByOwnerId(ownerId: string): Promise<Todo[]>;
    insert(todo: Todo): Promise<Todo>;
    update(todoId: string, todo: Todo): Promise<Todo>;
    deleteById(todoId: string): Promise<void>;
    clearLabel(labelId: string, ownerId: string): Promise<void>;
}
```

- [ ] **Step 2: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS (file is referenced by later tasks; standalone it compiles).

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/domain/TodoRepository/index.ts
git commit -m "feat(api): add TodoRepository interface"
```

---

## Task 3: MongoTodoRepository

**Files:**
- Create: `packages/api/src/infrastructure/MongoTodoRepository/index.ts`
- Test: `packages/api/src/infrastructure/MongoTodoRepository/index.test.ts`

- [ ] **Step 1: Write the failing test**

This mirrors the existing `MongoRecipeRepository` test style: a hand-rolled in-memory mock of `MongoDbConnection`'s collection API (`findOne`, `find().toArray()`, `insertOne`, `findOneAndReplace`, `deleteOne`, `updateMany`).

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import type { Todo } from '@shoppingo/types';
import { MongoTodoRepository } from './index';

const makeTodo = (over: Partial<Todo> = {}): Todo => ({
    id: 't1',
    ownerId: 'u1',
    title: 'Task',
    done: false,
    dateAdded: new Date('2026-06-01'),
    ...over,
});

class FakeCollection {
    docs: Todo[] = [];
    async findOne(q: { id: string }) {
        return this.docs.find((d) => d.id === q.id) ?? null;
    }
    find(q: { ownerId: string }) {
        const matched = this.docs.filter((d) => d.ownerId === q.ownerId);
        return { toArray: async () => matched };
    }
    async insertOne(doc: Todo) {
        this.docs.push(doc);
    }
    async findOneAndReplace(q: { id: string }, doc: Todo) {
        const i = this.docs.findIndex((d) => d.id === q.id);
        if (i >= 0) this.docs[i] = doc;
    }
    async deleteOne(q: { id: string }) {
        this.docs = this.docs.filter((d) => d.id !== q.id);
    }
    async updateMany(q: { labelId: string; ownerId: string }, update: { $unset: { labelId: '' } }) {
        for (const d of this.docs) {
            if (d.labelId === q.labelId && d.ownerId === q.ownerId) {
                delete (d as Partial<Todo>).labelId;
            }
        }
    }
}

const makeDb = (col: FakeCollection) => ({ getCollection: () => col }) as never;

describe('MongoTodoRepository', () => {
    let col: FakeCollection;
    let repo: MongoTodoRepository;

    beforeEach(() => {
        col = new FakeCollection();
        repo = new MongoTodoRepository(makeDb(col));
    });

    it('inserts and gets by id', async () => {
        await repo.insert(makeTodo());
        expect(await repo.getById('t1')).toMatchObject({ id: 't1', title: 'Task' });
    });

    it('returns null for missing id', async () => {
        expect(await repo.getById('nope')).toBeNull();
    });

    it('finds by owner id', async () => {
        await repo.insert(makeTodo({ id: 't1', ownerId: 'u1' }));
        await repo.insert(makeTodo({ id: 't2', ownerId: 'u2' }));
        const mine = await repo.findByOwnerId('u1');
        expect(mine.map((t) => t.id)).toEqual(['t1']);
    });

    it('replaces on update', async () => {
        await repo.insert(makeTodo());
        await repo.update('t1', makeTodo({ title: 'Updated' }));
        expect((await repo.getById('t1'))?.title).toBe('Updated');
    });

    it('deletes by id', async () => {
        await repo.insert(makeTodo());
        await repo.deleteById('t1');
        expect(await repo.getById('t1')).toBeNull();
    });

    it('clears labelId only for matching owner', async () => {
        await repo.insert(makeTodo({ id: 't1', ownerId: 'u1', labelId: 'L' }));
        await repo.insert(makeTodo({ id: 't2', ownerId: 'u2', labelId: 'L' }));
        await repo.clearLabel('L', 'u1');
        expect((await repo.getById('t1'))?.labelId).toBeUndefined();
        expect((await repo.getById('t2'))?.labelId).toBe('L');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test src/infrastructure/MongoTodoRepository/index.test.ts`
Expected: FAIL — `MongoTodoRepository` not found / cannot import.

- [ ] **Step 3: Write the implementation**

`packages/api/src/infrastructure/MongoTodoRepository/index.ts`:

```ts
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Todo } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { TodoRepository } from '../../domain/TodoRepository';

export class MongoTodoRepository implements TodoRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.Todo]: Todo }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.Todo);
    }

    async getById(todoId: string): Promise<Todo | null> {
        return this.collection().findOne({ id: todoId });
    }

    async findByOwnerId(ownerId: string): Promise<Todo[]> {
        return this.collection().find({ ownerId }).toArray();
    }

    async insert(todo: Todo): Promise<Todo> {
        await this.collection().insertOne(todo);
        return todo;
    }

    async update(todoId: string, todo: Todo): Promise<Todo> {
        await this.collection().findOneAndReplace({ id: todoId }, todo);
        const updated = await this.getById(todoId);
        if (!updated) {
            throw new Error('Todo not found');
        }
        return updated;
    }

    async deleteById(todoId: string): Promise<void> {
        await this.collection().deleteOne({ id: todoId });
    }

    async clearLabel(labelId: string, ownerId: string): Promise<void> {
        await this.collection().updateMany({ labelId, ownerId }, { $unset: { labelId: '' } });
    }
}
```

Note: `CollectionNames.Todo` is added in Task 9. If you implement this task before Task 9, add the enum member now (`Todo = 'todo'`) — Task 9 is idempotent about it.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/api test src/infrastructure/MongoTodoRepository/index.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/infrastructure/MongoTodoRepository/ packages/api/src/dependencies/types.ts
git commit -m "feat(api): add MongoTodoRepository"
```

---

## Task 4: TodoService

**Files:**
- Create: `packages/api/src/domain/TodoService/index.ts`
- Test: `packages/api/src/domain/TodoService/index.test.ts`

The service owns business logic: create (assigns id + dateAdded + ownerId), update (owner-only), delete (owner-only), and `toggleComplete(todoId, ownerId, date?)` — toggles `done` for non-recurring todos, or adds/removes `date` in `completedDates` for recurring todos. All owner checks throw `{ status: 403 }` on mismatch and `{ status: 404 }` when absent.

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import type { Todo } from '@shoppingo/types';
import { TodoService } from './index';

class MockRepo {
    store = new Map<string, Todo>();
    cleared: Array<{ labelId: string; ownerId: string }> = [];
    async insert(t: Todo) { this.store.set(t.id, t); return t; }
    async getById(id: string) { return this.store.get(id) ?? null; }
    async findByOwnerId(ownerId: string) {
        return [...this.store.values()].filter((t) => t.ownerId === ownerId);
    }
    async update(id: string, t: Todo) { this.store.set(id, t); return t; }
    async deleteById(id: string) { this.store.delete(id); }
    async clearLabel(labelId: string, ownerId: string) { this.cleared.push({ labelId, ownerId }); }
}

class MockIds {
    private n = 0;
    generate() { this.n += 1; return `id-${this.n}`; }
}

describe('TodoService', () => {
    let repo: MockRepo;
    let svc: TodoService;

    beforeEach(() => {
        repo = new MockRepo();
        svc = new TodoService(repo as never, new MockIds() as never);
    });

    it('creates a todo with id, ownerId, dateAdded, done=false', async () => {
        const todo = await svc.createTodo('u1', { title: 'Buy milk' });
        expect(todo.id).toBe('id-1');
        expect(todo.ownerId).toBe('u1');
        expect(todo.done).toBe(false);
        expect(todo.dateAdded).toBeInstanceOf(Date);
    });

    it('lists todos for the owner only', async () => {
        await svc.createTodo('u1', { title: 'A' });
        await svc.createTodo('u2', { title: 'B' });
        const mine = await svc.getTodosByOwner('u1');
        expect(mine).toHaveLength(1);
        expect(mine[0].title).toBe('A');
    });

    it('updates an owned todo', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        const updated = await svc.updateTodo(t.id, 'u1', { title: 'A2' });
        expect(updated.title).toBe('A2');
    });

    it('rejects update by a non-owner with 403', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        expect(svc.updateTodo(t.id, 'intruder', { title: 'x' })).rejects.toMatchObject({ status: 403 });
    });

    it('rejects update of a missing todo with 404', async () => {
        expect(svc.updateTodo('nope', 'u1', { title: 'x' })).rejects.toMatchObject({ status: 404 });
    });

    it('deletes an owned todo', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        await svc.deleteTodo(t.id, 'u1');
        expect(await repo.getById(t.id)).toBeNull();
    });

    it('rejects delete by non-owner with 403', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        expect(svc.deleteTodo(t.id, 'intruder')).rejects.toMatchObject({ status: 403 });
    });

    it('toggles done for a non-recurring todo', async () => {
        const t = await svc.createTodo('u1', { title: 'A' });
        const on = await svc.toggleComplete(t.id, 'u1');
        expect(on.done).toBe(true);
        const off = await svc.toggleComplete(t.id, 'u1');
        expect(off.done).toBe(false);
    });

    it('adds and removes a date in completedDates for a recurring todo', async () => {
        const t = await svc.createTodo('u1', {
            title: 'Standup',
            recurrence: { freq: 'daily', interval: 1 },
        });
        const added = await svc.toggleComplete(t.id, 'u1', '2026-06-04');
        expect(added.completedDates).toEqual(['2026-06-04']);
        const removed = await svc.toggleComplete(t.id, 'u1', '2026-06-04');
        expect(removed.completedDates).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test src/domain/TodoService/index.test.ts`
Expected: FAIL — `TodoService` not found.

- [ ] **Step 3: Write the implementation**

`packages/api/src/domain/TodoService/index.ts`:

```ts
import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Recurrence, Todo } from '@shoppingo/types';

import type { TodoRepository } from '../TodoRepository';

export interface CreateTodoInput {
    title: string;
    dueDate?: Date;
    time?: string;
    labelId?: string;
    recurrence?: Recurrence;
}

export type UpdateTodoInput = Partial<Omit<Todo, 'id' | 'ownerId' | 'dateAdded'>>;

const forbidden = () => Object.assign(new Error('Forbidden'), { status: 403 });
const notFound = () => Object.assign(new Error('Todo not found'), { status: 404 });

export class TodoService {
    constructor(
        private readonly repo: TodoRepository,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger
    ) {}

    private async getOwned(todoId: string, ownerId: string): Promise<Todo> {
        const todo = await this.repo.getById(todoId);
        if (!todo) throw notFound();
        if (todo.ownerId !== ownerId) throw forbidden();
        return todo;
    }

    async createTodo(ownerId: string, input: CreateTodoInput): Promise<Todo> {
        const todo: Todo = {
            id: this.idGenerator.generate(),
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

    async getTodosByOwner(ownerId: string): Promise<Todo[]> {
        return this.repo.findByOwnerId(ownerId);
    }

    async updateTodo(todoId: string, ownerId: string, input: UpdateTodoInput): Promise<Todo> {
        const existing = await this.getOwned(todoId, ownerId);
        const merged: Todo = { ...existing, ...input };
        return this.repo.update(todoId, merged);
    }

    async deleteTodo(todoId: string, ownerId: string): Promise<void> {
        await this.getOwned(todoId, ownerId);
        await this.repo.deleteById(todoId);
    }

    async toggleComplete(todoId: string, ownerId: string, date?: string): Promise<Todo> {
        const todo = await this.getOwned(todoId, ownerId);

        if (todo.recurrence && date) {
            const current = todo.completedDates ?? [];
            const completedDates = current.includes(date)
                ? current.filter((d) => d !== date)
                : [...current, date];
            return this.repo.update(todoId, { ...todo, completedDates });
        }

        return this.repo.update(todoId, { ...todo, done: !todo.done });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/api test src/domain/TodoService/index.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/TodoService/
git commit -m "feat(api): add TodoService with owner auth and complete-toggle"
```

---

## Task 5: TodoHandlers

**Files:**
- Create: `packages/api/src/interfaces/TodoHandlers/index.ts`

Handlers follow the `RecipeHandlers` pattern: resolve the service from the DI container, read the authenticated user from `ctx.state.user`, return 401 when absent, and map thrown `{ status }` errors onto the response.

- [ ] **Step 1: Write the handlers**

```ts
import type { Context } from 'koa';
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { CreateTodoInput, TodoService, UpdateTodoInput } from '../../domain/TodoService';

const getTodoService = (): TodoService => dependencyContainer.resolve(DependencyToken.TodoService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

const getUser = (ctx: Context): { id: string; username: string } | null => {
    const user = ctx.state.user as { id: string; username: string } | undefined;
    return user?.id ? user : null;
};

const fail = (ctx: Context, error: unknown) => {
    const err = error as { status?: number; message?: string };
    ctx.status = err.status ?? 500;
    ctx.body = { error: err.message ?? 'Internal Server Error' };
};

export const getTodos = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        ctx.status = 200;
        ctx.body = await getTodoService().getTodosByOwner(user.id);
    } catch (error) {
        getLogger().error('API: Failed to list todos', { userId: user.id });
        fail(ctx, error);
    }
};

export const createTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        const body = ctx.request.body as CreateTodoInput;
        ctx.status = 201;
        ctx.body = await getTodoService().createTodo(user.id, body);
    } catch (error) {
        fail(ctx, error);
    }
};

export const updateTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        const body = ctx.request.body as UpdateTodoInput;
        ctx.status = 200;
        ctx.body = await getTodoService().updateTodo(id, user.id, body);
    } catch (error) {
        fail(ctx, error);
    }
};

export const deleteTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        await getTodoService().deleteTodo(id, user.id);
        ctx.status = 204;
    } catch (error) {
        fail(ctx, error);
    }
};

export const completeTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        const { date } = (ctx.request.body ?? {}) as { date?: string };
        ctx.status = 200;
        ctx.body = await getTodoService().toggleComplete(id, user.id, date);
    } catch (error) {
        fail(ctx, error);
    }
};
```

- [ ] **Step 2: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS once `DependencyToken.TodoService` exists. If you run this before Task 9, add the token first (Task 9 Step 1).

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/interfaces/TodoHandlers/
git commit -m "feat(api): add TodoHandlers"
```

---

## Task 6: LabelRepository + MongoLabelRepository

**Files:**
- Create: `packages/api/src/domain/LabelRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoLabelRepository/index.ts`
- Test: `packages/api/src/infrastructure/MongoLabelRepository/index.test.ts`

- [ ] **Step 1: Write the interface**

`packages/api/src/domain/LabelRepository/index.ts`:

```ts
import type { Label } from '@shoppingo/types';

export interface LabelRepository {
    getById(labelId: string): Promise<Label | null>;
    findByOwnerId(ownerId: string): Promise<Label[]>;
    insert(label: Label): Promise<Label>;
    update(labelId: string, label: Label): Promise<Label>;
    deleteById(labelId: string): Promise<void>;
}
```

- [ ] **Step 2: Write the failing test**

`packages/api/src/infrastructure/MongoLabelRepository/index.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import type { Label } from '@shoppingo/types';
import { MongoLabelRepository } from './index';

const makeLabel = (over: Partial<Label> = {}): Label => ({
    id: 'L1',
    ownerId: 'u1',
    name: 'Work',
    color: '#3b82f6',
    ...over,
});

class FakeCollection {
    docs: Label[] = [];
    async findOne(q: { id: string }) {
        return this.docs.find((d) => d.id === q.id) ?? null;
    }
    find(q: { ownerId: string }) {
        const matched = this.docs.filter((d) => d.ownerId === q.ownerId);
        return { toArray: async () => matched };
    }
    async insertOne(doc: Label) {
        this.docs.push(doc);
    }
    async findOneAndReplace(q: { id: string }, doc: Label) {
        const i = this.docs.findIndex((d) => d.id === q.id);
        if (i >= 0) this.docs[i] = doc;
    }
    async deleteOne(q: { id: string }) {
        this.docs = this.docs.filter((d) => d.id !== q.id);
    }
}

const makeDb = (col: FakeCollection) => ({ getCollection: () => col }) as never;

describe('MongoLabelRepository', () => {
    let col: FakeCollection;
    let repo: MongoLabelRepository;

    beforeEach(() => {
        col = new FakeCollection();
        repo = new MongoLabelRepository(makeDb(col));
    });

    it('inserts and gets by id', async () => {
        await repo.insert(makeLabel());
        expect(await repo.getById('L1')).toMatchObject({ name: 'Work', color: '#3b82f6' });
    });

    it('finds by owner', async () => {
        await repo.insert(makeLabel({ id: 'L1', ownerId: 'u1' }));
        await repo.insert(makeLabel({ id: 'L2', ownerId: 'u2' }));
        expect((await repo.findByOwnerId('u1')).map((l) => l.id)).toEqual(['L1']);
    });

    it('updates and deletes', async () => {
        await repo.insert(makeLabel());
        await repo.update('L1', makeLabel({ name: 'Home', color: '#22c55e' }));
        expect((await repo.getById('L1'))?.name).toBe('Home');
        await repo.deleteById('L1');
        expect(await repo.getById('L1')).toBeNull();
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test src/infrastructure/MongoLabelRepository/index.test.ts`
Expected: FAIL — `MongoLabelRepository` not found.

- [ ] **Step 4: Write the implementation**

`packages/api/src/infrastructure/MongoLabelRepository/index.ts`:

```ts
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Label } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { LabelRepository } from '../../domain/LabelRepository';

export class MongoLabelRepository implements LabelRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.Label]: Label }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.Label);
    }

    async getById(labelId: string): Promise<Label | null> {
        return this.collection().findOne({ id: labelId });
    }

    async findByOwnerId(ownerId: string): Promise<Label[]> {
        return this.collection().find({ ownerId }).toArray();
    }

    async insert(label: Label): Promise<Label> {
        await this.collection().insertOne(label);
        return label;
    }

    async update(labelId: string, label: Label): Promise<Label> {
        await this.collection().findOneAndReplace({ id: labelId }, label);
        const updated = await this.getById(labelId);
        if (!updated) {
            throw new Error('Label not found');
        }
        return updated;
    }

    async deleteById(labelId: string): Promise<void> {
        await this.collection().deleteOne({ id: labelId });
    }
}
```

(`CollectionNames.Label` is added in Task 9; add it now if implementing out of order.)

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run --filter @shoppingo/api test src/infrastructure/MongoLabelRepository/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/LabelRepository/ packages/api/src/infrastructure/MongoLabelRepository/ packages/api/src/dependencies/types.ts
git commit -m "feat(api): add LabelRepository and MongoLabelRepository"
```

---

## Task 7: LabelService (with delete cascade)

**Files:**
- Create: `packages/api/src/domain/LabelService/index.ts`
- Test: `packages/api/src/domain/LabelService/index.test.ts`

Deleting a label must clear `labelId` on the owner's todos, so `LabelService` depends on `TodoRepository`.

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import type { Label } from '@shoppingo/types';
import { LabelService } from './index';

class MockLabelRepo {
    store = new Map<string, Label>();
    async insert(l: Label) { this.store.set(l.id, l); return l; }
    async getById(id: string) { return this.store.get(id) ?? null; }
    async findByOwnerId(ownerId: string) {
        return [...this.store.values()].filter((l) => l.ownerId === ownerId);
    }
    async update(id: string, l: Label) { this.store.set(id, l); return l; }
    async deleteById(id: string) { this.store.delete(id); }
}

class MockTodoRepo {
    cleared: Array<{ labelId: string; ownerId: string }> = [];
    async clearLabel(labelId: string, ownerId: string) { this.cleared.push({ labelId, ownerId }); }
}

class MockIds {
    private n = 0;
    generate() { this.n += 1; return `L-${this.n}`; }
}

describe('LabelService', () => {
    let labels: MockLabelRepo;
    let todos: MockTodoRepo;
    let svc: LabelService;

    beforeEach(() => {
        labels = new MockLabelRepo();
        todos = new MockTodoRepo();
        svc = new LabelService(labels as never, todos as never, new MockIds() as never);
    });

    it('creates a label for the owner', async () => {
        const l = await svc.createLabel('u1', { name: 'Work', color: '#3b82f6' });
        expect(l).toMatchObject({ id: 'L-1', ownerId: 'u1', name: 'Work', color: '#3b82f6' });
    });

    it('lists labels for the owner only', async () => {
        await svc.createLabel('u1', { name: 'A', color: '#111' });
        await svc.createLabel('u2', { name: 'B', color: '#222' });
        expect(await svc.getLabelsByOwner('u1')).toHaveLength(1);
    });

    it('renames/recolours an owned label', async () => {
        const l = await svc.createLabel('u1', { name: 'A', color: '#111' });
        const updated = await svc.updateLabel(l.id, 'u1', { name: 'Home', color: '#22c55e' });
        expect(updated).toMatchObject({ name: 'Home', color: '#22c55e' });
    });

    it('rejects update by non-owner with 403', async () => {
        const l = await svc.createLabel('u1', { name: 'A', color: '#111' });
        expect(svc.updateLabel(l.id, 'intruder', { name: 'x' })).rejects.toMatchObject({ status: 403 });
    });

    it('deletes an owned label and clears it from the owner\'s todos', async () => {
        const l = await svc.createLabel('u1', { name: 'A', color: '#111' });
        await svc.deleteLabel(l.id, 'u1');
        expect(await labels.getById(l.id)).toBeNull();
        expect(todos.cleared).toEqual([{ labelId: l.id, ownerId: 'u1' }]);
    });

    it('rejects delete by non-owner with 403 and does not clear todos', async () => {
        const l = await svc.createLabel('u1', { name: 'A', color: '#111' });
        expect(svc.deleteLabel(l.id, 'intruder')).rejects.toMatchObject({ status: 403 });
        expect(todos.cleared).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test src/domain/LabelService/index.test.ts`
Expected: FAIL — `LabelService` not found.

- [ ] **Step 3: Write the implementation**

`packages/api/src/domain/LabelService/index.ts`:

```ts
import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Label } from '@shoppingo/types';

import type { LabelRepository } from '../LabelRepository';
import type { TodoRepository } from '../TodoRepository';

export interface CreateLabelInput {
    name: string;
    color: string;
}

export type UpdateLabelInput = Partial<Pick<Label, 'name' | 'color'>>;

const forbidden = () => Object.assign(new Error('Forbidden'), { status: 403 });
const notFound = () => Object.assign(new Error('Label not found'), { status: 404 });

export class LabelService {
    constructor(
        private readonly labels: LabelRepository,
        private readonly todos: TodoRepository,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger
    ) {}

    private async getOwned(labelId: string, ownerId: string): Promise<Label> {
        const label = await this.labels.getById(labelId);
        if (!label) throw notFound();
        if (label.ownerId !== ownerId) throw forbidden();
        return label;
    }

    async createLabel(ownerId: string, input: CreateLabelInput): Promise<Label> {
        const label: Label = {
            id: this.idGenerator.generate(),
            ownerId,
            name: input.name,
            color: input.color,
        };
        await this.labels.insert(label);
        return label;
    }

    async getLabelsByOwner(ownerId: string): Promise<Label[]> {
        return this.labels.findByOwnerId(ownerId);
    }

    async updateLabel(labelId: string, ownerId: string, input: UpdateLabelInput): Promise<Label> {
        const existing = await this.getOwned(labelId, ownerId);
        return this.labels.update(labelId, { ...existing, ...input });
    }

    async deleteLabel(labelId: string, ownerId: string): Promise<void> {
        await this.getOwned(labelId, ownerId);
        await this.labels.deleteById(labelId);
        await this.todos.clearLabel(labelId, ownerId);
        this.logger?.info('Label deleted and cleared from todos', { labelId, ownerId });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/api test src/domain/LabelService/index.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/LabelService/
git commit -m "feat(api): add LabelService with delete cascade to todos"
```

---

## Task 8: LabelHandlers

**Files:**
- Create: `packages/api/src/interfaces/LabelHandlers/index.ts`

- [ ] **Step 1: Write the handlers**

```ts
import type { Context } from 'koa';
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { CreateLabelInput, LabelService, UpdateLabelInput } from '../../domain/LabelService';

const getLabelService = (): LabelService => dependencyContainer.resolve(DependencyToken.LabelService);

const getUser = (ctx: Context): { id: string; username: string } | null => {
    const user = ctx.state.user as { id: string; username: string } | undefined;
    return user?.id ? user : null;
};

const fail = (ctx: Context, error: unknown) => {
    const err = error as { status?: number; message?: string };
    ctx.status = err.status ?? 500;
    ctx.body = { error: err.message ?? 'Internal Server Error' };
};

export const getLabels = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        ctx.status = 200;
        ctx.body = await getLabelService().getLabelsByOwner(user.id);
    } catch (error) {
        fail(ctx, error);
    }
};

export const createLabel = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        ctx.status = 201;
        ctx.body = await getLabelService().createLabel(user.id, ctx.request.body as CreateLabelInput);
    } catch (error) {
        fail(ctx, error);
    }
};

export const updateLabel = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        ctx.status = 200;
        ctx.body = await getLabelService().updateLabel(id, user.id, ctx.request.body as UpdateLabelInput);
    } catch (error) {
        fail(ctx, error);
    }
};

export const deleteLabel = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        await getLabelService().deleteLabel(id, user.id);
        ctx.status = 204;
    } catch (error) {
        fail(ctx, error);
    }
};
```

- [ ] **Step 2: Type-check** — Run: `bun run tsc --noEmit` (after Task 9 adds `DependencyToken.LabelService`). Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/interfaces/LabelHandlers/
git commit -m "feat(api): add LabelHandlers"
```

---

## Task 9: DI wiring + collections + tokens

**Files:**
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`

- [ ] **Step 1: Add collections, tokens, and Dependencies entries to `types.ts`**

In `packages/api/src/dependencies/types.ts`:

Add imports near the other domain imports:

```ts
import type { Label, Todo } from '@shoppingo/types';
import type { LabelRepository } from '../domain/LabelRepository';
import type { LabelService } from '../domain/LabelService';
import type { TodoRepository } from '../domain/TodoRepository';
import type { TodoService } from '../domain/TodoService';
```

(Merge the `@shoppingo/types` import with the existing one — final import is
`import type { Label, List, Recipe, Todo } from '@shoppingo/types';`.)

Extend `Collections`:

```ts
export type Collections = {
    [CollectionNames.List]: List;
    [CollectionNames.Recipe]: Recipe;
    [CollectionNames.Todo]: Todo;
    [CollectionNames.Label]: Label;
};
```

Add to `DependencyToken` enum:

```ts
    TodoRepository = 'TodoRepository',
    TodoService = 'TodoService',
    LabelRepository = 'LabelRepository',
    LabelService = 'LabelService',
```

Add to `Dependencies` type:

```ts
    [DependencyToken.TodoRepository]: TodoRepository;
    [DependencyToken.TodoService]: TodoService;
    [DependencyToken.LabelRepository]: LabelRepository;
    [DependencyToken.LabelService]: LabelService;
```

Add to `CollectionNames` enum:

```ts
    Todo = 'todo',
    Label = 'label',
```

- [ ] **Step 2: Register the singletons in `index.ts`**

In `packages/api/src/dependencies/index.ts`, add imports:

```ts
import { LabelService } from '../domain/LabelService';
import { TodoService } from '../domain/TodoService';
import { MongoLabelRepository } from '../infrastructure/MongoLabelRepository';
import { MongoTodoRepository } from '../infrastructure/MongoTodoRepository';
```

Inside `registerDepdendencies()`, after the Recipe registrations, add:

```ts
    // Todo services
    dependencyContainer.registerSingleton(
        DependencyToken.TodoRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoTodoRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.TodoService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new TodoService(
                    dependencyContainer.resolve(DependencyToken.TodoRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    // Label services
    dependencyContainer.registerSingleton(
        DependencyToken.LabelRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoLabelRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.LabelService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new LabelService(
                    dependencyContainer.resolve(DependencyToken.LabelRepository),
                    dependencyContainer.resolve(DependencyToken.TodoRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );
```

- [ ] **Step 3: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS for the API package (Todo/Label files now resolve their tokens). Any remaining `ListType.TODO` references inside the API must be removed — search with `grep -rn "ListType.TODO" packages/api/src` and delete those branches (none expected in current API code).

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/dependencies/
git commit -m "feat(api): wire Todo and Label services into DI container"
```

---

## Task 10: Routes

**Files:**
- Modify: `packages/api/src/routes/index.ts`

- [ ] **Step 1: Add imports**

At the top of `packages/api/src/routes/index.ts`, alongside the other handler imports:

```ts
import * as labelHandlers from '../interfaces/LabelHandlers';
import * as todoHandlers from '../interfaces/TodoHandlers';
```

- [ ] **Step 2: Register routes**

Before `export default router;`, add:

```ts
// Todos
router.get('/api/todos', authenticate, todoHandlers.getTodos);
router.put('/api/todos', authenticate, todoHandlers.createTodo);
router.post('/api/todos/:id', authenticate, todoHandlers.updateTodo);
router.delete('/api/todos/:id', authenticate, todoHandlers.deleteTodo);
router.post('/api/todos/:id/complete', authenticate, todoHandlers.completeTodo);

// Labels
router.get('/api/labels', authenticate, labelHandlers.getLabels);
router.put('/api/labels', authenticate, labelHandlers.createLabel);
router.post('/api/labels/:id', authenticate, labelHandlers.updateLabel);
router.delete('/api/labels/:id', authenticate, labelHandlers.deleteLabel);
```

Note: `POST /api/todos/:id` and `POST /api/todos/:id/complete` do not conflict — `:id` matches a single path segment only, so `/api/todos/abc/complete` matches the `/complete` route, not the update route.

- [ ] **Step 3: Type-check + full test suite**

Run: `bun run tsc --noEmit`
Expected: PASS.

Run: `bun run --filter @shoppingo/api test`
Expected: PASS — all existing tests plus the new repository/service tests (24 new tests across Tasks 3, 4, 6, 7). Coverage stays ≥ 90%.

- [ ] **Step 4: Build**

Run: `bun run --filter @shoppingo/api build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/index.ts
git commit -m "feat(api): add todo and label routes"
```

---

## Phase 1 Done — Definition of Done

- `bun run --filter @shoppingo/api test` passes, coverage ≥ 90%.
- `bun run tsc --noEmit` passes.
- `bun run --filter @shoppingo/api build` succeeds.
- Endpoints live: `GET/PUT /api/todos`, `POST/DELETE /api/todos/:id`,
  `POST /api/todos/:id/complete`, `GET/PUT /api/labels`,
  `POST/DELETE /api/labels/:id`.

**Next:** Phase 2 (Web — calendar page, nav, recurrence expansion, inbox drag, label UI).
