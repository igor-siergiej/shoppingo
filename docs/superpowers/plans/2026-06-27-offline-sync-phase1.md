# Offline Sync — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users add / toggle / delete / rename / re-quantify shopping-list items while offline and have those edits persist across an app close and auto-sync to the API on reconnect.

**Architecture:** A persistent mutation **outbox** in IndexedDB records each item action as an *intent* and applies it optimistically. A FIFO **drainer** replays intents to the existing REST endpoints when online, using last-write-wins / drop-if-gone conflict handling. Item endpoints are refactored from name-addressed to **id-addressed** so replayed ops bind to a stable id; offline-added items get a **client-generated id** so they are immediately editable.

**Tech Stack:** React 19, react-query v3, `idb` (new), TypeScript, Vite PWA (workbox custom SW). API: Hono + MongoDB. Web tests: **vitest** + `@testing-library/react`. API tests: **bun:test**.

## Global Constraints

- Web unit tests import from `vitest` (`import { describe, it, expect, vi } from 'vitest'`) and use `@testing-library/react` (`renderHook`, `act`). **Never** import `bun:test` in `packages/web`.
- API unit tests import from `bun:test`.
- Package manager is **Bun**. Install deps with `bun add` from the relevant package dir.
- Run lint+typecheck before each commit: `bun run lint:fix` then `bun run tsc --noEmit` (from root).
- API test command: `bun run --filter @shoppingo/api test`. Web test command: `bun run --filter @shoppingo/web test`.
- Conventional Commits. End commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Conflict policy: replay `2xx` → remove; `404`/`409` → discard (drop-if-gone); other `4xx` → mark `failed` (poison); `5xx`/network/no-status → retry with backoff, stop drain.
- List query key is `[listTitle]`; its data shape is `{ listType, items, users, ownerId }`.

---

### Task 1: API — item endpoints id-addressed + client-id add

**Files:**
- Modify: `packages/api/src/routes/index.ts` (item update/delete routes)
- Modify: `packages/api/src/interfaces/ListHandlers/index.ts` (read `itemId` param; accept `id` on add)
- Modify: `packages/api/src/domain/ListService/index.ts` (match by `item.id`; client id on add)
- Test: `packages/api/src/domain/ListService/index.test.ts`, `packages/api/src/interfaces/ListHandlers/index.test.ts`

**Interfaces:**
- Produces (web depends on these in Task 2):
  - `POST /api/lists/:title/items/:itemId` — body `{ isSelected }` | `{ newItemName }` | `{ quantity?, unit? }`
  - `DELETE /api/lists/:title/items/:itemId`
  - `PUT /api/lists/:title/items` — body now also accepts optional `id: string`; response is the full `Item` (incl. `id`).
  - `ListService.setItemSelected(title, itemId, isSelected)`, `updateItemName(title, itemId, newItemName)`, `updateItemQuantity(title, itemId, quantity?, unit?)`, `deleteItem(title, itemId)`, `addItem(title, itemName, dateAdded, quantity?, unit?, actor?, id?)`.

- [ ] **Step 1: Write failing service tests (match-by-id + client id)**

In `packages/api/src/domain/ListService/index.test.ts`, add to the existing suite:

```ts
it('setItemSelected matches by item id, not name', async () => {
    const list: List = makeList({ items: [
        { id: 'a1', name: 'Milk', isSelected: false, dateAdded: new Date() },
        { id: 'a2', name: 'Milk', isSelected: false, dateAdded: new Date() },
    ] });
    repo.getByTitle.mockResolvedValue(list);
    await service.setItemSelected('Test List', 'a2', true);
    const saved = repo.replaceByTitle.mock.calls[0][1] as List;
    expect(saved.items.find((i) => i.id === 'a2')?.isSelected).toBe(true);
    expect(saved.items.find((i) => i.id === 'a1')?.isSelected).toBe(false);
});

it('deleteItem removes by id', async () => {
    const list: List = makeList({ items: [
        { id: 'a1', name: 'Milk', isSelected: false, dateAdded: new Date() },
        { id: 'a2', name: 'Bread', isSelected: false, dateAdded: new Date() },
    ] });
    repo.getByTitle.mockResolvedValue(list);
    await service.deleteItem('Test List', 'a1');
    const saved = repo.replaceByTitle.mock.calls[0][1] as List;
    expect(saved.items.map((i) => i.id)).toEqual(['a2']);
});

it('addItem uses caller-provided id when given', async () => {
    repo.getByTitle.mockResolvedValue(makeList({ items: [] }));
    const item = await service.addItem('Test List', 'Eggs', new Date(), undefined, undefined, undefined, 'client-uuid');
    expect(item.id).toBe('client-uuid');
});

it('addItem with an already-present id returns the existing item (idempotent replay)', async () => {
    const existing = { id: 'dup', name: 'Eggs', isSelected: false, dateAdded: new Date() };
    repo.getByTitle.mockResolvedValue(makeList({ items: [existing] }));
    const item = await service.addItem('Test List', 'Eggs', new Date(), undefined, undefined, undefined, 'dup');
    expect(item.id).toBe('dup');
    expect(repo.pushItem).not.toHaveBeenCalled();
});
```

> Use the file's existing `makeList`/mock helpers if present; otherwise mirror the construction already used by neighbouring tests in this file. Update any **existing** item tests that pass an item *name* as the lookup key to pass the item *id* instead.

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run --filter @shoppingo/api test`
Expected: FAIL — new tests fail (still matching by name; addItem ignores id).

- [ ] **Step 3: Implement id-matching + client id in `ListService`**

In `packages/api/src/domain/ListService/index.ts`, change the four item mutators to match by id. Replace each `item.name === itemName` predicate with `item.id === itemId`, and rename the parameter:

```ts
async setItemSelected(title: string, itemId: string, isSelected: boolean) {
    // ...unchanged getByTitle + 404...
    list.items = list.items.map((item) => (item.id === itemId ? { ...item, isSelected } : item));
    // ...unchanged replaceByTitle + logging (log itemId)...
}

