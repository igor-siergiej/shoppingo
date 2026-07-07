# Friends Sharing — Phase 1: Friends Backend & Code Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working friends graph in the shoppingo API — mint a one-time code, redeem it to form a mutual friendship, list friends, unfriend — behind authentication.

**Architecture:** Follows the existing clean-architecture split: shared types in `packages/types`, a `FriendRepository` interface in `domain/` with a `MongoFriendRepository` in `infrastructure/`, business logic in `domain/FriendService`, HTTP glue in `interfaces/FriendHandlers` + `routes`, wired through the DI container. Two Mongo collections: `friendships` (one canonical doc per pair) and `pairingCodes` (ephemeral, TTL-indexed).

**Tech Stack:** TypeScript, Hono, MongoDB native driver, `@imapps/api-utils` (Logger, MongoDbConnection, IdGenerator), Bun native test runner (`bun:test`).

## Global Constraints

- Package manager is **Bun 1.x**. Run API tests with `bun run --filter @shoppingo/api test`; a single file with `cd packages/api && bun test <path>`.
- Tests import from **`bun:test` only**. Service tests use hand-written mock classes cast `as never` (see `domain/TodoService/index.test.ts`), never a mocking library.
- API coverage threshold is **90%**.
- All routes authenticate via the `authenticate` middleware; handlers wrap logic in `withAuth` from `interfaces/handlerUtils` (gives `(c, user)` where `user = { id, username }`).
- Errors are plain `Error`s with an attached `status`: `Object.assign(new Error('msg'), { status: 4xx })`.
- Domain services take dependencies via constructor; register them in `dependencies/index.ts` with the `// @ts-expect-error` constructor-return factory pattern.
- Run `bun run lint:fix` and `bun run tsc --noEmit` before every commit.

---

### Task 1: Shared types — `Friendship` and `PairingCode`

**Files:**
- Modify: `packages/types/src/index.ts` (append near the other interfaces)

**Interfaces:**
- Consumes: existing `User` (`{ id: string; username: string }`).
- Produces: `Friendship`, `PairingCode` types imported as `@shoppingo/types` throughout later tasks. `Todo.users` is added in Phase 2, not here.

- [ ] **Step 1: Add the types**

In `packages/types/src/index.ts`, after the `User` interface, add:

```ts
export interface Friendship {
    id: string;
    /** Canonical sorted pair key — userIds[0] < userIds[1] lexicographically. */
    userIds: [string, string];
    /** {id, username} snapshots for display without a kivo roundtrip. */
    users: [User, User];
    createdAt: Date;
}

export interface PairingCode {
    code: string;
    creatorId: string;
    creatorUsername: string;
    /** createdAt + 15 minutes. */
    expiresAt: Date;
    /** Set when redeemed — enforces single use. */
    usedAt?: Date;
}
```

- [ ] **Step 2: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add Friendship and PairingCode types"
```

---

### Task 2: DI tokens, collection names, and the `FriendRepository` interface

**Files:**
- Create: `packages/api/src/domain/FriendRepository/index.ts`
- Modify: `packages/api/src/dependencies/types.ts` (add collection names, `Collections` entries, `DependencyToken` entries, import)

**Interfaces:**
- Consumes: `Friendship`, `PairingCode` from Task 1.
- Produces: the `FriendRepository` interface (method signatures below) — implemented in Task 3, consumed by Task 4. Two new `DependencyToken`s: `FriendRepository`, `FriendService`. Two new `CollectionNames`: `Friendship`, `PairingCode`.

- [ ] **Step 1: Write the repository interface**

Create `packages/api/src/domain/FriendRepository/index.ts`:

```ts
import type { Friendship, PairingCode } from '@shoppingo/types';

export interface FriendRepository {
    // pairing codes
    insertCode(code: PairingCode): Promise<void>;
    getCode(code: string): Promise<PairingCode | null>;
    markCodeUsed(code: string, usedAt: Date): Promise<void>;

    // friendships
    insertFriendship(friendship: Friendship): Promise<void>;
    /** All friendships that include userId. */
    findByUserId(userId: string): Promise<Friendship[]>;
    /** The single doc for a canonical pair, or null. */
    findPair(userIdA: string, userIdB: string): Promise<Friendship | null>;
    deletePair(userIdA: string, userIdB: string): Promise<void>;
}
```

- [ ] **Step 2: Register collection names and DI tokens**

In `packages/api/src/dependencies/types.ts`:
- Add to the `import type { ... } from '@shoppingo/types'` line: `Friendship`, `PairingCode`.
- Add `import type { FriendRepository } from '../domain/FriendRepository';` and `import type { FriendService } from '../domain/FriendService';` with the other domain imports.
- In the `CollectionNames` enum add:

```ts
    Friendship = 'friendships',
    PairingCode = 'pairingCodes',
