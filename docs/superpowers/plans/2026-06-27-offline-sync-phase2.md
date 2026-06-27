# Offline Sync — Phase 2 Implementation Plan (Offline List Creation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create a new shopping list while offline, add items to it offline, and have the list (then its items) sync to the API on reconnect.

**Architecture:** Reuses the Phase 1 outbox engine. A new `list.create` intent type is queued when a list is created; the lists query folds pending creations over server data on cold start; the drainer replays `list.create` (then the list's `item.add`s, in FIFO order) when online. Lists are **title-addressed**, so no temp-id reconciliation is needed — the offline-chosen title is the stable key that the list's item ops already scope to.

**Tech Stack:** React 19, react-query v3, `idb`, TypeScript. API: Hono + MongoDB. Web tests: **vitest** + `@testing-library/react`. API tests: **bun:test**.

## Context: what Phase 1 already built (on branch `feat/offline-sync-phase1`)

- `packages/web/src/offline/outboxStore.ts` — IndexedDB outbox + in-memory mirror. Types `OutboxIntent` (`entityType: 'item'`, `op: ItemOp`, `targetId`, `scope`, `payload`, `seq`, `id`, `createdAt`) and `ItemOp`. API: `hydrate`, `enqueue`, `peekAll`, `remove`, `count`, `subscribe`, `_resetForTests`.
- `packages/web/src/offline/intents.ts` — pure reducer `applyItemIntent(items, intent)` + `ItemView`.
- `packages/web/src/offline/replay.ts` — `replayIntent(intent)` (maps an intent → api call). **Note:** Phase 1 split `replayIntent` out of `intents.ts` into `replay.ts` to break an import cycle (`api → foldPending → intents → api`). Keep that separation: anything importing `../api` lives in `replay.ts`, never in `intents.ts`.
- `packages/web/src/offline/drainer.ts` — `drainOutbox()`, `startDrainer()`. FIFO, single-flight, LWW: 2xx→remove, 404/409→discard, other-4xx/5xx/network→stop+backoff.
- `packages/web/src/offline/foldPending.ts` — `foldPendingItems(listTitle, data)` folds item intents over a single list's data; wired into `getListQuery`'s `queryFn`.
- `packages/web/src/hooks/useItemMutations.ts` / `useItemPageMutations.ts` — item mutations enqueue intents. Item-add mints a `crypto.randomUUID()` client id (`item.add`, `targetId` = that id) and the API accepts it.
- `getListsQuery(userId)` → `{ queryKey: ['lists', userId], queryFn }` returning `ListResponse[]`.
- `getListQuery(listTitle)` → `{ queryKey: [listTitle], queryFn }` returning `{ listType, items, users, ownerId }`.

## Global Constraints

- Web tests import from `vitest` (`import { describe, it, expect, vi } from 'vitest'`); IndexedDB-touching tests import `fake-indexeddb/auto` at the top. **Never** `bun:test` in `packages/web`.
- API tests import from `bun:test`.
- Package manager is **Bun**. Run lint+typecheck before each commit: `bun run lint:fix` then `bun run tsc --noEmit` (root).
- The CI merge gate is `bunx fallow@2.100.0 dead-code` — must stay green (no unused exports/files/deps; if a dep is test-only, add it to `.fallowrc.json` `ignoreDependencies`). Pre-push complexity warnings are NOT CI-gated and may be bypassed with `--no-verify`.
- Do NOT stage pre-existing untracked files (`packages/api/tsconfig.check.json`, `docs/superpowers/plans/2026-06-06-*.md`). Stage only files you author. Never `git add -A`.
- Conventional Commits; end commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- `ListResponse` shape: `{ id, title, dateAdded, items, users, listType, ownerId? }`. Lists query key: `['lists', userId]`.
- FIFO replay ordering (lower `seq` first) is what guarantees `list.create` reaches the server before that list's `item.add`s. Do not reorder the queue.

---

### Task 1: API — `addList` accepts a client id and is idempotent on replay

**Files:**
- Modify: `packages/api/src/domain/ListService/index.ts` (`addList` signature + idempotency)
- Modify: `packages/api/src/interfaces/ListHandlers/index.ts` (`addList` handler reads `id` from body)
- Test: `packages/api/src/domain/ListService/index.test.ts`, `packages/api/src/interfaces/ListHandlers/index.test.ts`

**Interfaces:**
- Produces: `ListService.addList(title, dateAdded, owner, selectedUsernames?, listType?, id?)` — uses `id` as the new list's `id` when provided; if a list with `title` already exists AND its `id === id`, returns it unchanged (idempotent replay). `PUT /api/lists` body now also accepts optional `id: string`.

- [ ] **Step 1: Write failing service tests**

In `packages/api/src/domain/ListService/index.test.ts` add:

```ts
it('addList uses caller-provided id when given', async () => {
    repo.getByTitle.mockResolvedValue(null);
    repo.insert.mockResolvedValue(undefined);
    const list = await service.addList('Groceries', new Date(), owner, [], undefined, 'client-list-uuid');
    expect(list.id).toBe('client-list-uuid');
    expect(repo.insert).toHaveBeenCalled();
});

it('addList is idempotent: existing list with same title and id is returned without re-insert', async () => {
    const existing = { id: 'client-list-uuid', title: 'Groceries', dateAdded: new Date(), items: [], users: [], listType: ListType.SHOPPING, ownerId: owner.id };
    repo.getByTitle.mockResolvedValue(existing);
    const list = await service.addList('Groceries', new Date(), owner, [], undefined, 'client-list-uuid');
    expect(list).toBe(existing);
    expect(repo.insert).not.toHaveBeenCalled();
});
```

> Use the file's existing `owner`/`repo` mock fixtures; mirror neighbouring tests for construction. `resolveSharedUsers` calls into the auth client mock — keep `selectedUsernames` as `[]` so it resolves to just the owner (match how existing addList tests set this up).

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/api test`
Expected: FAIL — `addList` ignores `id`; no idempotency branch.

- [ ] **Step 3: Implement in `ListService.addList`**

Add a trailing `id?: string` param. At the top of the `try`, before resolving users / inserting:

```ts
async addList(
    title: string,
    dateAdded: Date,
    owner: User,
    selectedUsernames?: Array<string>,
    listType: ListType = ListTypeEnum.SHOPPING,
    id?: string
) {
    try {
        if (id) {
            const existing = await this.repo.getByTitle(title);
            if (existing && existing.id === id) {
                return existing; // idempotent replay
            }
        }
        const users = await this.resolveSharedUsers(title, owner, selectedUsernames);
        const list: List = {
            id: id ?? this.idGenerator.generate(),
            title,
            dateAdded,
            items: [],
            users,
            listType,
            ownerId: owner.id,
        };
        await this.repo.insert(list);
        // ...unchanged logging...
        return list;
    } catch (error) {
        // ...unchanged...
    }
}
```

- [ ] **Step 4: Read `id` in the handler**

In `packages/api/src/interfaces/ListHandlers/index.ts`, find the `addList` handler. It parses the body; add `id`:

```ts
const { title, dateAdded, user, selectedUsers, listType, id } = await c.req.json<{
    title: string; dateAdded: Date; user: User; selectedUsers?: string[]; listType?: ListType; id?: string;
}>();
// ...
const list = await getListService().addList(title, dateAdded, user, selectedUsers, listType, id);
```

(Keep the existing validation and `user`/owner handling exactly as-is; only thread `id` through.)

- [ ] **Step 5: Run tests + typecheck**

Run: `bun run --filter @shoppingo/api test` → PASS (incl. existing addList tests, unchanged behaviour when `id` omitted).
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/ListService/index.ts packages/api/src/interfaces/ListHandlers/index.ts packages/api/src/domain/ListService/index.test.ts packages/api/src/interfaces/ListHandlers/index.test.ts
git commit -m "$(cat <<'EOF'
feat(api): accept client id on list create for idempotent offline replay

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Web — list intent reducer, replay mapping, outbox type widening

**Files:**
- Modify: `packages/web/src/offline/outboxStore.ts` (widen `entityType`/op union)
- Modify: `packages/web/src/api/index.ts` (`addList` accepts optional `id`)
- Create/Modify: `packages/web/src/offline/intents.ts` (`applyListIntent`, `ListView`)
- Modify: `packages/web/src/offline/replay.ts` (`replayIntent` handles `list.create`)
- Test: `packages/web/src/offline/intents.test.ts` (extend), `packages/web/src/offline/replay.test.ts` (extend if present)

**Interfaces:**
- Consumes: `addList` from `../api`; `OutboxIntent` from `./outboxStore`.
- Produces:
  - `outboxStore` types widened: `EntityType = 'item' | 'list'`; `ListOp = 'list.create'`; `OutboxIntent.entityType: EntityType`; `OutboxIntent.op: ItemOp | ListOp`.
  - `ListView = { id: string; title: string; items: unknown[]; users: Array<{ id: string; username: string }>; listType: string; ownerId?: string; dateAdded?: string | Date }`.
  - `applyListIntent(lists: ListView[], intent: OutboxIntent): ListView[]` — for `list.create`, appends a new list from the payload (idempotent if `targetId` already present).
  - `replayIntent` additionally maps `list.create` → `addList(title, user, selectedUsers, listType, targetId)`.

- [ ] **Step 1: Widen outbox types**

In `packages/web/src/offline/outboxStore.ts`:

```ts
export type ItemOp = 'item.add' | 'item.toggle' | 'item.delete' | 'item.rename' | 'item.quantity';
export type ListOp = 'list.create';
export type EntityType = 'item' | 'list';

export interface OutboxIntent {
    seq: number;
    id: string;
    entityType: EntityType;
    op: ItemOp | ListOp;
    targetId: string;
    scope: string;       // item ops: list title; list ops: owner userId
    payload: Record<string, unknown>;
    createdAt: number;
}
```

(No behavioural change to the store; only the type union widens. Existing item code keeps compiling.)

- [ ] **Step 2: Write failing reducer test**

In `packages/web/src/offline/intents.test.ts` add:

```ts
import { applyListIntent } from './intents';

const listBase = (targetId: string, payload = {}): OutboxIntent =>
    ({ seq: 1, id: 'i', entityType: 'list', op: 'list.create', targetId, scope: 'user-1', payload, createdAt: 0 });

describe('applyListIntent', () => {
    it('list.create appends a new list', () => {
        const r = applyListIntent([], listBase('L1', { title: 'Groceries', listType: 'shopping', ownerId: 'user-1' }));
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ id: 'L1', title: 'Groceries', items: [], listType: 'shopping', ownerId: 'user-1' });
    });
    it('list.create is idempotent when id already present', () => {
        const existing = [{ id: 'L1', title: 'Groceries', items: [], users: [], listType: 'shopping' }];
        expect(applyListIntent(existing as never, listBase('L1', { title: 'Groceries' }))).toHaveLength(1);
    });
});
```

- [ ] **Step 3: Run, verify fail**

Run: `bun run --filter @shoppingo/web test intents`
Expected: FAIL — `applyListIntent` not exported.

- [ ] **Step 4: Implement `applyListIntent` + `ListView`**

In `packages/web/src/offline/intents.ts` (do NOT import `../api` here — keep the file pure):

```ts
export interface ListView {
    id: string;
    title: string;
    items: unknown[];
    users: Array<{ id: string; username: string }>;
    listType: string;
    ownerId?: string;
    dateAdded?: string | Date;
}