async updateItemQuantity(title: string, itemId: string, quantity?: number, unit?: string) {
    // ...
    list.items = list.items.map((item) =>
        item.id === itemId
            ? { ...item, ...(quantity !== undefined && { quantity }), ...(unit !== undefined && { unit }) }
            : item
    );
    // ...
}

async deleteItem(title: string, itemId: string) {
    // ...getByTitle + 404...
    list.items = list.items.filter((item) => item.id !== itemId);
    await this.repo.replaceByTitle(title, list);
    return list;
}

async updateItemName(title: string, itemId: string, newItemName: string) {
    // ...empty/different validation against the CURRENT item's name...
    const list = await this.repo.getByTitle(title);
    if (!list) throw Object.assign(new Error('List not found'), { status: 404 });
    const target = list.items.find((item) => item.id === itemId);
    if (!target) throw Object.assign(new Error('Item not found'), { status: 404 });
    if (newItemName.trim() === target.name) {
        throw Object.assign(new Error('New item name must be different from current name'), { status: 400 });
    }
    const clash = list.items.find((i) => i.id !== itemId && i.name === newItemName.trim());
    if (clash) throw Object.assign(new Error('An item with that name already exists in this list'), { status: 409 });
    list.items = list.items.map((item) => (item.id === itemId ? { ...item, name: newItemName.trim() } : item));
    await this.repo.replaceByTitle(title, list);
    return { message: 'Item updated successfully', newItemName: newItemName.trim() };
}
```

For `addItem`, add a trailing `id?: string` param and make it idempotent by id:

```ts
async addItem(title: string, itemName: string, dateAdded: Date, quantity?: number, unit?: string, actor?: User, id?: string) {
    const list = await this.repo.getByTitle(title);
    if (!list) throw Object.assign(new Error('List not found'), { status: 404 });

    if (id) {
        const already = list.items.find((i) => i.id === id);
        if (already) return already; // idempotent replay
    }
    const existingItem = list.items.find((item) => item.name.toLowerCase() === itemName.toLowerCase());
    if (existingItem) throw Object.assign(new Error('An item with that name already exists in this list'), { status: 409 });

    const item: Item = {
        id: id ?? this.idGenerator.generate(),
        name: itemName,
        dateAdded,
        isSelected: false,
        ...(quantity !== undefined && { quantity }),
        ...(unit !== undefined && { unit }),
    };
    await this.repo.pushItem(title, item);
    if (actor) void this.notificationService?.notifyItemAdded(list, item, actor);
    return item;
}
```

- [ ] **Step 4: Update routes + handlers to read `itemId` / accept `id`**

In `packages/api/src/routes/index.ts`:

```ts
router.post('/api/lists/:title/items/:itemId', authenticate, updateItem);
router.delete('/api/lists/:title/items/:itemId', authenticate, deleteItem);
```

In `packages/api/src/interfaces/ListHandlers/index.ts`:
- In `updateItem` and `deleteItem` handlers, replace `const itemName = c.req.param('itemName');` with `const itemId = c.req.param('itemId');` and pass `itemId` to the `operation.execute` / `deleteItem` calls and the `OperationConfig.execute` signature (`execute: (service, title, itemId) => ...`).
- In the `addItem` handler, read `id` from the body and forward it:

```ts
const { itemName, dateAdded, quantity, unit, id } = await c.req.json<{
    itemName: string; dateAdded: Date; quantity?: number; unit?: string; id?: string;
}>();
// ...
const item = await getListService().addItem(title, itemName, dateAdded, quantity, unit, authenticatedUser, id);
```

Update the handler tests in `index.test.ts` that pass `params: { ..., itemName: ... }` to `params: { ..., itemId: ... }` with a matching id in the mocked list.

- [ ] **Step 5: Run tests, verify pass**

Run: `bun run --filter @shoppingo/api test`
Expected: PASS (all, incl. updated existing tests). Then `bun run tsc --noEmit` → no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/api
git commit -m "$(cat <<'EOF'
refactor(api): address list items by id and accept client id on add

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Web — item API client + mutation hooks use item id

**Files:**
- Modify: `packages/web/src/api/index.ts` (item fns take `itemId`; `addItem` sends `id`)
- Modify: `packages/web/src/hooks/useItemMutations.ts` (key by id; optimistic match by id)
- Modify: `packages/web/src/components/ItemCheckBox/index.tsx` (pass `item.id`)
- Test: `packages/web/src/hooks/useItemMutations.test.ts` (new)

**Interfaces:**
- Consumes: Task 1 endpoints.
- Produces (Task 8 wraps these):
  - `updateItem(itemId: string, isSelected: boolean, listTitle: string)`
  - `deleteItem(itemId: string, listTitle: string)`
  - `updateItemName(listTitle: string, itemId: string, newItemName: string)`
  - `updateItemQuantity(listTitle: string, itemId: string, quantity?: number, unit?: string)`
  - `addItem(itemName: string, listTitle: string, quantity?: number, unit?: string, id?: string)`
  - `useItemMutations(listTitle: string, itemId: string)` — optimistic reducers match `i.id === itemId`.

- [ ] **Step 1: Write failing hook test**

Create `packages/web/src/hooks/useItemMutations.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({
    updateItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    updateItemName: vi.fn().mockResolvedValue(undefined),
    updateItemQuantity: vi.fn().mockResolvedValue(undefined),
}));
import { deleteItem, updateItem } from '../api';
import { useItemMutations } from './useItemMutations';

const wrap = (client: QueryClient) =>
    ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

