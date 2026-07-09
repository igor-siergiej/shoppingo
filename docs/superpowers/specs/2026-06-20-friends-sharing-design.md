# Friends-Based Sharing — Design Spec

**Date:** 2026-06-20 (revised 2026-07-07)
**Status:** Approved design, pending implementation plan

## Summary

Replace the current "share with any username" model with a **friends** system.
Users pair via a **one-time code** (no QR): User A mints a short-TTL code and sends
it out-of-band (SMS/WhatsApp/etc — the app sends nothing), User B types it in and
becomes a mutual friend instantly. Once friends, sharing is **auto-share, opt-out**:
new lists / recipes / todos are shared with your current friends by default, and you
can toggle any friend off per item. You can only ever share with friends — the
username search is removed entirely.

## Decisions

- **Friend graph location:** Shoppingo's own MongoDB (local, app-scoped). No kivo
  changes beyond the existing user lookup. Friends are shoppingo-only, not reused
  across other imapps apps.
- **Pairing:** one-time code, **15-min TTL**, single-use. Redeeming *is* accepting —
  no separate approval step. **No QR** (dropped from the earlier draft).
- **Share model:** **auto-share, opt-out.** On create, an item's member list is
  seeded from the owner's **current** friends. Owner can deselect friends in the
  create sheet (opt-out) or adjust membership later.
- **New-friend scope:** **future items only.** Becoming friends does **not**
  back-fill existing items — seeding happens at creation time only. Old items can
  still be shared to a new friend manually.
- **Permissions:** uniform — a friend who can see an item can **edit** it
  (collaborate everywhere: add list items, tick todos, edit recipes). Matches
  today's list behaviour.
- **Consent:** you can only add **existing friends** to an item. No username search
  anywhere. This removes the "drop an item on a stranger" behaviour.
- **Entities in scope:** shopping **lists**, **recipes**, and **todos** (todos are
  net-new to sharing).
- **Migration:** existing `users[]` on lists/recipes are preserved. For each
  currently-shared (owner, member) pair, **auto-create a Friendship** so nothing
  breaks and current members stay members.
- **Code input UI:** shadcn `InputOTP` (`input-otp`) for entering the code; the
  generated code is shown large (mono) with a live countdown + Share/Copy.

## Data Model

New shared types (`packages/types`):

```ts
export interface Friendship {
    id: string;
    userIds: [string, string];        // sorted, canonical pair key
    users: [User, User];              // {id, username} snapshots for display
    createdAt: Date;
}

export interface PairingCode {
    code: string;
    creatorId: string;
    creatorUsername: string;
    expiresAt: Date;                  // createdAt + 15 min
    usedAt?: Date;
}

// Todo gains sharing (mirrors List / Recipe)
export interface Todo {
    // ...existing fields...
    users?: Array<User>;              // friends this todo is shared with
}
```

`List` and `Recipe` already carry `users: Array<User>` + `ownerId` — reused as the
per-item member list. No shape change there; the semantics change (members must be
friends; seeded at create time).

New MongoDB collections (shoppingo db):

- `friendships` — one doc per pair. "Friends of X" = `userIds` contains `X`.
  Username snapshots stored to avoid a kivo roundtrip on every list/todo load;
  refreshed at pairing time.
- `pairingCodes` — ephemeral. Mongo **TTL index** on `expiresAt` for auto-cleanup;
  `usedAt` marks single-use redemption.

## API

Clean-architecture layers (mirror existing list/todo structure):

- `domain/FriendRepository` (interface) + `infrastructure/MongoFriendRepository`
  — manages both `friendships` and `pairingCodes`.
- `domain/FriendService` — business logic.
- `interfaces/FriendHandlers` + `routes` entries. All routes use `authenticate`.

### Endpoints

```
POST   /api/friends/code           → { code, expiresAt }
POST   /api/friends/redeem         body { code } → { friend: User }
GET    /api/friends                → Array<User>
DELETE /api/friends/:friendId      → 204   (hard revoke — see below)
```

### FriendService behaviour

- **generateCode(creatorId):** single-use code (6–8 chars, readable charset — no
  ambiguous 0/O/1/I), TTL 15 min, bound to `creatorId`. Returns `{ code, expiresAt }`.
- **redeem(code, requesterId):** atomic. Guard matrix → distinct errors:
  - code missing / wrong → 404
  - expired → 410
  - already used → 409
  - `creatorId === requesterId` (self) → 400
  - already friends → 409 (friendly message; not a hard failure)
  - happy path: mark code `usedAt` atomically, create canonical friendship doc,
    return the new friend as `User`.
- **list(userId):** the other party of each friendship as `User[]`.
- **unfriend(userId, friendId):** **hard revoke.** Remove the pair doc **and** strip
  `friendId` from `users[]` on every list/recipe/todo owned by `userId`, and strip
  `userId` from every item owned by `friendId`. Edits already made stay; future
  access is gone.

### Changes to existing services

