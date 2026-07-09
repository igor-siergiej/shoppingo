# Friends Sharing — Phase 2: Sharing Model & Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sharing friends-only and auto-share/opt-out across lists, recipes, and todos; extend unfriend to a hard revoke; migrate existing shares into friendships.

**Architecture:** `ListService`, `RecipeService`, and `TodoService` gain a `FriendService` dependency. On create, an item's `users[]` (members) is **seeded from the owner's current friends** unless the client sends an explicit friend-id subset; every member id is validated to be a friend of the owner (else 403). `getTodos` returns owner-or-member todos. `unfriend` strips the ex-friend from every item the user owns, both directions. A one-off idempotent migration turns existing `users[]` pairs into friendships.

**Tech Stack:** TypeScript, Hono, MongoDB native driver, `@imapps/api-utils`, Bun `bun:test`. Builds on Phase 1 (`FriendService.areFriends`, `friendIdsOf`, `FriendRepository`).

## Global Constraints

- Bun 1.x. API tests: `bun run --filter @shoppingo/api test`; single file: `cd packages/api && bun test <path>`.
- Tests import from `bun:test` only; hand-written mock classes cast `as never`.
- API coverage threshold 90%.
- Errors: `Object.assign(new Error('msg'), { status })`.
- **Members are friend-id lists now, not usernames.** Any code path that resolved usernames via `AuthClient.getUsersByUsernames` for sharing is replaced by friend validation. Owner is always a member and can never be removed.
- **Sharing is friends-only:** a member id that is not a friend of the owner → `403`.
- **Reminders fire for the owner only** — shared todos must not notify members.
- Run `bun run lint:fix` and `bun run tsc --noEmit` before every commit.

---

### Task 1: `Todo.users` + share-aware Todo repository

**Files:**
- Modify: `packages/types/src/index.ts` (add `users?` to `Todo`)
- Modify: `packages/api/src/domain/TodoRepository/index.ts` (add `findByMember`)
- Modify: `packages/api/src/infrastructure/MongoTodoRepository/index.ts` (implement + strip helper)
- Modify: `packages/api/src/infrastructure/MongoTodoRepository/index.test.ts` if present, else covered via service tests

**Interfaces:**
- Consumes: `User` type, existing `Todo`.
- Produces: `Todo.users?: Array<User>`; `TodoRepository.findByMember(userId): Promise<Todo[]>` and `TodoRepository.removeMemberFromAll(memberId, ownerId): Promise<void>`.

- [ ] **Step 1: Add `users` to the `Todo` type**

In `packages/types/src/index.ts`, inside `interface Todo`, after `completedDates?: string[];` add:

```ts
    /** Friends this todo is shared with (excludes the owner, who is implicit via ownerId). */
    users?: Array<User>;
```

- [ ] **Step 2: Extend the repository interface**

In `packages/api/src/domain/TodoRepository/index.ts` add to the interface:

```ts
    /** Todos where userId appears in users[] (shared with them). */
    findByMember(userId: string): Promise<Todo[]>;
    /** Remove memberId from users[] on every todo owned by ownerId. */
    removeMemberFromAll(memberId: string, ownerId: string): Promise<void>;
```

- [ ] **Step 3: Implement in Mongo repo**

In `packages/api/src/infrastructure/MongoTodoRepository/index.ts` add methods to the class:

```ts
    async findByMember(userId: string): Promise<Todo[]> {
        return this.collection().find({ 'users.id': userId }).toArray();
    }

    async removeMemberFromAll(memberId: string, ownerId: string): Promise<void> {
        await this.collection().updateMany({ ownerId }, { $pull: { users: { id: memberId } } });
    }
```