export const applyListIntent = (lists: ListView[], intent: OutboxIntent): ListView[] => {
    const p = intent.payload;
    if (intent.op === 'list.create') {
        if (lists.some((l) => l.id === intent.targetId)) return lists;
        return [...lists, {
            id: intent.targetId,
            title: String(p.title ?? ''),
            items: [],
            users: (p.users as ListView['users']) ?? [],
            listType: String(p.listType ?? 'shopping'),
            ...(p.ownerId !== undefined && { ownerId: String(p.ownerId) }),
            dateAdded: new Date(),
        }];
    }
    return lists;
};
```

- [ ] **Step 5: Map `list.create` in `replay.ts`**

In `packages/web/src/offline/replay.ts`, add a branch in `replayIntent` (this file already imports api fns):

```ts
import { addList } from '../api';
// inside replayIntent, alongside the item.* cases:
case 'list.create': {
    const p = intent.payload;
    await addList(
        String(p.title),
        p.user as Parameters<typeof addList>[1],
        (p.selectedUsers as string[] | undefined) ?? [],
        p.listType as Parameters<typeof addList>[3] | undefined,
        intent.targetId
    );
    return;
}
```

> The switch is on `intent.op`. Ensure the `list.create` case sits in the same switch; if TypeScript complains about exhaustiveness with the widened union, that confirms the wiring.

- [ ] **Step 6: `addList` web api accepts `id`**

In `packages/web/src/api/index.ts`, extend `addList`:

```ts
export const addList = async (
    listTitle: string,
    user: User,
    selectedUsers?: Array<string>,
    listType?: ListType,
    id?: string
): Promise<unknown> => {
    const dateAdded = generateTimestamp(new Date());
    const requestBody = {
        title: listTitle,
        dateAdded,
        user,
        selectedUsers: selectedUsers || [],
        ...(listType !== undefined && { listType }),
        ...(id !== undefined && { id }),
    };
    return await makeRequest({ pathname: '/api/lists', method: MethodType.PUT, operationString: 'add list', body: JSON.stringify(requestBody) });
};
```

- [ ] **Step 7: Run tests + typecheck**

Run: `bun run --filter @shoppingo/web test intents replay` → PASS.
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/offline/outboxStore.ts packages/web/src/offline/intents.ts packages/web/src/offline/replay.ts packages/web/src/api/index.ts packages/web/src/offline/intents.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add list.create intent reducer and replay mapping

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Web — fold pending list creations into the lists query

**Files:**
- Modify: `packages/web/src/offline/foldPending.ts` (`foldPendingLists`)
- Modify: `packages/web/src/api/index.ts` (`getListsQuery` queryFn folds)
- Test: `packages/web/src/offline/foldPending.test.ts` (extend)

**Interfaces:**
- Consumes: `applyListIntent`, `ListView` (Task 2); `outboxStore.peekAll` (Phase 1).
- Produces: `foldPendingLists(userId: string, lists: ListResponse[]): ListResponse[]` — applies pending `list.create` intents whose `scope === userId`, in seq order.

- [ ] **Step 1: Write failing fold test**

In `packages/web/src/offline/foldPending.test.ts` add:

```ts
import { foldPendingLists } from './foldPending';