- **`ListService` / `RecipeService`:**
  - Creation seeds `users[]` from the owner's current friends unless the client
    passes an explicit subset (the create-sheet deselection). Every id in the
    submitted member list must be a friend of the owner → else **403**.
  - `addUser` / member-management validates the target is a friend → **403**
    otherwise. Remove the kivo username-resolution add-path.
- **`TodoService`:**
  - `createTodo` seeds `users[]` from current friends (subset allowed); each must be
    a friend → 403. `updateTodo` member changes validated the same way.
  - `getTodos` returns todos where `ownerId == me` **OR** `me ∈ users[]`.
  - **Reminders fire for the owner only.** Shared todos appear for members but the
    `DailyReminderScheduler` / `TodoReminderService` schedule against `ownerId` only —
    members are not spammed.
- **Member management is owner-only.** A non-owner member collaborates on content but
  cannot change who else is a member, and cannot re-share to their own friends.

## Frontend (`packages/web`)

### App-bar integration (reuse existing pattern — Variant B)

The bottom-nav `ToolBarAppBar` already renders a **context-aware center `+`** slot
(`listDrawer` on `/`, `recipeDrawer` on `/recipes`, `todoDrawer` on `/calendar`).
Friends slots into the same pattern:

- Add a **Friends** nav icon (lucide `Users`) to the left nav group, routing to
  `/friends`, `active={isFriendsPage}`.
- Add `isFriendsPage` to `ToolBarAppBar` + a new **`friendDrawer`** center slot that
  renders on `/friends`. The center **`+` adds a new friend** — it opens
  `AddFriendDrawer`. No new nav pattern, no FAB — the existing center `+`.

### New: FriendsPage (`/friends`)

- `Card` list of friends: `Avatar` (initial) + username + "friends since <month>".
- Tapping a friend → **FriendDetail**: everything shared with them, each with a
  `Switch`, plus a destructive **Remove friend** (confirm dialog → hard revoke).
- Empty state (shadcn `Empty`) when you have no friends yet, pointing at the `+`.

### New: AddFriendDrawer (the center `+`)

A `Drawer` with two modes (tabs or segmented):

- **Invite** — mints a code; shows it large (mono, `--font-mono`), a live **15-min
  countdown**, and **Share code** (native share) + **Copy**. Auto-marks expired.
- **Enter code** — shadcn `InputOTP` to type a friend's code + **Add friend**.
  Distinct inline errors for expired / used / not-found / self / already-friends.
  Success → toast + friend appears in the list.

### New: FriendPicker (reusable) — replaces username search

- Client-side filter over `GET /api/friends`. Renders friends as toggle rows
  (`Switch`) / removable chips (`Badge` + `Avatar`).
- **Seeded on** by default in create sheets (auto-share); deselect to opt out.
- Reused in:
  - **AddListDrawer / AddRecipeDrawer** — replaces the "Search Users to Share With"
    free-text input. Friends pre-toggled on.
  - **ManageUsersDrawer** — becomes a friends-only member manager (add/remove friends
    on an existing item). No username search.
  - **AddTodoDrawer** / todo edit — new "share with friends" section.

### API client + state

- Add `friends` methods to the API client (`code`, `redeem`, `list`, `unfriend`).
- React Query key `['friends']`; invalidate on redeem / unfriend. Item lists
  invalidate after member changes.
- The list-create callback signature (`onAddList(name, listType, users: string[])`)
  and recipe/todo equivalents switch from usernames to **friend user-ids**.

### Libraries

- **Code input/display:** shadcn `InputOTP` (`input-otp`). **No QR libraries.**

## Migration

One-off script / startup migration:

1. Scan `lists` + `recipes` for docs with `users.length > 1`.
2. For each (owner, member) pair, upsert a canonical `friendships` doc (dedup by
   sorted `userIds`) with username snapshots from the stored `users[]`.
3. Idempotent — safe to re-run. No change to the items themselves; existing members
   remain in `users[]`.

## Testing

Bun native test runner (`bun:test`) throughout.

- **API (90% coverage threshold):**
  - `FriendService` — generate; redeem guard matrix (missing, expired, used, self,
    already-friends, happy path); list; **unfriend hard-revoke** (pair removed +
    stripped from all owned items both directions).
  - `MongoFriendRepository` (incl. TTL index behaviour, canonical pair key).
  - `ListService` / `RecipeService` — create seeds members from friends; reject
    non-friend member (403); owner-only member management.
  - `TodoService` — share validation + `getTodos` owner-or-shared filter; reminders
    scheduled against owner only.
  - Migration script — pairs created, idempotent re-run.
- **Web:**
  - `FriendPicker` — filter, toggle on/off, seeded-on default.
  - `AddFriendDrawer` — invite (code + countdown) and redeem (InputOTP, error states).
  - `FriendsPage` / `FriendDetail` — list, per-item toggle, remove-friend confirm.

## Out of Scope

- Friend requests / separate accept step (redeem is instant).
- Storing the friend graph in kivo / cross-app friend reuse.
- QR generation or scanning.
- Retroactive back-fill of existing items to newly-added friends.
- Per-friend or per-item view-vs-edit permission tiers (all shares are collaborate).
- Friend profiles, blocking, avatars beyond an initial.