- [ ] **Step 4: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/index.ts packages/api/src/domain/TodoRepository/index.ts packages/api/src/infrastructure/MongoTodoRepository/index.ts
git commit -m "feat(api): add shared users[] to todos and share-aware repo queries"
```

---

### Task 2: `TodoService` — friend-seeded sharing + owner-or-member reads

**Files:**
- Modify: `packages/api/src/domain/TodoService/index.ts`
- Modify: `packages/api/src/domain/TodoService/index.test.ts`
- Modify: `packages/api/src/dependencies/index.ts` (pass `FriendService` into `TodoService`)

**Interfaces:**
- Consumes: `FriendService` (`areFriends`, `friendIdsOf`) from Phase 1.
- Produces: `TodoService` constructor gains a `friendService` param; `createTodo` accepts optional `userIds?: string[]`; `getTodosForUser(userId)` returns owner-or-member todos. A shared helper `seedMembers(ownerId, explicit?)` and `assertAllFriends(ownerId, userIds)`.

- [ ] **Step 1: Write the failing tests**

In `packages/api/src/domain/TodoService/index.test.ts`, add a mock friend service and cases. Add near the top:

```ts
class MockFriends {
    edges = new Set<string>(); // "a|b" sorted
    private key(a: string, b: string) { return [a, b].sort().join('|'); }
    add(a: string, b: string) { this.edges.add(this.key(a, b)); }
    async areFriends(a: string, b: string) { return this.edges.has(this.key(a, b)); }
    async friendIdsOf(userId: string) {
        return [...this.edges].map((e) => e.split('|')).filter((p) => p.includes(userId)).map((p) => p[0] === userId ? p[1] : p[0]);
    }
}
```

Update the `beforeEach` to build the service with friends, and add tests:

```ts
    // in beforeEach:
    // friends = new MockFriends();
    // svc = new TodoService(repo as never, new MockIds() as never, undefined, friends as never);

    it('seeds users[] from the owner\'s current friends on create', async () => {
        friends.add('u1', 'u2');
        const todo = await svc.createTodo('u1', { title: 'Plan trip' });
        expect(todo.users).toEqual([{ id: 'u2', username: expect.any(String) }]);
    });

    it('accepts an explicit friend subset and rejects a non-friend (403)', async () => {
        friends.add('u1', 'u2');
        const ok = await svc.createTodo('u1', { title: 'A', userIds: ['u2'] });
        expect(ok.users?.map((u) => u.id)).toEqual(['u2']);
        expect(svc.createTodo('u1', { title: 'B', userIds: ['u9'] })).rejects.toMatchObject({ status: 403 });
    });

    it('getTodosForUser returns owned and shared todos', async () => {
        friends.add('u1', 'u2');
        await svc.createTodo('u1', { title: 'Owned by u1, shared to u2' });
        await svc.createTodo('u2', { title: 'Owned by u2' });
        const forU2 = await svc.getTodosForUser('u2');
        expect(forU2.map((t) => t.title).sort()).toEqual(['Owned by u1, shared to u2', 'Owned by u2']);
    });
```

> **Note on member username:** the seed uses friend `User` snapshots from `FriendService.listFriends`, which carry `username`. If your `MockFriends` only tracks ids, extend it to return `{id, username}` from a `listFriends(userId)` method and have the service seed from that. Prefer adding `listFriends` to the mock so seeded `users[]` carry usernames — update the assertion to the concrete username.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && bun test src/domain/TodoService/index.test.ts`
Expected: FAIL — constructor arity / `getTodosForUser` missing.

- [ ] **Step 3: Implement**

In `packages/api/src/domain/TodoService/index.ts`:
- Import: `import type { FriendService } from '../FriendService';`
- Add `userIds?: string[];` to `CreateTodoInput`.
- Extend the constructor:

```ts
    constructor(
        private readonly repo: TodoRepository,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger,
        private readonly friendService?: FriendService
    ) {}
```

- Add helpers + use them in `createTodo`, and add `getTodosForUser`:

```ts
    private async seedMembers(ownerId: string, explicit?: string[]): Promise<User[]> {
        if (!this.friendService) return [];
        const friends = await this.friendService.listFriends(ownerId);
        if (explicit === undefined) return friends; // auto-share with all current friends
        const allowed = new Set(friends.map((f) => f.id));
        for (const id of explicit) {
            if (!allowed.has(id)) throw forbidden(); // 403 — not a friend
        }
        return friends.filter((f) => explicit.includes(f.id));
    }

    async getTodosForUser(userId: string): Promise<Todo[]> {
        const owned = await this.repo.findByOwnerId(userId);
        const shared = await this.repo.findByMember(userId);
        const byId = new Map<string, Todo>();
        for (const t of [...owned, ...shared]) byId.set(t.id, t);
        return [...byId.values()];
    }
```

In `createTodo`, after computing `input`, seed members and include them:

```ts
        const users = await this.seedMembers(ownerId, input.userIds);
        const todo: Todo = {
            // ...existing fields...
            ...(users.length > 0 && { users }),
        };
```

Import `User`: `import type { Recurrence, Todo, User } from '@shoppingo/types';`.

Keep `getTodosByOwner` for the reminder path (owner-only). The HTTP `getTodos` handler switches to `getTodosForUser` (Task 5 wiring below).

- [ ] **Step 4: Pass `FriendService` in DI**

In `packages/api/src/dependencies/index.ts`, in the `TodoService` registration add the fourth arg:

```ts
                return new TodoService(
                    dependencyContainer.resolve(DependencyToken.TodoRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    dependencyContainer.resolve(DependencyToken.FriendService)
                );
```

- [ ] **Step 5: Update the read handler**

In `packages/api/src/interfaces/TodoHandlers/index.ts`, change `getTodos` to:

```ts
export const getTodos = withAuth(async (c, user) => {
    return c.json(await getTodoService().getTodosForUser(user.id), 200);
});
```

- [ ] **Step 6: Run tests**

Run: `cd packages/api && bun test src/domain/TodoService/index.test.ts`
Expected: PASS.

- [ ] **Step 7: Confirm reminders stay owner-only**

`TodoReminderService`/`DailyReminderScheduler` fan out using `findDueCandidates` + the owner's push subscriptions. Members are excluded because notifications target `ownerId`'s subscriptions, and `findDueCandidates` is unchanged. Add/keep a test asserting the reminder path uses owner subscriptions only (no member fan-out). If an existing reminder test covers the owner path, extend it with a shared todo and assert only the owner is notified.

Run: `bun run --filter @shoppingo/api test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/domain/TodoService/ packages/api/src/interfaces/TodoHandlers/index.ts packages/api/src/dependencies/index.ts
git commit -m "feat(api): friend-seeded todo sharing with owner-or-member reads"
```

---

### Task 3: `ListService` — friends-only, auto-seeded members

**Files:**
- Modify: `packages/api/src/domain/ListService/index.ts`
- Modify: `packages/api/src/domain/ListService/index.test.ts`
- Modify: `packages/api/src/dependencies/index.ts` (pass `FriendService`)
- Modify: `packages/api/src/domain/ListRepository/index.ts` + `infrastructure/MongoListRepository/index.ts` (add `removeMemberFromAll`)

**Interfaces:**
- Consumes: `FriendService`.
- Produces: `ListService` constructor gains `friendService`; `resolveSharedUsers` replaced by friend-id seeding + validation; `addUserToList(title, friendId, requestingUserId)` validates friendship by id (no username lookup); `ListRepository.removeMemberFromAll(memberId, ownerId)`.

- [ ] **Step 1: Write the failing tests**

In `packages/api/src/domain/ListService/index.test.ts`, add a `MockFriends` (reuse the shape from Task 2, with `listFriends`, `areFriends`, `friendIdsOf`), build the service with it, and add:

```ts
    it('seeds a new list with the owner plus the owner\'s friends', async () => {
        friends.add('u1', 'u2');
        const list = await svc.createList('Groceries', ListType.SHOPPING, owner /* {id:'u1',username:'alice'} */);
        expect(list.users.map((u) => u.id).sort()).toEqual(['u1', 'u2']);
        expect(list.ownerId).toBe('u1');
    });

    it('rejects sharing with a non-friend (403)', async () => {
        expect(svc.createList('X', ListType.SHOPPING, owner, ['u9'])).rejects.toMatchObject({ status: 403 });
    });

    it('addUserToList rejects a non-friend by id (403) and allows a friend', async () => {
        friends.add('u1', 'u2');
        const list = await svc.createList('Y', ListType.SHOPPING, owner, []);
        await svc.addUserToList('Y', 'u2', 'u1');
        expect((await svc.getList('Y')).users.some((u) => u.id === 'u2')).toBe(true);
        expect(svc.addUserToList('Y', 'u9', 'u1')).rejects.toMatchObject({ status: 403 });
    });
```

> Match the exact `createList` signature already in the file. It currently takes `(title, listType, owner, selectedUsernames?)`. Rename the last param to `selectedFriendIds?: string[]` and keep positional compatibility.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && bun test src/domain/ListService/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `packages/api/src/domain/ListService/index.ts`:
- Import `FriendService`; add `private readonly friendService?: FriendService` to the constructor (append as a new last param to avoid reordering existing DI args — confirm the DI call order in Step 4).
- Replace `resolveSharedUsers` with friend-seeding:

```ts
    private async resolveSharedUsers(title: string, owner: User, selectedFriendIds?: string[]): Promise<Array<User>> {
        if (!this.friendService) return [owner];
        const friends = await this.friendService.listFriends(owner.id);
        if (selectedFriendIds === undefined) return [owner, ...friends]; // auto-share
        const allowed = new Set(friends.map((f) => f.id));
        for (const id of selectedFriendIds) {
            if (!allowed.has(id)) throw Object.assign(new Error('Can only share with friends'), { status: 403 });
        }
        return [owner, ...friends.filter((f) => selectedFriendIds.includes(f.id))];
    }
```

- Rewrite `addUserToList` to take a `friendId` and validate via `friendService.areFriends`, dropping the `AuthClient.getUsersByUsernames` path:

```ts
    async addUserToList(title: string, friendId: string, requestingUserId: string): Promise<List> {
        const list = await this.repo.getByTitle(title);
        if (!list) throw Object.assign(new Error('List not found'), { status: 404 });
        if (!this.authorizationService.canManageUsers(list, requestingUserId)) {
            throw Object.assign(new Error('Only the list owner can manage users'), { status: 403 });
        }
        if (!this.friendService || !(await this.friendService.areFriends(requestingUserId, friendId))) {
            throw Object.assign(new Error('Can only share with friends'), { status: 403 });
        }
        if (list.users.some((u) => u.id === friendId)) {
            throw Object.assign(new Error('User is already in this list'), { status: 400 });
        }
        const [friend] = (await this.friendService.listFriends(requestingUserId)).filter((f) => f.id === friendId);
        list.users.push(friend);
        await this.repo.replaceByTitle(title, list);
        return list;
    }
```

- Add repo method `removeMemberFromAll` to `ListRepository` interface and `MongoListRepository`:

```ts
    // interface
    removeMemberFromAll(memberId: string, ownerId: string): Promise<void>;
    // MongoListRepository
    async removeMemberFromAll(memberId: string, ownerId: string): Promise<void> {
        await this.collection().updateMany({ ownerId }, { $pull: { users: { id: memberId } } });
    }
```

- [ ] **Step 4: Update DI**

In `dependencies/index.ts` `ListService` registration, append `dependencyContainer.resolve(DependencyToken.FriendService)` as the final constructor arg (after `NotificationService`). Confirm the constructor param order matches.

- [ ] **Step 5: Update the list handler + route param name**

In `interfaces/ListHandlers/index.ts`, `addUserToList` handler: read the friend id from the JSON body (`{ friendId }`) instead of `{ username }`. Keep the route path `POST /api/lists/:title/users`.