```

- In the `Collections` type add:

```ts
    [CollectionNames.Friendship]: Friendship;
    [CollectionNames.PairingCode]: PairingCode;
```

- In the `DependencyToken` enum add:

```ts
    FriendRepository = 'FriendRepository',
    FriendService = 'FriendService',
```

- [ ] **Step 3: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS. (`FriendService` import resolves once Task 4 creates it; if you implement tasks in order, temporarily comment the `FriendService` import + token until Task 4, then restore. Prefer implementing Task 4's file before this type-check.)

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/domain/FriendRepository/index.ts packages/api/src/dependencies/types.ts
git commit -m "feat(api): add FriendRepository interface and DI tokens"
```

---

### Task 3: `MongoFriendRepository`

**Files:**
- Create: `packages/api/src/infrastructure/MongoFriendRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoFriendRepository/index.test.ts`

**Interfaces:**
- Consumes: `FriendRepository` (Task 2), `MongoDbConnection` + `CollectionNames`/`Collections`.
- Produces: `MongoFriendRepository` class; a static/exported `canonicalPair(a, b): [string, string]` helper reused by the service.

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/infrastructure/MongoFriendRepository/index.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { canonicalPair } from './index';

describe('canonicalPair', () => {
    it('sorts the two ids lexicographically regardless of argument order', () => {
        expect(canonicalPair('zeb', 'amy')).toEqual(['amy', 'zeb']);
        expect(canonicalPair('amy', 'zeb')).toEqual(['amy', 'zeb']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/infrastructure/MongoFriendRepository/index.test.ts`
Expected: FAIL — `canonicalPair` not exported.

- [ ] **Step 3: Implement the repository**

Create `packages/api/src/infrastructure/MongoFriendRepository/index.ts`:

```ts
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Friendship, PairingCode } from '@shoppingo/types';

import { type Collections, CollectionNames } from '../../dependencies/types';
import type { FriendRepository } from '../../domain/FriendRepository';

/** Lexicographically-sorted pair so a friendship has one canonical row. */
export const canonicalPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export class MongoFriendRepository implements FriendRepository {
    constructor(private readonly db: MongoDbConnection<Collections>) {}

    private friendships() {
        return this.db.getCollection(CollectionNames.Friendship);
    }

    private codes() {
        return this.db.getCollection(CollectionNames.PairingCode);
    }

    async insertCode(code: PairingCode): Promise<void> {
        await this.codes().insertOne(code);
    }

    async getCode(code: string): Promise<PairingCode | null> {
        return this.codes().findOne({ code });
    }

    async markCodeUsed(code: string, usedAt: Date): Promise<void> {
        await this.codes().updateOne({ code }, { $set: { usedAt } });
    }

    async insertFriendship(friendship: Friendship): Promise<void> {
        await this.friendships().insertOne(friendship);
    }

    async findByUserId(userId: string): Promise<Friendship[]> {
        return this.friendships().find({ userIds: userId }).toArray();
    }

    async findPair(userIdA: string, userIdB: string): Promise<Friendship | null> {
        const userIds = canonicalPair(userIdA, userIdB);
        return this.friendships().findOne({ userIds });
    }

    async deletePair(userIdA: string, userIdB: string): Promise<void> {
        const userIds = canonicalPair(userIdA, userIdB);
        await this.friendships().deleteOne({ userIds });
    }
}
```

> **TTL index:** `pairingCodes` gets a Mongo TTL index on `expiresAt` so expired codes self-delete. `@imapps/api-utils`' `MongoDbConnection` creates indexes at init the same way other collections do — add `expiresAt` with `expireAfterSeconds: 0` to the shoppingo index bootstrap. If there is no central index bootstrap, create the index in the repo constructor via `this.codes().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })` (fire-and-forget, wrapped in `void`). Match whatever the repo already does for indexes; if none, use the constructor approach.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/infrastructure/MongoFriendRepository/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/infrastructure/MongoFriendRepository/
git commit -m "feat(api): add MongoFriendRepository with canonical pair key"
```

---

### Task 4: `FriendService` — generate, redeem, list, unfriend

**Files:**
- Create: `packages/api/src/domain/FriendService/index.ts`
- Create: `packages/api/src/domain/FriendService/index.test.ts`

**Interfaces:**
- Consumes: `FriendRepository` (Task 2), `IdGenerator` (`generate(): string`), optional `Logger`.
- Produces: `FriendService` with:
  - `generateCode(creatorId: string, creatorUsername: string): Promise<{ code: string; expiresAt: Date }>`
  - `redeem(code: string, requesterId: string, requesterUsername: string): Promise<User>` (the new friend)
  - `listFriends(userId: string): Promise<User[]>`
  - `unfriend(userId: string, friendId: string): Promise<void>`
  - `areFriends(userIdA: string, userIdB: string): Promise<boolean>` and `friendIdsOf(userId: string): Promise<string[]>` — **consumed by Phase 2** for share validation/seeding.

- [ ] **Step 1: Write the failing tests**

Create `packages/api/src/domain/FriendService/index.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import type { Friendship, PairingCode } from '@shoppingo/types';
import { FriendService } from './index';

class MockRepo {
    codes = new Map<string, PairingCode>();
    friendships: Friendship[] = [];
    async insertCode(c: PairingCode) { this.codes.set(c.code, c); }
    async getCode(code: string) { return this.codes.get(code) ?? null; }
    async markCodeUsed(code: string, usedAt: Date) {
        const c = this.codes.get(code); if (c) c.usedAt = usedAt;
    }
    async insertFriendship(f: Friendship) { this.friendships.push(f); }
    async findByUserId(userId: string) { return this.friendships.filter((f) => f.userIds.includes(userId)); }
    async findPair(a: string, b: string) {
        const key = [a, b].sort();
        return this.friendships.find((f) => f.userIds[0] === key[0] && f.userIds[1] === key[1]) ?? null;
    }
    async deletePair(a: string, b: string) {
        const key = [a, b].sort();
        this.friendships = this.friendships.filter((f) => !(f.userIds[0] === key[0] && f.userIds[1] === key[1]));
    }
}

class MockIds {
    private n = 0;
    generate() { this.n += 1; return `id-${this.n}`; }
}

const svcWith = (repo: MockRepo) => new FriendService(repo as never, new MockIds() as never);

describe('FriendService.generateCode', () => {
    it('creates a single-use code with a 15-minute expiry', async () => {
        const repo = new MockRepo();
        const before = Date.now();
        const { code, expiresAt } = await svcWith(repo).generateCode('u1', 'alice');
        expect(code).toMatch(/^[A-Z2-9]{6}$/); // readable charset, no 0/O/1/I
        const stored = repo.codes.get(code)!;
        expect(stored.creatorId).toBe('u1');
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000 - 1000);
    });
});

describe('FriendService.redeem', () => {
    const seedCode = (repo: MockRepo, over: Partial<PairingCode> = {}) => {
        const c: PairingCode = {
            code: 'ABC234', creatorId: 'u1', creatorUsername: 'alice',
            expiresAt: new Date(Date.now() + 60_000), ...over,
        };
        repo.codes.set(c.code, c);
        return c;
    };

    it('forms a mutual friendship and returns the new friend', async () => {
        const repo = new MockRepo(); seedCode(repo);
        const friend = await svcWith(repo).redeem('ABC234', 'u2', 'bob');
        expect(friend).toEqual({ id: 'u1', username: 'alice' });
        expect(repo.friendships).toHaveLength(1);
        expect(repo.codes.get('ABC234')!.usedAt).toBeInstanceOf(Date);
    });

    it('404 when the code does not exist', async () => {
        const repo = new MockRepo();
        expect(svcWith(repo).redeem('NOPE22', 'u2', 'bob')).rejects.toMatchObject({ status: 404 });
    });

    it('410 when the code is expired', async () => {
        const repo = new MockRepo(); seedCode(repo, { expiresAt: new Date(Date.now() - 1000) });
        expect(svcWith(repo).redeem('ABC234', 'u2', 'bob')).rejects.toMatchObject({ status: 410 });
    });

    it('409 when the code was already used', async () => {
        const repo = new MockRepo(); seedCode(repo, { usedAt: new Date() });
        expect(svcWith(repo).redeem('ABC234', 'u2', 'bob')).rejects.toMatchObject({ status: 409 });
    });

    it('400 when redeeming your own code', async () => {
        const repo = new MockRepo(); seedCode(repo);
        expect(svcWith(repo).redeem('ABC234', 'u1', 'alice')).rejects.toMatchObject({ status: 400 });
    });

    it('409 when the two are already friends', async () => {
        const repo = new MockRepo(); seedCode(repo);
        repo.friendships.push({
            id: 'f1', userIds: ['u1', 'u2'], users: [{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }],
            createdAt: new Date(),
        });
        expect(svcWith(repo).redeem('ABC234', 'u2', 'bob')).rejects.toMatchObject({ status: 409 });
    });
});

describe('FriendService.listFriends / unfriend / areFriends / friendIdsOf', () => {
    const seedFriendship = (repo: MockRepo) => repo.friendships.push({
        id: 'f1', userIds: ['u1', 'u2'], users: [{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }],
        createdAt: new Date(),
    });

    it('returns the other party of each friendship', async () => {
        const repo = new MockRepo(); seedFriendship(repo);
        expect(await svcWith(repo).listFriends('u1')).toEqual([{ id: 'u2', username: 'bob' }]);
        expect(await svcWith(repo).listFriends('u2')).toEqual([{ id: 'u1', username: 'alice' }]);
    });

    it('areFriends / friendIdsOf reflect the graph', async () => {
        const repo = new MockRepo(); seedFriendship(repo);
        expect(await svcWith(repo).areFriends('u1', 'u2')).toBe(true);
        expect(await svcWith(repo).areFriends('u1', 'u9')).toBe(false);
        expect(await svcWith(repo).friendIdsOf('u1')).toEqual(['u2']);
    });

    it('unfriend removes the pair', async () => {
        const repo = new MockRepo(); seedFriendship(repo);
        await svcWith(repo).unfriend('u1', 'u2');
        expect(repo.friendships).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && bun test src/domain/FriendService/index.test.ts`
Expected: FAIL — `FriendService` not defined.

- [ ] **Step 3: Implement the service**

Create `packages/api/src/domain/FriendService/index.ts`:

```ts
import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Friendship, PairingCode, User } from '@shoppingo/types';

import type { FriendRepository } from '../FriendRepository';

const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_LEN = 6;
/** Readable charset — excludes 0/O/1/I. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const err = (message: string, status: number) => Object.assign(new Error(message), { status });

const sortPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export class FriendService {
    constructor(
        private readonly repo: FriendRepository,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger
    ) {}

    private randomCode(): string {
        let out = '';
        for (let i = 0; i < CODE_LEN; i += 1) {
            out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        }
        return out;
    }

    async generateCode(creatorId: string, creatorUsername: string): Promise<{ code: string; expiresAt: Date }> {
        const code = this.randomCode();
        const expiresAt = new Date(Date.now() + CODE_TTL_MS);
        const pairing: PairingCode = { code, creatorId, creatorUsername, expiresAt };
        await this.repo.insertCode(pairing);
        this.logger?.info('Pairing code generated', { creatorId });
        return { code, expiresAt };
    }

    async redeem(code: string, requesterId: string, requesterUsername: string): Promise<User> {
        const pairing = await this.repo.getCode(code);
        if (!pairing) throw err('Code not found', 404);
        if (pairing.expiresAt.getTime() < Date.now()) throw err('This code has expired', 410);
        if (pairing.usedAt) throw err('This code has already been used', 409);
        if (pairing.creatorId === requesterId) throw err('You cannot redeem your own code', 400);

        const existing = await this.repo.findPair(pairing.creatorId, requesterId);
        if (existing) throw err('You are already friends', 409);

        await this.repo.markCodeUsed(code, new Date());

        const creator: User = { id: pairing.creatorId, username: pairing.creatorUsername };
        const requester: User = { id: requesterId, username: requesterUsername };
        const userIds = sortPair(creator.id, requester.id);
        const users: [User, User] = userIds[0] === creator.id ? [creator, requester] : [requester, creator];
        const friendship: Friendship = { id: this.idGenerator.generate(), userIds, users, createdAt: new Date() };
        await this.repo.insertFriendship(friendship);
        this.logger?.info('Friendship formed', { userIds });
        return creator;
    }

    async listFriends(userId: string): Promise<User[]> {
        const friendships = await this.repo.findByUserId(userId);
        return friendships.map((f) => (f.users[0].id === userId ? f.users[1] : f.users[0]));
    }

    async areFriends(userIdA: string, userIdB: string): Promise<boolean> {
        return (await this.repo.findPair(userIdA, userIdB)) !== null;
    }

    async friendIdsOf(userId: string): Promise<string[]> {
        return (await this.listFriends(userId)).map((u) => u.id);
    }

    async unfriend(userId: string, friendId: string): Promise<void> {
        await this.repo.deletePair(userId, friendId);
        this.logger?.info('Unfriended', { userId, friendId });
        // Phase 2 extends this to strip friendId from all owned lists/recipes/todos.
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/api && bun test src/domain/FriendService/index.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/FriendService/
git commit -m "feat(api): add FriendService (generate/redeem/list/unfriend)"
```

---

### Task 5: HTTP handlers, routes, and DI wiring

**Files:**
- Create: `packages/api/src/interfaces/FriendHandlers/index.ts`
- Modify: `packages/api/src/routes/index.ts` (import handlers + register routes)
- Modify: `packages/api/src/dependencies/index.ts` (register `FriendRepository` + `FriendService`)

**Interfaces:**
- Consumes: `FriendService` (Task 4), `MongoFriendRepository` (Task 3), `withAuth`, `dependencyContainer`, `DependencyToken`.
- Produces: routes `POST /api/friends/code`, `POST /api/friends/redeem`, `GET /api/friends`, `DELETE /api/friends/:friendId`.

- [ ] **Step 1: Write the handlers**

Create `packages/api/src/interfaces/FriendHandlers/index.ts`:

```ts
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { FriendService } from '../../domain/FriendService';
import { withAuth } from '../handlerUtils';

const getFriendService = (): FriendService => dependencyContainer.resolve(DependencyToken.FriendService);

export const generateFriendCode = withAuth(async (c, user) => {
    return c.json(await getFriendService().generateCode(user.id, user.username), 201);
});

export const redeemFriendCode = withAuth(async (c, user) => {
    const { code } = await c.req.json<{ code: string }>();
    const friend = await getFriendService().redeem(code, user.id, user.username);
    return c.json({ friend }, 200);
});

export const getFriends = withAuth(async (c, user) => {
    return c.json(await getFriendService().listFriends(user.id), 200);
});

export const removeFriend = withAuth(async (c, user) => {
    const friendId = c.req.param('friendId');
    await getFriendService().unfriend(user.id, friendId);
    return new Response(null, { status: 204 });
});
```

- [ ] **Step 2: Register the routes**

In `packages/api/src/routes/index.ts`:
- Add the import: `import { generateFriendCode, getFriends, redeemFriendCode, removeFriend } from '../interfaces/FriendHandlers';`
- Inside `createRoutes`, near the other `authenticate` routes, add:

```ts
    router.post('/api/friends/code', authenticate, generateFriendCode);
    router.post('/api/friends/redeem', authenticate, redeemFriendCode);
    router.get('/api/friends', authenticate, getFriends);
    router.delete('/api/friends/:friendId', authenticate, removeFriend);
```

- [ ] **Step 3: Wire the DI container**

In `packages/api/src/dependencies/index.ts`:
- Add imports: `import { FriendService } from '../domain/FriendService';` and `import { MongoFriendRepository } from '../infrastructure/MongoFriendRepository';`
- Register (mirror the `MongoTodoRepository` / `TodoService` blocks):

```ts
    dependencyContainer.registerSingleton(
        DependencyToken.FriendRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoFriendRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.FriendService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FriendService(
                    dependencyContainer.resolve(DependencyToken.FriendRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );
```

- [ ] **Step 4: Type-check and lint**

Run: `bun run tsc --noEmit && bun run lint:fix`
Expected: PASS, no type errors.

- [ ] **Step 5: Run the full API test suite**

Run: `bun run --filter @shoppingo/api test`
Expected: PASS (existing + new FriendService/repo tests; coverage ≥ 90%).

- [ ] **Step 6: Manual smoke (optional but recommended)**

Start the API (`bun run start:api`) and, with a valid auth token, `POST /api/friends/code` → expect `{ code, expiresAt }`; from a second user `POST /api/friends/redeem { code }` → expect `{ friend }`; `GET /api/friends` → expect the friend listed.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/interfaces/FriendHandlers/ packages/api/src/routes/index.ts packages/api/src/dependencies/index.ts
git commit -m "feat(api): expose friends routes and wire FriendService DI"
```

---

## Self-Review

- **Spec coverage:** friend graph in shoppingo Mongo ✓ (Tasks 2–3); one-time code + 15-min TTL + single use ✓ (Task 4); redeem = accept, guard matrix ✓ (Task 4 tests); list/unfriend ✓; endpoints ✓ (Task 5). `areFriends`/`friendIdsOf` produced for Phase 2 ✓. **Deferred to Phase 2 (by design):** unfriend hard-revoke of items, share seeding/validation, migration, `Todo.users`.
- **Placeholders:** none — every step has concrete code/commands. (The TTL-index note in Task 3 depends on the repo's existing index convention; the constructor fallback is spelled out.)
- **Type consistency:** `FriendRepository` methods match between interface (Task 2), Mongo impl (Task 3), and mock/service (Task 4). `redeem` returns `User`; handler wraps it as `{ friend }`. Tokens `FriendRepository`/`FriendService` consistent across Tasks 2 & 5.