describe('useItemMutations (id-addressed)', () => {
    it('toggle optimistically updates the item matched by id and calls api with id', async () => {
        const client = new QueryClient();
        client.setQueryData(['My List'], {
            listType: 'shopping',
            items: [{ id: 'x1', name: 'Milk', isSelected: false }],
        });
        const { result } = renderHook(() => useItemMutations('My List', 'x1'), { wrapper: wrap(client) });
        act(() => { result.current.toggleMutation.mutate(true); });
        const data = client.getQueryData(['My List']) as { items: { id: string; isSelected: boolean }[] };
        expect(data.items[0].isSelected).toBe(true);
        await waitFor(() => expect(updateItem).toHaveBeenCalledWith('x1', true, 'My List'));
    });

    it('delete removes the item matched by id', async () => {
        const client = new QueryClient();
        client.setQueryData(['My List'], {
            listType: 'shopping',
            items: [{ id: 'x1', name: 'Milk' }, { id: 'x2', name: 'Bread' }],
        });
        const { result } = renderHook(() => useItemMutations('My List', 'x1'), { wrapper: wrap(client) });
        act(() => { result.current.deleteMutation.mutate(undefined); });
        const data = client.getQueryData(['My List']) as { items: { id: string }[] };
        expect(data.items.map((i) => i.id)).toEqual(['x2']);
        await waitFor(() => expect(deleteItem).toHaveBeenCalledWith('x1', 'My List'));
    });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `bun run --filter @shoppingo/web test useItemMutations`
Expected: FAIL — hook still keyed by name; api called with name.

- [ ] **Step 3: Update api client fns**

In `packages/web/src/api/index.ts`, change the four item fns to take `itemId` and address by it (replace `encodeURIComponent(itemName)` in the pathname with `encodeURIComponent(itemId)`), and add `id` to `addItem`:

```ts
export const addItem = async (itemName: string, listTitle: string, quantity?: number, unit?: string, id?: string) => {
    const dateAdded = generateTimestamp(new Date());
    const result = await makeRequest({
        pathname: `/api/lists/${encodeURIComponent(listTitle)}/items`,
        method: MethodType.PUT,
        operationString: 'add item',
        body: JSON.stringify({ itemName, dateAdded, ...(quantity !== undefined && { quantity }), ...(unit !== undefined && { unit }), ...(id !== undefined && { id }) }),
    });
    void fetch(`/api/image/${encodeURIComponent(itemName)}`, { method: 'GET' }).catch(() => {});
    return result;
};

export const updateItem = async (itemId: string, isSelected: boolean, listTitle: string) =>
    makeRequest({ pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`, method: MethodType.POST, operationString: 'update item', body: JSON.stringify({ isSelected }) });

export const deleteItem = async (itemId: string, listTitle: string) =>
    makeRequest({ pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`, method: MethodType.DELETE, operationString: 'delete item' });

export const updateItemName = async (listTitle: string, itemId: string, newItemName: string) =>
    makeRequest({ pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`, method: MethodType.POST, operationString: 'update item name', body: JSON.stringify({ newItemName }) });

export const updateItemQuantity = async (listTitle: string, itemId: string, quantity?: number, unit?: string) =>
    makeRequest({ pathname: `/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemId)}`, method: MethodType.POST, operationString: 'update item quantity', body: JSON.stringify({ ...(quantity !== undefined && { quantity }), ...(unit !== undefined && { unit }) }) });
```

> Preserve any `return await` / typing already present; keep the fire-and-forget image fetch in `addItem`.

- [ ] **Step 4: Update `useItemMutations` to key by id**

In `packages/web/src/hooks/useItemMutations.ts`: rename the second param `itemName` → `itemId`; change every optimistic predicate `i.name === itemName` → `i.id === itemId`; pass `itemId` to the api calls. For `updateNameMutation`, the optimistic reducer still sets `{ ...i, name: newName }` but matches `i.id === itemId`.

- [ ] **Step 5: Update the one caller**

In `packages/web/src/components/ItemCheckBox/index.tsx`, change `useItemMutations(listTitle, item.name)` → `useItemMutations(listTitle, item.id)`. Leave `useItemImage(item.name)` and display logic untouched (images stay name-keyed).

- [ ] **Step 6: Run tests + typecheck, verify pass**

Run: `bun run --filter @shoppingo/web test useItemMutations` → PASS.
Run: `bun run --filter @shoppingo/web test` → existing `ItemCheckBox` test still passes (it mocks the hook).
Run: `bun run tsc --noEmit` → no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/web
git commit -m "$(cat <<'EOF'
refactor(web): address list item mutations by id

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Outbox store (IndexedDB + in-memory mirror)

**Files:**
- Create: `packages/web/src/offline/outboxStore.ts`
- Test: `packages/web/src/offline/outboxStore.test.ts`
- Modify: `packages/web/package.json` (add `idb`)

**Interfaces:**
- Produces:
  ```ts
  export type ItemOp = 'item.add' | 'item.toggle' | 'item.delete' | 'item.rename' | 'item.quantity';
  export interface OutboxIntent {
      seq: number; id: string; entityType: 'item'; op: ItemOp;
      targetId: string; scope: string; payload: Record<string, unknown>; createdAt: number;
  }
  export const outboxStore: {
      hydrate(): Promise<void>;
      enqueue(intent: Omit<OutboxIntent, 'seq'>): Promise<OutboxIntent>;
      peekAll(): OutboxIntent[];          // sync, ordered by seq
      remove(seq: number): Promise<void>;
      count(): number;                    // sync
      subscribe(cb: () => void): () => void;
      _resetForTests(): Promise<void>;
  };
  ```

- [ ] **Step 1: Add `idb` dependency**

Run: `cd packages/web && bun add idb`
Expected: `idb` appears under `dependencies` in `packages/web/package.json`.

- [ ] **Step 2: Write failing store tests**

Create `packages/web/src/offline/outboxStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { outboxStore } from './outboxStore';