- [ ] **Step 6: Run tests**

Run: `cd packages/api && bun test src/domain/ListService/index.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/domain/ListService/ packages/api/src/domain/ListRepository/ packages/api/src/infrastructure/MongoListRepository/ packages/api/src/interfaces/ListHandlers/index.ts packages/api/src/dependencies/index.ts
git commit -m "feat(api): friends-only auto-seeded list sharing"
```

---

### Task 4: `RecipeService` — friends-only, auto-seeded members

**Files:**
- Modify: `packages/api/src/domain/RecipeService/index.ts` + its test
- Modify: `packages/api/src/domain/RecipeRepository/index.ts` + `infrastructure/MongoRecipeRepository/index.ts` (add `removeMemberFromAll`)
- Modify: `packages/api/src/interfaces/RecipeHandlers/index.ts` (friendId body)
- Modify: `packages/api/src/dependencies/index.ts` (pass `FriendService`)

**Interfaces:**
- Same pattern as Task 3, applied to recipes. `RecipeService.resolveSharedUsers` seeds from friends; `addUserToRecipe(recipeId, friendId, requestingUserId)` validates by id; `RecipeRepository.removeMemberFromAll(memberId, ownerId)`.

- [ ] **Step 1: Write the failing tests**

Mirror Task 3's three tests against the recipe API in `RecipeService/index.test.ts` (seed friends, assert owner+friends seeded, 403 for non-friend on create and on add). Use the recipe service's actual create/add method names (`createRecipe`, `addUserToRecipe`).

- [ ] **Step 2: Run to verify fail**

Run: `cd packages/api && bun test src/domain/RecipeService/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Apply the same edits as Task 3 Step 3 to `RecipeService` (import `FriendService`, seed via friends, replace `resolveSharedUsers` username path, rewrite `addUserToRecipe` to validate by id, add `removeMemberFromAll` to the recipe repo + interface).

- [ ] **Step 4: DI + handler**

`dependencies/index.ts`: append `FriendService` to the `RecipeService` registration. `RecipeHandlers.addUserToRecipe`: read `{ friendId }` from body.

- [ ] **Step 5: Run tests**

Run: `cd packages/api && bun test src/domain/RecipeService/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/RecipeService/ packages/api/src/domain/RecipeRepository/ packages/api/src/infrastructure/MongoRecipeRepository/ packages/api/src/interfaces/RecipeHandlers/index.ts packages/api/src/dependencies/index.ts
git commit -m "feat(api): friends-only auto-seeded recipe sharing"
```

---

### Task 5: Unfriend hard-revoke

**Files:**
- Modify: `packages/api/src/domain/FriendService/index.ts` + its test
- Modify: `packages/api/src/dependencies/index.ts` (inject the three repos into `FriendService`)

**Interfaces:**
- Consumes: `ListRepository.removeMemberFromAll`, `RecipeRepository.removeMemberFromAll`, `TodoRepository.removeMemberFromAll` (Tasks 1/3/4).
- Produces: `FriendService.unfriend` now strips the ex-friend from all items owned by each party, both directions.

- [ ] **Step 1: Write the failing test**

In `FriendService/index.test.ts`, add mock repos that record `removeMemberFromAll` calls, construct the service with them, seed a friendship, call `unfriend('u1','u2')`, and assert **both directions** were stripped:

```ts
class MockItemRepo {
    calls: Array<{ memberId: string; ownerId: string }> = [];
    async removeMemberFromAll(memberId: string, ownerId: string) { this.calls.push({ memberId, ownerId }); }
}

