# Friends-Based Sharing — Design Spec

**Date:** 2026-06-20
**Status:** Approved design, pending implementation plan

## Summary

Replace the current "share with any username" model with a **friends** system.
Users pair via a one-time code (entered as text or scanned as a QR), instantly
becoming mutual friends. Sharing of shopping lists and todos is then restricted
to a user's friends, via a reusable friend-picker component.

## Decisions

- **Friend graph location:** Shoppingo's own MongoDB (local, app-scoped). No kivo changes beyond existing user lookup.
- **Pairing model:** Instant on redeem. User A generates a single-use, short-TTL (~5 min) code/QR; User B redeems it → mutual friendship created immediately. In-person oriented.
- **Existing shares:** No migration. The app currently has only ~2 users; existing shares can be recreated manually. Friends-only restriction applies to **new** shares only.
- **Todo sharing:** Net-new. Todos currently have only `ownerId`; this spec adds full share-with-friends (a `users[]` array mirroring `List`).
- **Code input UI:** shadcn `InputOTP` (`input-otp`) component for entering/displaying the pairing code. QR uses a separate library (generate + scan).

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
    expiresAt: Date;
    usedAt?: Date;
}

// Todo gains sharing (mirrors List)
export interface Todo {
    // ...existing fields...
    users?: Array<User>;              // friends this todo is shared with
}
```

New MongoDB collections (shoppingo db):

- `friendships` — one doc per pair. Query "friends of X" = `userIds` contains `X`.
  Username snapshots stored to avoid a kivo roundtrip on every list/todo load;
  refreshed lazily / at pairing time.
- `pairingCodes` — ephemeral. Mongo **TTL index** on `expiresAt` for auto-cleanup.
  `usedAt` marks single-use redemption.

## API

Clean-architecture layers (mirror existing list/todo structure):

- `domain/FriendRepository` (interface) + `infrastructure/MongoFriendRepository`
  — manages both `friendships` and `pairingCodes`.
- `domain/FriendService` — business logic.
- `interfaces/FriendHandlers` + `routes` entries. All routes use `authenticate`.

### Endpoints

```
POST   /api/friends/code           → { code, qrPayload, expiresAt }
POST   /api/friends/redeem         body { code } → { friend: User }
GET    /api/friends                → Array<User>
DELETE /api/friends/:friendId      → 204
```

### FriendService behaviour

- **generate code:** create single-use code (random 6–8 chars, readable charset),
  TTL ~5 min, bound to `creatorId`. Returns code + `qrPayload`.
- **redeem(code, requesterId):** atomic. Guards:
  - code exists, not expired, not already used → else 400/410
  - `creatorId !== requesterId` (no self-friend) → 400
  - not already friends → 409 (idempotent-friendly: treat as success or conflict)
  - mark code `usedAt` atomically, create canonical friendship doc.
- **list(userId):** return the other party of each friendship as `User[]`.
- **unfriend(userId, friendId):** remove the pair doc.

`qrPayload` = app URL `https://<host>/friends/redeem?code=XXXX` (so scanning in-app
auto-fills; scanning with a generic camera deep-links into the app).

### Changes to existing services

- **`ListService.addUserToList`** — before adding, validate the target user is a
  friend of the requester. Reject non-friends with **403**. (Was: resolve any
  username via kivo and add.)
- **`TodoService`:**
  - `createTodo` / `updateTodo` accept `userIds`; validate each is a friend of the
    owner (403 otherwise).
  - `getTodos` returns todos where `ownerId == me` **OR** `me ∈ users[]`.

## Frontend (`packages/web`)

### New: FriendsPage

- Route + entry in the hamburger menu.
- Sections:
  - **My friends** — list with unfriend action.
  - **Add friend** — generates a code; shows **QR + the code rendered via shadcn
    `InputOTP`** (read-only/display). Auto-refresh on expiry.
  - **Add by code** — shadcn `InputOTP` input to type a code + redeem;
    **"Scan QR"** opens the camera scanner to redeem.

### New: FriendPicker (reusable)

- Searches the user's friends (client-side filter over `GET /api/friends`).
- Props: `value`, `onChange`, `multiple`.
- Reused in:
  - **List share UI** — replaces the free-text username input.
  - **Todo add/edit drawer** — "share with friends".

### Libraries

- **Pairing code input/display:** shadcn `InputOTP` (`input-otp`). **Not** a QR lib.
- **QR generate:** `qrcode` / `qrcode.react`.
- **QR scan:** `@yudiel/react-qr-scanner` (camera).

### API client + state

- Add `friends` methods to the API client.
- React Query keys: `['friends']`; invalidate on redeem / unfriend.

## Testing

Bun native test runner (`bun:test`) throughout.

- **API (90% coverage threshold):**
  - `FriendService` — generate, redeem guard matrix (expired, used, self, already
    friends, happy path), list, unfriend.
  - `MongoFriendRepository`.
  - `ListService.addUserToList` — friend-validation (allow friend, reject non-friend).
  - `TodoService` — share validation + `getTodos` owner-or-shared filter.
- **Web:**
  - `FriendPicker` — search/filter, single & multi select.
  - `FriendsPage` — generate-code and redeem (text + scan) flows.

## Out of Scope

- Friend requests / accept step (pairing is instant on redeem).
- Storing the friend graph in kivo / cross-app friend reuse.
- Migration of existing shared lists (recreated manually).
- Friend profiles, avatars, blocking.