const intent = (over = {}) => ({
    id: crypto.randomUUID(), entityType: 'item' as const, op: 'item.toggle' as const,
    targetId: 'x1', scope: 'My List', payload: { isSelected: true }, createdAt: Date.now(), ...over,
});

describe('outboxStore', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });

    it('enqueue assigns increasing seq and persists', async () => {
        const a = await outboxStore.enqueue(intent());
        const b = await outboxStore.enqueue(intent());
        expect(b.seq).toBeGreaterThan(a.seq);
        expect(outboxStore.peekAll().map((i) => i.seq)).toEqual([a.seq, b.seq]);
        expect(outboxStore.count()).toBe(2);
    });

    it('remove deletes by seq', async () => {
        const a = await outboxStore.enqueue(intent());
        await outboxStore.enqueue(intent());
        await outboxStore.remove(a.seq);
        expect(outboxStore.peekAll().map((i) => i.targetId)).toHaveLength(1);
    });

    it('hydrate reloads the mirror from IndexedDB', async () => {
        await outboxStore.enqueue(intent());
        await outboxStore.hydrate();
        expect(outboxStore.count()).toBe(1);
    });

    it('subscribe fires on enqueue and remove', async () => {
        let calls = 0;
        const unsub = outboxStore.subscribe(() => { calls += 1; });
        const a = await outboxStore.enqueue(intent());
        await outboxStore.remove(a.seq);
        unsub();
        expect(calls).toBe(2);
    });
});
```

> IndexedDB in vitest: add `fake-indexeddb` if the runner lacks IDB. Run `cd packages/web && bun add -d fake-indexeddb`, then at the **top** of this test file add `import 'fake-indexeddb/auto';` before the store import.

- [ ] **Step 3: Run tests, verify fail**

Run: `bun run --filter @shoppingo/web test outboxStore`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the store**

Create `packages/web/src/offline/outboxStore.ts`:

```ts
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type ItemOp = 'item.add' | 'item.toggle' | 'item.delete' | 'item.rename' | 'item.quantity';

export interface OutboxIntent {
    seq: number;
    id: string;
    entityType: 'item';
    op: ItemOp;
    targetId: string;
    scope: string;
    payload: Record<string, unknown>;
    createdAt: number;
}

interface OutboxDB extends DBSchema {
    intents: { key: number; value: OutboxIntent };
}

const DB_NAME = 'shoppingo-outbox';
const STORE = 'intents';

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;
const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<OutboxDB>(DB_NAME, 1, {
            upgrade(db) { db.createObjectStore(STORE, { keyPath: 'seq', autoIncrement: true }); },
        });
    }
    return dbPromise;
};

let mirror: OutboxIntent[] = [];
const listeners = new Set<() => void>();
const notify = () => { for (const cb of listeners) cb(); };
const sortBySeq = (a: OutboxIntent, b: OutboxIntent) => a.seq - b.seq;

export const outboxStore = {
    async hydrate() {
        const db = await getDB();
        mirror = (await db.getAll(STORE)).sort(sortBySeq);
        notify();
    },
    async enqueue(intent: Omit<OutboxIntent, 'seq'>) {
        const db = await getDB();
        const seq = (await db.add(STORE, intent as OutboxIntent)) as number;
        const stored: OutboxIntent = { ...(intent as OutboxIntent), seq };
        mirror = [...mirror, stored].sort(sortBySeq);
        notify();
        return stored;
    },
    peekAll() { return mirror; },
    async remove(seq: number) {
        const db = await getDB();
        await db.delete(STORE, seq);
        mirror = mirror.filter((i) => i.seq !== seq);
        notify();
    },
    count() { return mirror.length; },
    subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); },
    async _resetForTests() {
        const db = await getDB();
        await db.clear(STORE);
        mirror = [];
        notify();
    },
};
```

- [ ] **Step 5: Run tests + typecheck, verify pass**

Run: `bun run --filter @shoppingo/web test outboxStore` → PASS.
Run: `bun run tsc --noEmit` → no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/web
git commit -m "$(cat <<'EOF'
feat(web): add IndexedDB outbox store for offline sync

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Intent layer (build + reducers + replay)

**Files:**
- Create: `packages/web/src/offline/intents.ts`
- Test: `packages/web/src/offline/intents.test.ts`

**Interfaces:**
- Consumes: `OutboxIntent`, `ItemOp` (Task 3); api fns (Task 2).
- Produces:
  ```ts
  interface ItemView { id: string; name: string; isSelected: boolean; quantity?: number; unit?: string; dateAdded?: string | Date; }
  // pure reducer used by optimistic updates AND cold-start fold
  export const applyItemIntent(items: ItemView[], intent: OutboxIntent): ItemView[];
  // turn a dequeued intent into the matching api call (throws on non-2xx)
  export const replayIntent(intent: OutboxIntent): Promise<void>;
  ```

- [ ] **Step 1: Write failing reducer tests**

Create `packages/web/src/offline/intents.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyItemIntent } from './intents';
import type { OutboxIntent } from './outboxStore';

const base = (op: OutboxIntent['op'], targetId: string, payload = {}): OutboxIntent =>
    ({ seq: 1, id: 'i', entityType: 'item', op, targetId, scope: 'L', payload, createdAt: 0 });

const items = [{ id: 'a', name: 'Milk', isSelected: false }];