describe('foldPendingLists', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });

    it('appends pending list.create for the given user', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'list', op: 'list.create', targetId: 'L1', scope: 'user-1', payload: { title: 'Groceries', listType: 'shopping', ownerId: 'user-1' }, createdAt: 0 });
        const server = [{ id: 'S1', title: 'Existing', dateAdded: new Date(), items: [], users: [], listType: 'shopping' }];
        const folded = foldPendingLists('user-1', server as never);
        expect(folded.map((l) => l.id)).toEqual(['S1', 'L1']);
    });

    it('ignores list.create scoped to a different user', async () => {
        await outboxStore.enqueue({ id: '1', entityType: 'list', op: 'list.create', targetId: 'L1', scope: 'user-2', payload: { title: 'X' }, createdAt: 0 });
        const server = [{ id: 'S1', title: 'Existing', dateAdded: new Date(), items: [], users: [], listType: 'shopping' }];
        expect(foldPendingLists('user-1', server as never)).toHaveLength(1);
    });
});
```

> Ensure `import 'fake-indexeddb/auto';` is already at the top of this test file (Phase 1 added it).

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test foldPending`
Expected: FAIL — `foldPendingLists` not exported.

- [ ] **Step 3: Implement `foldPendingLists`**

In `packages/web/src/offline/foldPending.ts`:

```ts
import type { ListResponse } from '@shoppingo/types';
import { applyItemIntent, applyListIntent, type ItemView, type ListView } from './intents';
import { outboxStore } from './outboxStore';

// ...existing foldPendingItems unchanged...

export const foldPendingLists = (userId: string, lists: ListResponse[]): ListResponse[] => {
    const pending = outboxStore.peekAll().filter((i) => i.entityType === 'list' && i.scope === userId);
    if (pending.length === 0) return lists;
    const folded = pending.reduce<ListView[]>(
        (acc, intent) => applyListIntent(acc, intent),
        lists as unknown as ListView[]
    );
    return folded as unknown as ListResponse[];
};
```

- [ ] **Step 4: Wire `getListsQuery`**

In `packages/web/src/api/index.ts`:

```ts
import { foldPendingItems, foldPendingLists } from '../offline/foldPending';

export const getListsQuery = (userId: string) => ({
    queryKey: ['lists', userId],
    queryFn: async () => foldPendingLists(userId, await getLists(userId)),
});
```

> `getLists` is the existing internal fetch in this module. Each refetch starts from fresh server data, so synced creations (removed from the queue after drain) are not double-appended.

- [ ] **Step 5: Run tests + typecheck**

Run: `bun run --filter @shoppingo/web test foldPending` → PASS.
Run: `bun run tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/offline/foldPending.ts packages/web/src/api/index.ts packages/web/src/offline/foldPending.test.ts
git commit -m "$(cat <<'EOF'
feat(web): fold pending list creations into the lists query

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Web — route list creation through the outbox

**Files:**
- Modify: `packages/web/src/pages/ListsPage/index.tsx` (`handleAddList` enqueues + optimistic + drain)
- Test: `packages/web/src/pages/ListsPage/index.test.tsx` (create if absent, else extend) OR a focused hook test if the page is hard to render — see note.

**Interfaces:**
- Consumes: `outboxStore.enqueue`, `drainOutbox`, `applyListIntent` indirectly via the lists-query fold (Task 3).

- [ ] **Step 1: Write the failing test**

Prefer a focused test that asserts the enqueue behaviour without rendering the whole page. If `ListsPage` is awkward to render in jsdom, extract the create logic into a tiny hook `useCreateList(userId)` in `packages/web/src/hooks/useCreateList.ts` and test that instead (this also keeps `ListsPage` lean). Test (`packages/web/src/hooks/useCreateList.test.tsx`):

```ts
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../offline/drainer', () => ({ drainOutbox: vi.fn().mockResolvedValue(undefined) }));
import { outboxStore } from '../offline/outboxStore';
import { useCreateList } from './useCreateList';

