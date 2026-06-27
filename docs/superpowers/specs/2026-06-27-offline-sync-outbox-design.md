# Offline Sync (Outbox Queue) — Design

**Date:** 2026-06-27
**Status:** Approved (pending spec review)

## Goal

Let users mutate their data while offline — add / toggle / delete / rename / re-quantify shopping-list items, and (later phases) create lists and edit todos/labels/recipes — and have those changes **survive a full app close**, then automatically **sync to the API when connectivity returns**.

The mechanism is a persistent **mutation outbox**: each user action is recorded as an *intent* in IndexedDB and applied optimistically to the local view; a drainer replays the queue to the existing REST endpoints when online. One shared engine, rolled out per entity type across three phases.

## Decisions (locked during brainstorming)

- **Mechanism:** outbox queue replayed to existing REST endpoints. **Not** Background Sync API (no iOS/Safari support — would silently lose iPhone users' edits) and **not** a server-side state-merge endpoint (deferred; revisit only if real conflicts bite).
- **Conflict policy:** **last-write-wins, drop-if-gone.** The offline edit overwrites the server. If replay hits a `404` (target deleted by another user on a shared list), that op is silently discarded. After draining, refetch canonical state so the UI reconciles to the server's truth.
- **Durability:** offline edits **must survive a force-close + reopen while still offline.** The queue is the source of truth for pending mutations; on cold start the UI folds the persisted queue over the last cached server snapshot.
- **Addressing:** item endpoints move from name-addressed (`:itemName`) to **id-addressed** (`:itemId`) so a queued toggle/rename survives a concurrent rename. Lists remain title-addressed.

## Non-Goals

- True conflict-free concurrent merge (CRDT / per-field LWW server merge). Deferred.
- Tab-closed / background replay on Chromium via Background Sync. Out of scope (engine replays on next app foreground / `online` event).
- Offline image generation or upload (recipe images stay online-only).

---

## Architecture

One shared engine in `packages/web`, consumed by the existing react-query mutation hooks. New units are framework-agnostic where possible (plain TS + `idb`), so they are unit-testable in isolation with `bun:test`.

### 1. Outbox store (`src/offline/outboxStore.ts`)

Append-only queue persisted in IndexedDB via the `idb` library (new dependency — small, typed wrapper over IndexedDB; no other deps added).

Record shape:

```ts
interface OutboxIntent {
    seq: number;          // auto-increment key, defines replay order (FIFO)
    id: string;           // uuid, stable handle for dedup / collapse
    entityType: 'item' | 'list' | 'todo' | 'label' | 'recipe';
    op: string;           // e.g. 'item.add' | 'item.toggle' | 'item.delete' | 'item.rename' | 'item.quantity'
    targetId: string;     // id (or temp id) of the entity the op acts on
    scope?: string;       // contextual key, e.g. list title for item ops
    payload: unknown;     // op-specific args
    createdAt: number;    // epoch ms
}
```

Public API (all async):

- `enqueue(intent): Promise<OutboxIntent>` — append, returns the stored record (with `seq`).
- `peekAll(): Promise<OutboxIntent[]>` — ordered by `seq`.
- `remove(seq): Promise<void>` — after successful replay or discard.
- `rewriteTargetId(tempId, realId): Promise<void>` — temp-id reconciliation (Phase 2).
- `count(): Promise<number>` — drives the pending badge.
- `collapse(...)` — optional optimisation: fold repeated toggles on the same `targetId` into the latest (see §6).

The store knows nothing about HTTP or react-query.

### 2. Intent layer (`src/offline/intents.ts`)

A thin mapping from a user action to (a) an `OutboxIntent` and (b) the optimistic cache update — and the inverse: how to turn a dequeued intent into a `makeRequest` call.

- `buildItemIntent(op, args): OutboxIntent` — used by the mutation hooks.
- `replayIntent(intent): Promise<void>` — switch on `op`, call the corresponding existing `api/index.ts` function (now id-addressed). Throws on non-2xx so the drainer can classify the error.

This is the only place that knows the mapping `op → endpoint`. Adding a new entity in Phase 3 means extending this switch + the optimistic reducers, nothing else.

### 3. Sync drainer (`src/offline/drainer.ts`)

Single-flight FIFO drainer.

- **Triggers:** `window` `online` event, app foreground (`visibilitychange`), and immediately after `enqueue` when already online.
- **Loop:** `peekAll()`, then for each intent in `seq` order call `replayIntent`:
  - **2xx** → `remove(seq)`, continue.
  - **404** → discard (`remove(seq)`), continue (drop-if-gone).
  - **5xx / network error** → stop the drain (preserve order), schedule retry with exponential backoff (cap ~30s), resume on next trigger.
- **After a clean drain** → invalidate the affected react-query keys so the UI reconciles to canonical server state (LWW resolution).
- **Single-flight:** a module-level lock prevents concurrent drains (e.g. `online` firing mid-drain).

### 4. Local state derivation (cold-start hydration)

The service worker already `NetworkFirst`-caches `/api` GETs (`sw.ts:13`), so a cold start offline serves the **last server snapshot** — but without pending edits. To keep offline edits visible:

- On app init, after react-query hydrates a query from the cached GET, **fold the persisted queue over it** (apply each pending intent's optimistic reducer in `seq` order) before first paint of that view.
- Implemented as a small `applyPendingTo(entityType, scope, serverData)` helper reusing the same optimistic reducers from §2, called in the query hooks' `select` / on hydration.

No second persisted copy of entity state — the queue + cached snapshot are the only sources, avoiding drift.

### 5. id-addressing refactor (API + web + types)

Required so queued ops bind to a stable id, not a mutable name.

- **API** (`packages/api`): change item routes/handlers from `:itemName` to `:itemId`:
  - `routes/index.ts` — `/api/lists/:title/items/:itemId` for update/delete.
  - `interfaces/ListHandlers/*` and the `ListService` / `MongoListRepository` lookups — match items by `id` instead of `name`.
  - `addItem` returns the created item's `id` (already on the `Item` type).
- **Web** (`packages/web/src/api/index.ts`): item mutation functions take `itemId`.
- Item names are now free to change without breaking references. Todos and recipes are already id-addressed — no change.
- **Lists** stay title-addressed (rarely renamed offline; collisions handled by existing title-uniqueness behaviour).

> This refactor ships in Phase 1 because item add/toggle/rename is the headline use case and rename-while-offline is the case name-addressing breaks.

### 6. Optimisations (optional, behind the same store API)

- **Collapse:** consecutive `item.toggle` / `item.quantity` ops on the same `targetId` with no intervening op → keep only the latest payload. Reduces replay chatter; correctness-neutral under LWW.
- **Add-then-delete elision:** an `item.add` for a temp id followed by `item.delete` of the same temp id → drop both (never hit the server). Phase 2.

### 7. UI (`src/hooks/useOnlineStatus.ts` + pending badge)

- `useOnlineStatus()` — `navigator.onLine` + `online`/`offline` listeners.
- A small badge (reusing existing component styles) showing `outboxStore.count()` — "N changes pending" — cleared as the drainer empties the queue. Subscribe to a lightweight store event or poll on drain completion.
- Existing optimistic UX in `useItemMutations` stays; it now writes through the intent layer instead of calling `makeRequest` directly.

---

## Temp IDs (offline-created entities) — Phase 2

Creating an entity offline has no server id yet.

- Client mints a uuid (`crypto.randomUUID()`) as the entity's `id` at creation; the optimistic cache and the `item.add` intent both use it.
- On replay of `item.add`, the server returns the authoritative `id`. If they differ, call `outboxStore.rewriteTargetId(tempId, realId)` so later queued ops that reference the temp id (toggle/rename of the just-added item) replay against the real id.
- Add-then-delete of the same temp id is elided (§6) so it never reaches the server.

---

## Rollout Phases (decomposition)

Each phase is independently shippable and gets its own implementation plan.

- **Phase 1 — Engine + shopping-list items.** `idb` outbox store, intent layer, drainer, cold-start fold, `useOnlineStatus`, pending badge, **item id-addressing refactor (API + web)**, wire `useItemMutations` (add/toggle/delete/rename/quantity) through the engine. *Highest value; the bulk of the work.*
- **Phase 2 — Offline list creation + temp-id reconciliation.** `crypto.randomUUID` temp ids, `rewriteTargetId`, add-then-delete elision, offline "new list" flow.
- **Phase 3 — Extend to todos, labels, recipes.** Reuse the engine: add op cases to the intent layer + optimistic reducers and wire the respective mutation hooks. Near-free given Phases 1–2.

---

## Error Handling

- **Replay 404** → discard intent (drop-if-gone). Logged at debug level.
- **Replay 5xx / network** → stop drain, exponential backoff, retry on next trigger. Queue persists; nothing lost.
- **Auth failure (401) during replay** → stop drain, surface re-auth prompt (reuses existing auth flow); resume after re-auth. Queue persists.
- **IndexedDB unavailable** (private mode / quota) → degrade gracefully to online-only behaviour (current behaviour); log a warning. No crash.
- **Poison intent** (repeatedly fails non-404, non-5xx — e.g. 400) → after a retry cap, move to a `failed` state and surface in the pending badge as "N changes couldn't sync" rather than blocking the queue head forever.

---

## Testing (`bun:test`, via `/write-unit-test`)

- **outboxStore** — enqueue ordering, `peekAll` order, `remove`, `count`, `rewriteTargetId`, `collapse` (fake-indexeddb or in-memory adapter).
- **drainer** — mocked `replayIntent`: success path removes; 404 discards; 5xx stops + backs off; ordering preserved across partial failure; single-flight lock.
- **intent layer** — `op → endpoint` mapping; optimistic reducers (add/toggle/delete/rename/quantity).
- **cold-start fold** — `applyPendingTo` folds a queue over a snapshot to the expected view.
- **temp-id reconciliation** (Phase 2) — `rewriteTargetId` rewrites later ops; add-then-delete elision.
- **API id-addressing** — item update/delete by id; add returns id; missing id → 404.
- **Component** — pending badge reflects count; `useOnlineStatus` transitions.

## Files (Phase 1)

**New (web):** `src/offline/outboxStore.ts`, `src/offline/intents.ts`, `src/offline/drainer.ts`, `src/offline/applyPending.ts`, `src/hooks/useOnlineStatus.ts`, pending-badge component (+ tests for each).
**Modify (web):** `src/hooks/useItemMutations.ts`, `src/api/index.ts`, query hooks for cold-start fold, `package.json` (add `idb`).
**Modify (api):** `src/routes/index.ts`, `src/interfaces/ListHandlers/*`, `ListService` / `MongoListRepository` item lookups.
**Modify (types):** none expected (`Item.id` already exists).