describe('applyItemIntent', () => {
    it('toggle sets isSelected by id', () => {
        expect(applyItemIntent(items, base('item.toggle', 'a', { isSelected: true }))[0].isSelected).toBe(true);
    });
    it('delete removes by id', () => {
        expect(applyItemIntent(items, base('item.delete', 'a'))).toHaveLength(0);
    });
    it('rename changes name by id', () => {
        expect(applyItemIntent(items, base('item.rename', 'a', { newItemName: 'Oat Milk' }))[0].name).toBe('Oat Milk');
    });
    it('quantity merges fields by id', () => {
        const r = applyItemIntent(items, base('item.quantity', 'a', { quantity: 2, unit: 'L' }))[0];
        expect(r.quantity).toBe(2); expect(r.unit).toBe('L');
    });
    it('add appends a new item when absent', () => {
        const r = applyItemIntent(items, base('item.add', 'b', { name: 'Bread' }));
        expect(r.map((i) => i.id)).toEqual(['a', 'b']);
    });
    it('add is idempotent when id already present', () => {
        const r = applyItemIntent(items, base('item.add', 'a', { name: 'Milk' }));
        expect(r).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test intents`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement intents**

Create `packages/web/src/offline/intents.ts`:

```ts
import { addItem, deleteItem, updateItem, updateItemName, updateItemQuantity } from '../api';
import type { OutboxIntent } from './outboxStore';

export interface ItemView {
    id: string; name: string; isSelected: boolean;
    quantity?: number; unit?: string; dateAdded?: string | Date;
}

export const applyItemIntent = (items: ItemView[], intent: OutboxIntent): ItemView[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'item.add': {
            if (items.some((i) => i.id === intent.targetId)) return items;
            return [...items, {
                id: intent.targetId, name: String(p.name ?? ''), isSelected: false,
                ...(p.quantity !== undefined && { quantity: Number(p.quantity) }),
                ...(p.unit !== undefined && { unit: String(p.unit) }),
            }];
        }
        case 'item.delete':
            return items.filter((i) => i.id !== intent.targetId);
        case 'item.toggle':
            return items.map((i) => (i.id === intent.targetId ? { ...i, isSelected: Boolean(p.isSelected) } : i));
        case 'item.rename':
            return items.map((i) => (i.id === intent.targetId ? { ...i, name: String(p.newItemName) } : i));
        case 'item.quantity':
            return items.map((i) => (i.id === intent.targetId ? {
                ...i,
                ...(p.quantity !== undefined && { quantity: Number(p.quantity) }),
                ...(p.unit !== undefined && { unit: String(p.unit) }),
            } : i));
        default:
            return items;
    }
};

export const replayIntent = async (intent: OutboxIntent): Promise<void> => {
    const p = intent.payload;
    switch (intent.op) {
        case 'item.add':
            await addItem(String(p.name), intent.scope, p.quantity as number | undefined, p.unit as string | undefined, intent.targetId);
            return;
        case 'item.delete':
            await deleteItem(intent.targetId, intent.scope);
            return;
        case 'item.toggle':
            await updateItem(intent.targetId, Boolean(p.isSelected), intent.scope);
            return;
        case 'item.rename':
            await updateItemName(intent.scope, intent.targetId, String(p.newItemName));
            return;
        case 'item.quantity':
            await updateItemQuantity(intent.scope, intent.targetId, p.quantity as number | undefined, p.unit as string | undefined);
            return;
    }
};
```

- [ ] **Step 4: Run + typecheck, verify pass**

Run: `bun run --filter @shoppingo/web test intents` → PASS. `bun run tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add packages/web
git commit -m "$(cat <<'EOF'
feat(web): add item intent reducers and replay mapping

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: makeRequest status + drainer

**Files:**
- Modify: `packages/web/src/api/makeRequest/index.ts` (attach `status` to thrown error)
- Create: `packages/web/src/offline/drainer.ts`
- Test: `packages/web/src/offline/drainer.test.ts`

**Interfaces:**
- Consumes: `outboxStore` (Task 3), `replayIntent` (Task 4).
- Produces:
  ```ts
  export const drainOutbox(): Promise<void>;   // single-flight FIFO drain
  export const startDrainer(): () => void;      // wires online/visibility triggers, returns cleanup
  ```

- [ ] **Step 1: Attach status in makeRequest**

In `packages/web/src/api/makeRequest/index.ts`, replace the error throw after a non-ok response:

```ts
const errorMessage = await parseErrorMessage(response);
logger.warn(`Request failed for ${operationString}`, { status: response.status, statusText: response.statusText });
throw Object.assign(new Error(errorMessage), { status: response.status });
```

Leave the outer catch/rethrow intact (it rethrows the same `Error`, preserving the attached `status`).

- [ ] **Step 2: Write failing drainer tests**

Create `packages/web/src/offline/drainer.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replayIntent = vi.fn();
vi.mock('./intents', () => ({ replayIntent }));

import { drainOutbox } from './drainer';
import { outboxStore } from './outboxStore';

const enq = (over = {}) => outboxStore.enqueue({
    id: crypto.randomUUID(), entityType: 'item', op: 'item.toggle',
    targetId: 'x', scope: 'L', payload: { isSelected: true }, createdAt: 0, ...over,
});

describe('drainOutbox', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); replayIntent.mockReset(); });

    it('replays in order and clears the queue on success', async () => {
        await enq({ targetId: 'a' }); await enq({ targetId: 'b' });
        replayIntent.mockResolvedValue(undefined);
        await drainOutbox();
        expect(replayIntent.mock.calls.map((c) => c[0].targetId)).toEqual(['a', 'b']);
        expect(outboxStore.count()).toBe(0);
    });

    it('discards an intent that fails with 404', async () => {
        await enq();
        replayIntent.mockRejectedValue(Object.assign(new Error('gone'), { status: 404 }));
        await drainOutbox();
        expect(outboxStore.count()).toBe(0);
    });

    it('discards on 409 conflict', async () => {
        await enq();
        replayIntent.mockRejectedValue(Object.assign(new Error('conflict'), { status: 409 }));
        await drainOutbox();
        expect(outboxStore.count()).toBe(0);
    });

    it('stops and keeps the queue on a 5xx error (preserves order)', async () => {
        await enq({ targetId: 'a' }); await enq({ targetId: 'b' });
        replayIntent.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }));
        await drainOutbox();
        expect(outboxStore.count()).toBe(2); // head failed, nothing removed
    });

    it('stops on a network error with no status', async () => {
        await enq();
        replayIntent.mockRejectedValue(new TypeError('Failed to fetch'));
        await drainOutbox();
        expect(outboxStore.count()).toBe(1);
    });
});
```

- [ ] **Step 3: Run, verify fail**

Run: `bun run --filter @shoppingo/web test drainer`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the drainer**

Create `packages/web/src/offline/drainer.ts`:

```ts
import { logger } from '../utils/logger';
import { replayIntent } from './intents';
import { outboxStore } from './outboxStore';

const DISCARD_STATUSES = new Set([404, 409]);
let draining = false;

const statusOf = (err: unknown): number | undefined =>
    (typeof err === 'object' && err !== null && 'status' in err) ? (err as { status?: number }).status : undefined;

export const drainOutbox = async (): Promise<void> => {
    if (draining) return;
    draining = true;
    try {
        for (const intent of outboxStore.peekAll()) {
            try {
                await replayIntent(intent);
                await outboxStore.remove(intent.seq);
            } catch (err) {
                const status = statusOf(err);
                if (status !== undefined && DISCARD_STATUSES.has(status)) {
                    logger.warn('Discarding conflicting offline intent', { op: intent.op, status });
                    await outboxStore.remove(intent.seq);
                    continue;
                }
                if (status !== undefined && status >= 400 && status < 500) {
                    logger.error('Poison offline intent, stopping drain', { op: intent.op, status });
                    return; // leave at head; Phase-1: surfaced via pending count, no infinite retry within this pass
                }
                logger.info('Drain paused (retryable error)', { op: intent.op, status });
                return; // 5xx / network — stop, preserve order, resume on next trigger
            }
        }
    } finally {
        draining = false;
    }
};

let backoff = 0;
export const startDrainer = (): (() => void) => {
    const trigger = () => {
        if (!navigator.onLine) return;
        const before = outboxStore.count();
        void drainOutbox().then(() => {
            if (outboxStore.count() > 0 && outboxStore.count() === before) {
                backoff = Math.min(backoff ? backoff * 2 : 1000, 30000);
                setTimeout(trigger, backoff);
            } else {
                backoff = 0;
            }
        });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') trigger(); };
    window.addEventListener('online', trigger);
    document.addEventListener('visibilitychange', onVisible);
    trigger();
    return () => {
        window.removeEventListener('online', trigger);
        document.removeEventListener('visibilitychange', onVisible);
    };
};
```

- [ ] **Step 5: Run + typecheck, verify pass**

Run: `bun run --filter @shoppingo/web test drainer` → PASS. `bun run tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add packages/web
git commit -m "$(cat <<'EOF'
feat(web): add outbox drainer with LWW drop-if-gone replay

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: useOnlineStatus hook

**Files:**
- Create: `packages/web/src/hooks/useOnlineStatus.ts`
- Test: `packages/web/src/hooks/useOnlineStatus.test.ts`

**Interfaces:**
- Produces: `export const useOnlineStatus(): boolean;`

- [ ] **Step 1: Write failing test**

Create `packages/web/src/hooks/useOnlineStatus.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOnlineStatus } from './useOnlineStatus';

afterEach(() => vi.restoreAllMocks());

describe('useOnlineStatus', () => {
    it('reflects navigator.onLine and updates on events', () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
        const { result } = renderHook(() => useOnlineStatus());
        expect(result.current).toBe(true);
        act(() => { window.dispatchEvent(new Event('offline')); });
        expect(result.current).toBe(false);
        act(() => { window.dispatchEvent(new Event('online')); });
        expect(result.current).toBe(true);
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test useOnlineStatus`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/web/src/hooks/useOnlineStatus.ts`:

```ts
import { useEffect, useState } from 'react';

export const useOnlineStatus = (): boolean => {
    const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
    }, []);
    return online;
};
```

- [ ] **Step 4: Run + typecheck, verify pass**

Run: `bun run --filter @shoppingo/web test useOnlineStatus` → PASS. `bun run tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add packages/web
git commit -m "$(cat <<'EOF'
feat(web): add useOnlineStatus hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Pending badge + outbox count hook

**Files:**
- Create: `packages/web/src/hooks/useOutboxCount.ts`
- Create: `packages/web/src/components/SyncStatusBadge/index.tsx`
- Test: `packages/web/src/components/SyncStatusBadge/index.test.tsx`

**Interfaces:**
- Consumes: `outboxStore.subscribe/count` (Task 3), `useOnlineStatus` (Task 6).
- Produces: `useOutboxCount(): number`; `<SyncStatusBadge />` rendering nothing when count is 0, else "N pending".

- [ ] **Step 1: Write failing component test**

Create `packages/web/src/components/SyncStatusBadge/index.test.tsx`:

```ts
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const count = { value: 0 };
vi.mock('../../hooks/useOutboxCount', () => ({ useOutboxCount: () => count.value }));
import { SyncStatusBadge } from './index';

describe('SyncStatusBadge', () => {
    it('renders nothing when no pending changes', () => {
        count.value = 0;
        const { container } = render(<SyncStatusBadge />);
        expect(container).toBeEmptyDOMElement();
    });
    it('shows the pending count', () => {
        count.value = 3;
        render(<SyncStatusBadge />);
        expect(screen.getByText(/3 pending/i)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test SyncStatusBadge`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the count hook**

Create `packages/web/src/hooks/useOutboxCount.ts`:

```ts
import { useSyncExternalStore } from 'react';
import { outboxStore } from '../offline/outboxStore';

export const useOutboxCount = (): number =>
    useSyncExternalStore(
        (cb) => outboxStore.subscribe(cb),
        () => outboxStore.count(),
        () => 0
    );
```

- [ ] **Step 4: Implement the badge**

Create `packages/web/src/components/SyncStatusBadge/index.tsx`:

```tsx
import { useOutboxCount } from '../../hooks/useOutboxCount';

export const SyncStatusBadge = () => {
    const pending = useOutboxCount();
    if (pending === 0) return null;
    return (
        <span
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            title="Changes waiting to sync"
            aria-live="polite"
        >
            {pending} pending
        </span>
    );
};
```

- [ ] **Step 5: Run + typecheck, verify pass**

Run: `bun run --filter @shoppingo/web test SyncStatusBadge` → PASS. `bun run tsc --noEmit` → clean.

> Mounting the badge in the app shell (e.g. `RootLayout`) is done in Task 8 alongside engine startup, so the two visible pieces land together.

- [ ] **Step 6: Commit**

```bash
git add packages/web
git commit -m "$(cat <<'EOF'
feat(web): add sync-pending badge and outbox count hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Wire item mutations through the outbox + cold-start fold + startup

**Files:**
- Modify: `packages/web/src/hooks/useItemMutations.ts` (enqueue + drain instead of direct api calls)
- Modify: `packages/web/src/api/index.ts` (`getListQuery` folds pending in `queryFn`)
- Modify: `packages/web/src/components/AppInitializer/index.tsx` (hydrate store + start drainer)
- Modify: `packages/web/src/components/RootLayout/*` (mount `<SyncStatusBadge />`)
- Test: `packages/web/src/hooks/useItemMutations.test.ts` (extend), `packages/web/src/api/foldPending.test.ts` (new helper)
- Create: `packages/web/src/offline/foldPending.ts`

**Interfaces:**
- Consumes: `outboxStore`, `applyItemIntent`, `drainOutbox`, `startDrainer`, `useOutboxCount`.
- Produces: `foldPendingItems(listTitle: string, data: ListItemsData): ListItemsData` where `ListItemsData = { listType: ListType; items: Item[]; users: ...; ownerId?: string }`.

- [ ] **Step 1: Write failing fold test**

Create `packages/web/src/offline/foldPending.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { foldPendingItems } from './foldPending';
import { outboxStore } from './outboxStore';

describe('foldPendingItems', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });

    it('applies pending intents for the given list over server data', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'item', op: 'item.toggle', targetId: 'a', scope: 'L', payload: { isSelected: true }, createdAt: 0 });
        await outboxStore.enqueue({ id: '2', entityType: 'item', op: 'item.add', targetId: 'b', scope: 'L', payload: { name: 'Bread' }, createdAt: 0 });
        const server = { listType: 'shopping', items: [{ id: 'a', name: 'Milk', isSelected: false }], users: [] };
        const folded = foldPendingItems('L', server as never);
        expect(folded.items.find((i) => i.id === 'a')?.isSelected).toBe(true);
        expect(folded.items.map((i) => i.id)).toEqual(['a', 'b']);
    });

    it('ignores intents scoped to other lists', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'item', op: 'item.delete', targetId: 'a', scope: 'OTHER', payload: {}, createdAt: 0 });
        const server = { listType: 'shopping', items: [{ id: 'a', name: 'Milk', isSelected: false }], users: [] };
        expect(foldPendingItems('L', server as never).items).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test foldPending`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the fold helper**

Create `packages/web/src/offline/foldPending.ts`:

```ts
import type { Item, ListType, User } from '@shoppingo/types';
import { applyItemIntent, type ItemView } from './intents';
import { outboxStore } from './outboxStore';

export interface ListItemsData {
    listType: ListType;
    items: Item[];
    users: Array<{ id: string; username: string }> | User[];
    ownerId?: string;
}

export const foldPendingItems = (listTitle: string, data: ListItemsData): ListItemsData => {
    const pending = outboxStore.peekAll().filter((i) => i.entityType === 'item' && i.scope === listTitle);
    if (pending.length === 0) return data;
    const items = pending.reduce<ItemView[]>(
        (acc, intent) => applyItemIntent(acc, intent),
        data.items as unknown as ItemView[]
    );
    return { ...data, items: items as unknown as Item[] };
};
```

- [ ] **Step 4: Fold inside the list queryFn**

In `packages/web/src/api/index.ts`, wrap the result of `getListQuery`'s `queryFn` with the fold:

```ts
import { foldPendingItems } from '../offline/foldPending';

export const getListQuery = (listTitle: string) => ({
    queryKey: [listTitle],
    queryFn: async () => foldPendingItems(listTitle, await getList(listTitle)),
});
```

> Each fetch/refetch starts from fresh server data, so the fold is applied exactly once per fetch — synced intents have already been removed from the queue, so they are never double-applied.

- [ ] **Step 5: Run fold test + typecheck, verify pass**

Run: `bun run --filter @shoppingo/web test foldPending` → PASS. `bun run tsc --noEmit` → clean.

- [ ] **Step 6: Write failing offline-mutation test**

Extend `packages/web/src/hooks/useItemMutations.test.ts`:

```ts
it('toggle enqueues an outbox intent and triggers a drain', async () => {
    const client = new QueryClient();
    client.setQueryData(['My List'], { listType: 'shopping', items: [{ id: 'x1', name: 'Milk', isSelected: false }] });
    const { result } = renderHook(() => useItemMutations('My List', 'x1'), { wrapper: wrap(client) });
    act(() => { result.current.toggleMutation.mutate(true); });
    await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
    const intent = outboxStore.peekAll()[0];
    expect(intent.op).toBe('item.toggle');
    expect(intent.targetId).toBe('x1');
    expect(intent.payload).toEqual({ isSelected: true });
});
```

Add at the top of the file: `import 'fake-indexeddb/auto';`, `import { outboxStore } from '../offline/outboxStore';`, a `beforeEach(async () => { await outboxStore._resetForTests(); })`, and mock the drainer: `vi.mock('../offline/drainer', () => ({ drainOutbox: vi.fn().mockResolvedValue(undefined) }));`. Keep the existing `vi.mock('../api', ...)` so no real network occurs.

- [ ] **Step 7: Run, verify the new test fails**

Run: `bun run --filter @shoppingo/web test useItemMutations`
Expected: FAIL — nothing is enqueued yet.

- [ ] **Step 8: Route mutations through the outbox**

In `packages/web/src/hooks/useItemMutations.ts`, change `createOptimisticMutation` so the `mutationFn` enqueues an intent and kicks a drain, instead of calling the api directly. Keep the existing optimistic `onMutate`/`onError`/`onSettled` block unchanged. Replace each `mutationFn` with an `enqueue` call:

```ts
import { outboxStore } from '../offline/outboxStore';
import { drainOutbox } from '../offline/drainer';
import type { ItemOp } from '../offline/outboxStore';

const enqueueItem = async (op: ItemOp, listTitle: string, targetId: string, payload: Record<string, unknown>) => {
    await outboxStore.enqueue({ id: crypto.randomUUID(), entityType: 'item', op, targetId, scope: listTitle, payload, createdAt: Date.now() });
    void drainOutbox();
};
```

Then in `useItemMutations`, swap the four `mutationFn`s:
- toggle: `(isSelected: boolean) => enqueueItem('item.toggle', listTitle, itemId, { isSelected })`
- delete: `() => enqueueItem('item.delete', listTitle, itemId, {})`
- rename: `(newName: string) => enqueueItem('item.rename', listTitle, itemId, { newItemName: newName })`
- quantity: `({ quantity, unit }) => enqueueItem('item.quantity', listTitle, itemId, { ...(quantity !== undefined && { quantity }), ...(unit !== undefined && { unit }) })`

> `onSettled`'s `invalidateQueries([listTitle])` stays: while offline the refetch resolves from the SW cache and re-folds pending (consistent); when online the post-drain refetch reconciles to canonical state.

For **add**, update the add path (in `useItemPageMutations.ts` if that is where add lives — grep `addItem(`): generate the id client-side and enqueue `item.add` with `{ name, quantity?, unit? }` and `targetId` = the new uuid, applying the same optimistic append. (If add currently calls `addItem` directly, mirror the enqueue pattern with `op: 'item.add'`.)

- [ ] **Step 9: Run, verify pass**

Run: `bun run --filter @shoppingo/web test useItemMutations` → PASS (optimistic + enqueue tests).

- [ ] **Step 10: Hydrate store + start drainer at app init; mount badge**

In `packages/web/src/components/AppInitializer/index.tsx`, inside a `useEffect` that runs once, hydrate then start the drainer:

```ts
import { outboxStore } from '../../offline/outboxStore';
import { startDrainer } from '../../offline/drainer';

useEffect(() => {
    let stop = () => {};
    void outboxStore.hydrate().then(() => { stop = startDrainer(); });
    return () => stop();
}, []);
```

In `packages/web/src/components/RootLayout` (the header/app-shell area), render `<SyncStatusBadge />` near the existing header controls (match sibling element placement/styling).

- [ ] **Step 11: Full verification**

Run, expecting all green:
```bash
bun run lint:fix
bun run tsc --noEmit
bun run --filter @shoppingo/web test
bun run --filter @shoppingo/api test
bun run --filter @shoppingo/web build
bun run --filter @shoppingo/api build
```

- [ ] **Step 12: Manual smoke test (DevTools)**

1. `bun run start`. Open a list. DevTools → Network → set **Offline**.
2. Toggle items, add an item, rename one, change a quantity. Confirm UI updates and the "N pending" badge appears.
3. Reload the tab while still offline. Confirm your edits are still shown (cold-start fold) and the badge persists.
4. Set Network back to **Online**. Within a moment the badge clears; refresh and confirm the server state matches your offline edits.
5. Verify in `Application → IndexedDB → shoppingo-outbox` that `intents` empties after sync.

- [ ] **Step 13: Commit**

```bash
git add packages/web
git commit -m "$(cat <<'EOF'
feat(web): sync offline item edits via outbox queue

Route item mutations through the IndexedDB outbox, fold pending
intents over cached list data on cold start, and drain to the API
on reconnect. Mounts the sync-pending badge and starts the drainer
at app init.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Outbox store (IndexedDB) → Task 3. ✔
- Intent layer (build + replay) → Task 4. ✔
- Sync drainer (triggers, FIFO, 404 discard, backoff, single-flight, invalidate) → Task 5. ✔
- Local state derivation / cold-start fold → Task 8 (`foldPending` + queryFn). ✔
- id-addressing refactor (API + web) → Tasks 1–2. ✔
- useOnlineStatus + pending badge → Tasks 6–7, mounted in Task 8. ✔
- Conflict policy LWW drop-if-gone + refetch → Task 5 (discard 404/409) + `onSettled` invalidate. ✔
- Durability across force-close → Task 3 (IDB) + Task 8 (hydrate at init, fold on load). ✔
- Phase-1 item add/toggle/delete/rename/quantity → Tasks 2, 4, 8. ✔
- Refinement vs spec: item-add uses a **client-generated id** (Task 1 accepts `id`), removing temp-id reconciliation from Phase 1; spec's temp-id work (Phase 2) now applies only to offline **list** creation.

**Placeholder scan:** No TBD/TODO; every code step shows real code. Step 8's `add` path says "grep `addItem(`" because the exact file (`useItemPageMutations.ts` vs hook) must be confirmed at implementation time — the enqueue pattern and op name are fully specified.

**Type consistency:** `OutboxIntent`/`ItemOp` defined in Task 3 and reused verbatim in Tasks 4, 5, 8. `applyItemIntent`/`replayIntent` signatures from Task 4 used unchanged in Tasks 5/8. `foldPendingItems(listTitle, data)` defined and consumed in Task 8. api fn signatures from Task 2 match `replayIntent`'s calls. `outboxStore` method names (`hydrate/enqueue/peekAll/remove/count/subscribe/_resetForTests`) consistent across Tasks 3–8.