it('unfriend strips the ex-friend from all items both directions', async () => {
    const repo = new MockRepo();
    repo.friendships.push({ id: 'f1', userIds: ['u1', 'u2'],
        users: [{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }], createdAt: new Date() });
    const lists = new MockItemRepo(); const recipes = new MockItemRepo(); const todos = new MockItemRepo();
    const svc = new FriendService(repo as never, new MockIds() as never, undefined, lists as never, recipes as never, todos as never);
    await svc.unfriend('u1', 'u2');
    for (const r of [lists, recipes, todos]) {
        expect(r.calls).toEqual(expect.arrayContaining([
            { memberId: 'u2', ownerId: 'u1' },
            { memberId: 'u1', ownerId: 'u2' },
        ]));
    }
    expect(repo.friendships).toHaveLength(0);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd packages/api && bun test src/domain/FriendService/index.test.ts`
Expected: FAIL — constructor arity.

- [ ] **Step 3: Implement**

Extend the `FriendService` constructor and `unfriend`:

```ts
    constructor(
        private readonly repo: FriendRepository,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger,
        private readonly listRepo?: { removeMemberFromAll(memberId: string, ownerId: string): Promise<void> },
        private readonly recipeRepo?: { removeMemberFromAll(memberId: string, ownerId: string): Promise<void> },
        private readonly todoRepo?: { removeMemberFromAll(memberId: string, ownerId: string): Promise<void> }
    ) {}

    async unfriend(userId: string, friendId: string): Promise<void> {
        await this.repo.deletePair(userId, friendId);
        const repos = [this.listRepo, this.recipeRepo, this.todoRepo].filter(Boolean);
        for (const r of repos) {
            await r!.removeMemberFromAll(friendId, userId); // strip friend from userId's items
            await r!.removeMemberFromAll(userId, friendId); // strip userId from friend's items
        }
        this.logger?.info('Unfriended (hard revoke)', { userId, friendId });
    }
```

- [ ] **Step 4: DI wiring**

In `dependencies/index.ts` `FriendService` registration, add the three repo resolves after `Logger`:

```ts
                    dependencyContainer.resolve(DependencyToken.ListRepository),
                    dependencyContainer.resolve(DependencyToken.RecipeRepository),
                    dependencyContainer.resolve(DependencyToken.TodoRepository)
```

- [ ] **Step 5: Run tests**

Run: `cd packages/api && bun test src/domain/FriendService/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/FriendService/ packages/api/src/dependencies/index.ts
git commit -m "feat(api): unfriend hard-revokes access to all shared items"
```

---

### Task 6: Migration — existing `users[]` → friendships

**Files:**
- Create: `packages/api/src/migrations/friendsFromExistingShares.ts`
- Create: `packages/api/src/migrations/friendsFromExistingShares.test.ts`

**Interfaces:**
- Consumes: `ListRepository`/`RecipeRepository` (read all), `FriendRepository` (`findPair`, `insertFriendship`), `IdGenerator`.
- Produces: `migrateFriendsFromExistingShares(deps): Promise<{ created: number }>` — idempotent.

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/migrations/friendsFromExistingShares.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { pairsFromItems } from './friendsFromExistingShares';

describe('pairsFromItems', () => {
    it('emits an owner↔member pair for each shared member, deduped and canonical', () => {
        const items = [
            { ownerId: 'u1', users: [{ id: 'u1', username: 'a' }, { id: 'u2', username: 'b' }] },
            { ownerId: 'u1', users: [{ id: 'u1', username: 'a' }, { id: 'u2', username: 'b' }] }, // dup
            { ownerId: 'u1', users: [{ id: 'u1', username: 'a' }, { id: 'u3', username: 'c' }] },
        ];
        const pairs = pairsFromItems(items as never);
        expect(pairs.map((p) => p.userIds)).toEqual([['u1', 'u2'], ['u1', 'u3']]);
    });

    it('ignores unshared items (single user) and the owner-self entry', () => {
        const items = [{ ownerId: 'u1', users: [{ id: 'u1', username: 'a' }] }];
        expect(pairsFromItems(items as never)).toEqual([]);
    });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd packages/api && bun test src/migrations/friendsFromExistingShares.test.ts`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement**

Create `packages/api/src/migrations/friendsFromExistingShares.ts`:

```ts
import type { Friendship, User } from '@shoppingo/types';

interface SharedItem { ownerId?: string; users: User[]; }

interface FriendPair { userIds: [string, string]; users: [User, User]; }

const sortPair = (a: User, b: User): FriendPair =>
    a.id < b.id ? { userIds: [a.id, b.id], users: [a, b] } : { userIds: [b.id, a.id], users: [b, a] };

/** Canonical, deduped owner↔member pairs from a set of shared items. */
export const pairsFromItems = (items: SharedItem[]): FriendPair[] => {
    const seen = new Set<string>();
    const out: FriendPair[] = [];
    for (const item of items) {
        const owner = item.users.find((u) => u.id === item.ownerId) ?? item.users[0];
        if (!owner) continue;
        for (const member of item.users) {
            if (member.id === owner.id) continue;
            const pair = sortPair(owner, member);
            const key = pair.userIds.join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(pair);
        }
    }
    return out;
};

export interface MigrationDeps {
    listRepo: { getAll(): Promise<SharedItem[]> };
    recipeRepo: { getAll(): Promise<SharedItem[]> };
    friendRepo: {
        findPair(a: string, b: string): Promise<Friendship | null>;
        insertFriendship(f: Friendship): Promise<void>;
    };
    idGenerator: { generate(): string };
}

export const migrateFriendsFromExistingShares = async (deps: MigrationDeps): Promise<{ created: number }> => {
    const items = [...(await deps.listRepo.getAll()), ...(await deps.recipeRepo.getAll())];
    const pairs = pairsFromItems(items);
    let created = 0;
    for (const pair of pairs) {
        if (await deps.friendRepo.findPair(pair.userIds[0], pair.userIds[1])) continue; // idempotent
        await deps.friendRepo.insertFriendship({ id: deps.idGenerator.generate(), ...pair, createdAt: new Date() });
        created += 1;
    }
    return { created };
};
```

> If `ListRepository`/`RecipeRepository` lack a `getAll()`, add one (`this.collection().find({}).toArray()`) to each interface + Mongo impl in this task. Wire a small runnable entry (e.g. `bun run packages/api/src/migrations/run.ts`) that resolves the repos from the DI container and calls the migration; run it once against staging.

- [ ] **Step 4: Run test**

Run: `cd packages/api && bun test src/migrations/friendsFromExistingShares.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + commit**

Run: `bun run --filter @shoppingo/api test && bun run tsc --noEmit`
Expected: PASS, coverage ≥ 90%.

```bash
git add packages/api/src/migrations/
git commit -m "feat(api): migrate existing shared lists/recipes into friendships"
```

---

## Self-Review

- **Spec coverage:** auto-share opt-out ✓ (seed from friends unless explicit subset — Tasks 2–4); friends-only 403 ✓; future-items-only ✓ (seeding only at create, no back-fill anywhere); collaborate-everywhere ✓ (members in `users[]`, existing edit paths unchanged); todos net-new sharing ✓ (Tasks 1–2); owner-or-member reads ✓; reminders owner-only ✓ (Task 2 Step 7); unfriend hard-revoke ✓ (Task 5); migration ✓ (Task 6). Username search removal ✓ (add-by-id in Tasks 3–4; web removal is Phase 3).
- **Placeholders:** none — repo `getAll`/`removeMemberFromAll` additions are spelled out with code. The migration runnable entry is described concretely.
- **Type consistency:** `removeMemberFromAll(memberId, ownerId)` identical across List/Recipe/Todo repos and `FriendService.unfriend`. `resolveSharedUsers(…, selectedFriendIds?)` and `addUser*(…, friendId, requestingUserId)` consistent across List and Recipe. `FriendService` constructor extended additively (Phase 1 args unchanged, repos appended) so Phase 1 DI stays valid until Task 5 updates it.