const user = { id: 'user-1', username: 'me' };
const wrap = (client: QueryClient) => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('useCreateList', () => {
    beforeEach(async () => { await outboxStore._resetForTests(); });

    it('enqueues a list.create intent and optimistically adds the list', async () => {
        const client = new QueryClient();
        client.setQueryData(['lists', 'user-1'], []);
        const { result } = renderHook(() => useCreateList(user), { wrapper: wrap(client) });
        await act(async () => { await result.current('Groceries', 'shopping' as never, []); });
        await waitFor(() => expect(outboxStore.peekAll()).toHaveLength(1));
        const intent = outboxStore.peekAll()[0];
        expect(intent.op).toBe('list.create');
        expect(intent.scope).toBe('user-1');
        expect(intent.payload).toMatchObject({ title: 'Groceries' });
        const cached = client.getQueryData(['lists', 'user-1']) as Array<{ title: string }>;
        expect(cached.map((l) => l.title)).toContain('Groceries');
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun run --filter @shoppingo/web test useCreateList`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `useCreateList`**

Create `packages/web/src/hooks/useCreateList.ts`:

```ts
import type { ListType, User } from '@shoppingo/types';
import { useQueryClient } from 'react-query';
import { drainOutbox } from '../offline/drainer';
import { outboxStore } from '../offline/outboxStore';
import { logger } from '../utils/logger';

export const useCreateList = (user: User | undefined) => {
    const queryClient = useQueryClient();
    return async (title: string, listType: ListType, selectedUsers: string[]) => {
        if (!user) {
            logger.warn('Attempted to add list without user');
            return;
        }
        const id = crypto.randomUUID();
        queryClient.setQueryData(['lists', user.id], (old: unknown) => {
            const lists = (old as unknown[]) ?? [];
            return [...lists, { id, title, dateAdded: new Date(), items: [], users: [user], listType, ownerId: user.id }];
        });
        await outboxStore.enqueue({
            id: crypto.randomUUID(),
            entityType: 'list',
            op: 'list.create',
            targetId: id,
            scope: user.id,
            payload: { title, listType, selectedUsers, user, ownerId: user.id },
            createdAt: Date.now(),
        });
        void drainOutbox();
        logger.info('List create queued', { listTitle: title, listType });
    };
};
```

- [ ] **Step 4: Run, verify pass**

Run: `bun run --filter @shoppingo/web test useCreateList` → PASS.

- [ ] **Step 5: Use the hook in `ListsPage`**

In `packages/web/src/pages/ListsPage/index.tsx`, replace the body of `handleAddList` so it calls the hook instead of `addList` + `refetch`:

```ts
const createList = useCreateList(user);
// ...
const handleAddList = async (listTitle: string, listType: ListType, selectedUsers: string[]) => {
    try {
        await createList(listTitle, listType, selectedUsers);
        navigate(`/list/${encodeURIComponent(listTitle)}`); // if navigation already happens here, keep existing behaviour
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to create list', { listTitle, error: errorMessage });
        throw error;
    }
};
```

> Drop the now-unused `addList` import from `ListsPage` (fallow will flag it otherwise). If `ListsPage` no longer references `refetch`, leave the `useQuery` destructure as-is only if `refetch` is still used elsewhere on the page; otherwise remove it to satisfy lint. Check the surrounding code and match what's actually used. Preserve existing navigation/toast behaviour after a successful create.

- [ ] **Step 6: Full verification**

```bash
bun run lint:fix
bun run tsc --noEmit
bun run --filter @shoppingo/web test
bun run --filter @shoppingo/api test   # expect 1 known pre-existing auth-network-mock failure; report counts
bunx fallow@2.100.0 dead-code          # MUST be green
bun run --filter @shoppingo/web build
bun run --filter @shoppingo/api build
```

- [ ] **Step 7: Manual smoke test (DevTools)**

1. `bun run start`, log in. DevTools → Network → **Offline**.
2. Create a new list "CampingTrip". Confirm it appears in the lists view and you can open it.
3. Add a few items to it offline. Confirm they show; the pending badge counts list + items.
4. Reload the tab while offline — list and items persist (cold-start fold of `['lists', userId]` and `[listTitle]`).
5. Go **Online**. Watch the badge drain to zero. Refresh: the list and its items exist on the server, in the right order (list created before items).
6. In `Application → IndexedDB → shoppingo-outbox` confirm `intents` empties.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/hooks/useCreateList.ts packages/web/src/hooks/useCreateList.test.tsx packages/web/src/pages/ListsPage/index.tsx
git commit -m "$(cat <<'EOF'
feat(web): create shopping lists offline via outbox queue

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage (Phase 2 = offline list creation):**
- Queue a `list.create` intent on create → Tasks 2, 4. ✔
- API accepts client id, idempotent replay → Task 1. ✔
- Cold-start fold shows offline-created lists → Task 3. ✔
- Items added to an offline list sync after the list → reuses Phase 1 `item.add`; FIFO ordering guarantees `list.create` (lower seq) replays first (Global Constraints + Task 4 smoke test). ✔
- No temp-id reconciliation: lists are title-addressed; the offline-chosen title is the stable scope for item ops. Documented in the Architecture section. ✔ (The spec's `rewriteTargetId`/add-then-delete-elision are intentionally NOT built — YAGNI for title-addressed lists with no offline list-delete in this phase.)

**Placeholder scan:** No TBD/TODO. Task 4 Step 5 says "match what's actually used" for the `refetch`/`addList` import cleanup because the exact surrounding lines must be confirmed at edit time — the required action (remove now-unused symbols to keep lint/fallow green) is explicit.

**Type consistency:** `EntityType`/`ListOp`/widened `OutboxIntent` defined in Task 2 and consumed by Tasks 3–4. `applyListIntent(lists, intent)` and `ListView` defined in Task 2, consumed in Task 3. `foldPendingLists(userId, lists)` defined in Task 3, consumed in Task 4's query path. `addList(..., id?)` signature consistent across web (Task 2) and api (Task 1). `useCreateList(user)` returns `(title, listType, selectedUsers) => Promise<void>`, matching its test and `ListsPage` call site.

**Conflict/ordering edge:** if `item.add` for an offline list somehow replayed before `list.create` (it cannot under FIFO), the API would 404 and drop-if-gone would discard the item. FIFO + single-flight prevents this; do not add out-of-order draining.
