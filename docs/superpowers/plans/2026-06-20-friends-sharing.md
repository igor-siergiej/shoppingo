# Friends-Based Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace "share with any username" with a friends system — pair via one-time code/QR, then restrict list/todo sharing to friends, plus net-new todo sharing.

**Architecture:** Friend graph stored in shoppingo MongoDB (`friendships`, `pairingCodes` collections). New clean-arch slice (`FriendRepository` → `MongoFriendRepository` → `FriendService` → `FriendHandlers` → routes) mirrors existing Todo slice. `ListService` and `TodoService` gain a `FriendRepository` dependency to validate friendship before sharing. Web adds a `FriendsPage` (hamburger entry), a reusable `FriendPicker`, QR generate/scan, and shadcn `InputOTP` for code entry.

**Tech Stack:** Bun, Koa, MongoDB native driver, TypeScript, React 19, React Query, shadcn/ui, `qrcode.react`, `@yudiel/react-qr-scanner`, `input-otp`.

## Global Constraints

- Package manager: **Bun 1.x**. Run scripts from repo root.
- Tests: **`bun:test`** only for API (`import { describe, it, expect, beforeEach } from 'bun:test'`). Web component tests follow the sibling `*.test.tsx` import style already in that folder.
- API coverage threshold: **90%**.
- Lint/format: **Biome**. Run `bun run lint:fix` before every commit.
- Type check: `bun run tsc --noEmit` must pass.
- Commits: **Conventional Commits**. Commit at the end of each task.
- Follow existing clean-architecture layering: `domain/` interfaces + services, `infrastructure/` Mongo impls, `interfaces/` handlers, `routes/`, `dependencies/` DI.
- `qrPayload` is built **client-side** from `window.location.origin`; the API returns only `{ code, expiresAt }`.
- Pairing codes: 6-char uppercase alphanumeric, single-use, TTL 5 minutes.
- Mutations on a shared todo remain **owner-only**; shared friends get read/visibility only.

---

## Task 1: Shared types

**Files:**
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Produces:
  - `interface Friendship { id: string; userIds: [string, string]; users: [User, User]; createdAt: Date; }`
  - `interface PairingCode { code: string; creatorId: string; creatorUsername: string; expiresAt: Date; usedAt?: Date; }`
  - `Todo` gains `users?: Array<User>;`

- [ ] **Step 1: Add the new interfaces and extend Todo**

In `packages/types/src/index.ts`, add after the `User` interface:

```ts
export interface Friendship {
    id: string;
    userIds: [string, string];
    users: [User, User];
    createdAt: Date;
}

export interface PairingCode {
    code: string;
    creatorId: string;
    creatorUsername: string;
    expiresAt: Date;
    usedAt?: Date;
}
```

Extend the existing `Todo` interface by adding one field:

```ts
    users?: Array<User>;
```

- [ ] **Step 2: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS (no usages yet, just new types).

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add Friendship, PairingCode, Todo.users"
```

---

## Task 2: FriendRepository interface + MongoFriendRepository

**Files:**
- Create: `packages/api/src/domain/FriendRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoFriendRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoFriendRepository/index.test.ts`

**Interfaces:**
- Consumes: `Friendship`, `PairingCode`, `User` from `@shoppingo/types`.
- Produces:
  ```ts
  interface FriendRepository {
      savePairingCode(code: PairingCode): Promise<void>;
      getPairingCode(code: string): Promise<PairingCode | null>;
      markPairingCodeUsed(code: string, usedAt: Date): Promise<void>;
      createFriendship(friendship: Friendship): Promise<void>;
      areFriends(userA: string, userB: string): Promise<boolean>;
      listFriends(userId: string): Promise<User[]>;
      deleteFriendship(userA: string, userB: string): Promise<void>;
      ensureIndexes(): Promise<void>;
  }
  ```
  Plus exported helper `canonicalPair(a: string, b: string): [string, string]` (sorted).

- [ ] **Step 1: Write the domain interface**

Create `packages/api/src/domain/FriendRepository/index.ts`:

```ts
import type { Friendship, PairingCode, User } from '@shoppingo/types';

export interface FriendRepository {
    savePairingCode(code: PairingCode): Promise<void>;
    getPairingCode(code: string): Promise<PairingCode | null>;
    markPairingCodeUsed(code: string, usedAt: Date): Promise<void>;
    createFriendship(friendship: Friendship): Promise<void>;
    areFriends(userA: string, userB: string): Promise<boolean>;
    listFriends(userId: string): Promise<User[]>;
    deleteFriendship(userA: string, userB: string): Promise<void>;
    ensureIndexes(): Promise<void>;
}

export const canonicalPair = (a: string, b: string): [string, string] =>
    (a < b ? [a, b] : [b, a]);
```

- [ ] **Step 2: Write the failing repository test**

Create `packages/api/src/infrastructure/MongoFriendRepository/index.test.ts`. This uses an in-memory fake collection to verify the repo's query construction (mirrors how other infra tests avoid a live Mongo):

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import type { Friendship, PairingCode } from '@shoppingo/types';
import { MongoFriendRepository } from './index';

class FakeCollection {
    docs: any[] = [];
    indexes: any[] = [];
    async insertOne(doc: any) { this.docs.push(doc); }
    async findOne(query: any) { return this.docs.find((d) => match(d, query)) ?? null; }
    find(query: any) {
        const res = this.docs.filter((d) => match(d, query));
        return { toArray: async () => res };
    }
    async updateOne(query: any, update: any) {
        const doc = this.docs.find((d) => match(d, query));
        if (doc && update.$set) Object.assign(doc, update.$set);
    }
    async deleteOne(query: any) {
        const i = this.docs.findIndex((d) => match(d, query));
        if (i >= 0) this.docs.splice(i, 1);
    }
    async createIndex(spec: any, opts: any) { this.indexes.push({ spec, opts }); }
}

function match(doc: any, query: any): boolean {
    return Object.entries(query).every(([k, v]) => {
        if (k === 'userIds' && v && typeof v === 'object' && '$all' in (v as any)) {
            return (v as any).$all.every((id: string) => doc.userIds?.includes(id));
        }
        if (k === 'userIds' && typeof v === 'string') return doc.userIds?.includes(v);
        return doc[k] === v;
    });
}

class FakeDb {
    collections = new Map<string, FakeCollection>();
    getCollection(name: string) {
        if (!this.collections.has(name)) this.collections.set(name, new FakeCollection());
        return this.collections.get(name)!;
    }
}

const pc = (over: Partial<PairingCode> = {}): PairingCode => ({
    code: 'ABC123', creatorId: 'u1', creatorUsername: 'alice',
    expiresAt: new Date(Date.now() + 60_000), ...over,
});

describe('MongoFriendRepository', () => {
    let db: FakeDb;
    let repo: MongoFriendRepository;
    beforeEach(() => {
        db = new FakeDb();
        repo = new MongoFriendRepository(db as never);
    });

    it('saves and reads a pairing code', async () => {
        await repo.savePairingCode(pc());
        const got = await repo.getPairingCode('ABC123');
        expect(got?.creatorId).toBe('u1');
    });

    it('returns null for an expired pairing code', async () => {
        await repo.savePairingCode(pc({ expiresAt: new Date(Date.now() - 1000) }));
        expect(await repo.getPairingCode('ABC123')).toBeNull();
    });

    it('returns null for a used pairing code', async () => {
        await repo.savePairingCode(pc());
        await repo.markPairingCodeUsed('ABC123', new Date());
        expect(await repo.getPairingCode('ABC123')).toBeNull();
    });

    it('creates a friendship and reports areFriends true', async () => {
        const f: Friendship = {
            id: 'f1', userIds: ['u1', 'u2'],
            users: [{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }],
            createdAt: new Date(),
        };
        await repo.createFriendship(f);
        expect(await repo.areFriends('u2', 'u1')).toBe(true);
        expect(await repo.areFriends('u1', 'u9')).toBe(false);
    });

    it('listFriends returns the other party as User[]', async () => {
        await repo.createFriendship({
            id: 'f1', userIds: ['u1', 'u2'],
            users: [{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }],
            createdAt: new Date(),
        });
        const friends = await repo.listFriends('u1');
        expect(friends).toEqual([{ id: 'u2', username: 'bob' }]);
    });

    it('deletes a friendship', async () => {
        await repo.createFriendship({
            id: 'f1', userIds: ['u1', 'u2'],
            users: [{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }],
            createdAt: new Date(),
        });
        await repo.deleteFriendship('u1', 'u2');
        expect(await repo.areFriends('u1', 'u2')).toBe(false);
    });

    it('ensureIndexes creates a TTL index on pairingCodes.expiresAt', async () => {
        await repo.ensureIndexes();
        const coll = db.getCollection('pairingCode') as FakeCollection;
        expect(coll.indexes[0].opts.expireAfterSeconds).toBe(0);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test infrastructure/MongoFriendRepository`
Expected: FAIL — `MongoFriendRepository` not found.

- [ ] **Step 4: Implement the repository**

Create `packages/api/src/infrastructure/MongoFriendRepository/index.ts`:

```ts
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Friendship, PairingCode, User } from '@shoppingo/types';

import { canonicalPair, type FriendRepository } from '../../domain/FriendRepository';
import { CollectionNames } from '../../dependencies/types';

type FriendCollections = {
    [CollectionNames.Friendship]: Friendship;
    [CollectionNames.PairingCode]: PairingCode;
};

export class MongoFriendRepository implements FriendRepository {
    constructor(private readonly db: MongoDbConnection<FriendCollections>) {}

    private friendships() {
        return this.db.getCollection(CollectionNames.Friendship);
    }

    private pairingCodes() {
        return this.db.getCollection(CollectionNames.PairingCode);
    }

    async savePairingCode(code: PairingCode): Promise<void> {
        await this.pairingCodes().insertOne(code);
    }

    async getPairingCode(code: string): Promise<PairingCode | null> {
        const found = await this.pairingCodes().findOne({ code });
        if (!found) return null;
        if (found.usedAt) return null;
        if (new Date(found.expiresAt).getTime() <= Date.now()) return null;
        return found;
    }

    async markPairingCodeUsed(code: string, usedAt: Date): Promise<void> {
        await this.pairingCodes().updateOne({ code }, { $set: { usedAt } });
    }

    async createFriendship(friendship: Friendship): Promise<void> {
        await this.friendships().insertOne(friendship);
    }

    async areFriends(userA: string, userB: string): Promise<boolean> {
        const [a, b] = canonicalPair(userA, userB);
        const found = await this.friendships().findOne({ userIds: { $all: [a, b] } } as never);
        return found !== null;
    }

    async listFriends(userId: string): Promise<User[]> {
        const docs = await this.friendships().find({ userIds: userId } as never).toArray();
        return docs.map((d) => {
            const [first, second] = d.users;
            return first.id === userId ? second : first;
        });
    }

    async deleteFriendship(userA: string, userB: string): Promise<void> {
        const [a, b] = canonicalPair(userA, userB);
        await this.friendships().deleteOne({ userIds: { $all: [a, b] } } as never);
    }

    async ensureIndexes(): Promise<void> {
        await this.pairingCodes().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await this.pairingCodes().createIndex({ code: 1 }, { unique: true });
        await this.friendships().createIndex({ userIds: 1 }, {});
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test infrastructure/MongoFriendRepository`
Expected: PASS (all 7).

- [ ] **Step 6: Lint, type-check, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/api/src/domain/FriendRepository packages/api/src/infrastructure/MongoFriendRepository
git commit -m "feat(api): add FriendRepository + MongoFriendRepository"
```

> Note: `CollectionNames.Friendship` / `CollectionNames.PairingCode` are added in Task 4. Until then `tsc` will error on those members — if executing tasks strictly in order, do Task 4's `dependencies/types.ts` collection-name edit first, OR temporarily inline string literals `'friendship'` / `'pairingCode'`. Recommended: implement Task 4's `CollectionNames` enum additions before running `tsc` here.

---

## Task 3: PairingCodeGenerator + FriendService

**Files:**
- Create: `packages/api/src/domain/FriendService/index.ts`
- Create: `packages/api/src/domain/FriendService/index.test.ts`
- Create: `packages/api/src/infrastructure/PairingCodeGenerator/index.ts`

**Interfaces:**
- Consumes: `FriendRepository` (Task 2), `IdGenerator` (`@imapps/api-utils`), `Logger`.
- Produces:
  ```ts
  interface PairingCodeGenerator { generate(): string; }

  class FriendService {
      constructor(repo: FriendRepository, idGenerator: IdGenerator, codeGenerator: PairingCodeGenerator, logger?: Logger);
      generatePairingCode(creator: { id: string; username: string }): Promise<{ code: string; expiresAt: Date }>;
      redeem(code: string, requester: { id: string; username: string }): Promise<User>;
      listFriends(userId: string): Promise<User[]>;
      unfriend(userId: string, friendId: string): Promise<void>;
  }
  ```
  Errors thrown as `Object.assign(new Error(msg), { status })` — matches existing services.

- [ ] **Step 1: Write the failing service test**

Create `packages/api/src/domain/FriendService/index.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import type { Friendship, PairingCode, User } from '@shoppingo/types';
import { FriendService } from './index';

class MockRepo {
    codes = new Map<string, PairingCode>();
    friendships: Friendship[] = [];
    async savePairingCode(c: PairingCode) { this.codes.set(c.code, c); }
    async getPairingCode(code: string) {
        const c = this.codes.get(code);
        if (!c || c.usedAt || c.expiresAt.getTime() <= Date.now()) return null;
        return c;
    }
    async markPairingCodeUsed(code: string, usedAt: Date) {
        const c = this.codes.get(code); if (c) c.usedAt = usedAt;
    }
    async createFriendship(f: Friendship) { this.friendships.push(f); }
    async areFriends(a: string, b: string) {
        return this.friendships.some((f) => f.userIds.includes(a) && f.userIds.includes(b));
    }
    async listFriends(userId: string): Promise<User[]> {
        return this.friendships
            .filter((f) => f.userIds.includes(userId))
            .map((f) => (f.users[0].id === userId ? f.users[1] : f.users[0]));
    }
    async deleteFriendship(a: string, b: string) {
        this.friendships = this.friendships.filter((f) => !(f.userIds.includes(a) && f.userIds.includes(b)));
    }
    async ensureIndexes() {}
}
class MockIds { private n = 0; generate() { this.n += 1; return `id-${this.n}`; } }
class MockCodes { generate() { return 'CODE01'; } }

const alice = { id: 'u1', username: 'alice' };
const bob = { id: 'u2', username: 'bob' };

describe('FriendService', () => {
    let repo: MockRepo;
    let svc: FriendService;
    beforeEach(() => {
        repo = new MockRepo();
        svc = new FriendService(repo as never, new MockIds() as never, new MockCodes() as never);
    });

    it('generates a pairing code bound to the creator with a future expiry', async () => {
        const { code, expiresAt } = await svc.generatePairingCode(alice);
        expect(code).toBe('CODE01');
        expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
        const stored = await repo.getPairingCode('CODE01');
        expect(stored?.creatorId).toBe('u1');
        expect(stored?.creatorUsername).toBe('alice');
    });

    it('redeems a code, creating a mutual friendship and returning the new friend', async () => {
        await svc.generatePairingCode(alice);
        const friend = await svc.redeem('CODE01', bob);
        expect(friend).toEqual(alice);
        expect(await repo.areFriends('u1', 'u2')).toBe(true);
    });

    it('marks the code used after redeem (single-use)', async () => {
        await svc.generatePairingCode(alice);
        await svc.redeem('CODE01', bob);
        expect(svc.redeem('CODE01', bob)).rejects.toMatchObject({ status: 410 });
    });

    it('rejects an unknown/expired code with 410', async () => {
        expect(svc.redeem('NOPE', bob)).rejects.toMatchObject({ status: 410 });
    });

    it('rejects self-redeem with 400', async () => {
        await svc.generatePairingCode(alice);
        expect(svc.redeem('CODE01', alice)).rejects.toMatchObject({ status: 400 });
    });

    it('rejects redeem when already friends with 409', async () => {
        await svc.generatePairingCode(alice);
        await svc.redeem('CODE01', bob);
        await svc.generatePairingCode(alice); // MockCodes returns same code; re-store
        expect(svc.redeem('CODE01', bob)).rejects.toMatchObject({ status: 409 });
    });

    it('lists friends', async () => {
        await svc.generatePairingCode(alice);
        await svc.redeem('CODE01', bob);
        expect(await svc.listFriends('u2')).toEqual([alice]);
    });

    it('unfriends', async () => {
        await svc.generatePairingCode(alice);
        await svc.redeem('CODE01', bob);
        await svc.unfriend('u1', 'u2');
        expect(await repo.areFriends('u1', 'u2')).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test domain/FriendService`
Expected: FAIL — `FriendService` not found.

- [ ] **Step 3: Implement the code generator**

Create `packages/api/src/infrastructure/PairingCodeGenerator/index.ts`:

```ts
import { randomInt } from 'node:crypto';

import type { PairingCodeGenerator } from '../../domain/FriendService';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class RandomPairingCodeGenerator implements PairingCodeGenerator {
    generate(): string {
        let code = '';
        for (let i = 0; i < 6; i += 1) {
            code += ALPHABET[randomInt(ALPHABET.length)];
        }
        return code;
    }
}
```

- [ ] **Step 4: Implement the service**

Create `packages/api/src/domain/FriendService/index.ts`:

```ts
import type { IdGenerator, Logger } from '@imapps/api-utils';
import type { Friendship, PairingCode, User } from '@shoppingo/types';

import { canonicalPair, type FriendRepository } from '../FriendRepository';

export interface PairingCodeGenerator {
    generate(): string;
}

const CODE_TTL_MS = 5 * 60 * 1000;
const err = (message: string, status: number) => Object.assign(new Error(message), { status });

export class FriendService {
    constructor(
        private readonly repo: FriendRepository,
        private readonly idGenerator: IdGenerator,
        private readonly codeGenerator: PairingCodeGenerator,
        private readonly logger?: Logger
    ) {}

    async generatePairingCode(creator: { id: string; username: string }): Promise<{ code: string; expiresAt: Date }> {
        const code = this.codeGenerator.generate();
        const expiresAt = new Date(Date.now() + CODE_TTL_MS);
        const pairingCode: PairingCode = {
            code,
            creatorId: creator.id,
            creatorUsername: creator.username,
            expiresAt,
        };
        await this.repo.savePairingCode(pairingCode);
        this.logger?.info('Pairing code generated', { creatorId: creator.id });
        return { code, expiresAt };
    }

    async redeem(code: string, requester: { id: string; username: string }): Promise<User> {
        const pairing = await this.repo.getPairingCode(code);
        if (!pairing) throw err('Invalid or expired code', 410);
        if (pairing.creatorId === requester.id) throw err('Cannot friend yourself', 400);
        if (await this.repo.areFriends(pairing.creatorId, requester.id)) {
            throw err('Already friends', 409);
        }

        await this.repo.markPairingCodeUsed(code, new Date());

        const creator: User = { id: pairing.creatorId, username: pairing.creatorUsername };
        const requesterUser: User = { id: requester.id, username: requester.username };
        const [a, b] = canonicalPair(creator.id, requesterUser.id);
        const users: [User, User] = a === creator.id ? [creator, requesterUser] : [requesterUser, creator];

        const friendship: Friendship = {
            id: this.idGenerator.generate(),
            userIds: [a, b],
            users,
            createdAt: new Date(),
        };
        await this.repo.createFriendship(friendship);
        this.logger?.info('Friendship created', { a, b });
        return creator;
    }

    async listFriends(userId: string): Promise<User[]> {
        return this.repo.listFriends(userId);
    }

    async unfriend(userId: string, friendId: string): Promise<void> {
        await this.repo.deleteFriendship(userId, friendId);
        this.logger?.info('Friendship removed', { userId, friendId });
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test domain/FriendService`
Expected: PASS (all 8).

- [ ] **Step 6: Lint, type-check, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/api/src/domain/FriendService packages/api/src/infrastructure/PairingCodeGenerator
git commit -m "feat(api): add FriendService + pairing code generator"
```

---

## Task 4: DI wiring + FriendHandlers + routes

**Files:**
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Create: `packages/api/src/interfaces/FriendHandlers/index.ts`
- Create: `packages/api/src/interfaces/FriendHandlers/index.test.ts`
- Modify: `packages/api/src/routes/index.ts`

**Interfaces:**
- Consumes: `FriendService` (Task 3), `withAuth` (`../handlerUtils`), `dependencyContainer`.
- Produces handlers: `generatePairingCode`, `redeemPairingCode`, `getFriends`, `removeFriend`.
- Produces DI: `DependencyToken.FriendRepository`, `DependencyToken.FriendService`, `DependencyToken.PairingCodeGenerator`; `CollectionNames.Friendship = 'friendship'`, `CollectionNames.PairingCode = 'pairingCode'`.

- [ ] **Step 1: Extend dependency tokens, collections, and Dependencies map**

In `packages/api/src/dependencies/types.ts`:
- Add imports:
  ```ts
  import type { Friendship, PairingCode } from '@shoppingo/types';
  import type { FriendRepository } from '../domain/FriendRepository';
  import type { FriendService, PairingCodeGenerator } from '../domain/FriendService';
  ```
- Add to `Collections`:
  ```ts
      [CollectionNames.Friendship]: Friendship;
      [CollectionNames.PairingCode]: PairingCode;
  ```
- Add to `DependencyToken` enum:
  ```ts
      FriendRepository = 'FriendRepository',
      FriendService = 'FriendService',
      PairingCodeGenerator = 'PairingCodeGenerator',
  ```
- Add to `Dependencies` map:
  ```ts
      [DependencyToken.FriendRepository]: FriendRepository;
      [DependencyToken.FriendService]: FriendService;
      [DependencyToken.PairingCodeGenerator]: PairingCodeGenerator;
  ```
- Add to `CollectionNames` enum:
  ```ts
      Friendship = 'friendship',
      PairingCode = 'pairingCode',
  ```

- [ ] **Step 2: Register the new dependencies**

In `packages/api/src/dependencies/index.ts`:
- Add imports near the other infra/domain imports:
  ```ts
  import { FriendService } from '../domain/FriendService';
  import { MongoFriendRepository } from '../infrastructure/MongoFriendRepository';
  import { RandomPairingCodeGenerator } from '../infrastructure/PairingCodeGenerator';
  ```
- Inside `registerDepdendencies`, after the Todo registrations, add:
  ```ts
  dependencyContainer.registerSingleton(DependencyToken.PairingCodeGenerator, RandomPairingCodeGenerator);

  dependencyContainer.registerSingleton(
      DependencyToken.FriendRepository,
      // @ts-expect-error - Dependency injection requires constructor return override
      class {
          constructor() {
              const repo = new MongoFriendRepository(dependencyContainer.resolve(DependencyToken.Database));
              void repo.ensureIndexes();
              return repo;
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
                  dependencyContainer.resolve(DependencyToken.PairingCodeGenerator),
                  dependencyContainer.resolve(DependencyToken.Logger)
              );
          }
      }
  );
  ```

- [ ] **Step 3: Write the failing handlers test**

Create `packages/api/src/interfaces/FriendHandlers/index.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'bun:test';
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import * as handlers from './index';

const makeCtx = (over: any = {}) => ({
    state: { user: { id: 'u1', username: 'alice' } },
    params: {},
    request: { body: {} },
    status: 0,
    body: undefined as unknown,
    ...over,
});

class StubService {
    generatePairingCode = async () => ({ code: 'CODE01', expiresAt: new Date(Date.now() + 1000) });
    redeem = async () => ({ id: 'u2', username: 'bob' });
    listFriends = async () => [{ id: 'u2', username: 'bob' }];
    unfriend = async () => {};
}

describe('FriendHandlers', () => {
    beforeEach(() => {
        dependencyContainer.registerSingleton(
            DependencyToken.FriendService,
            // @ts-expect-error stub
            class { constructor() { return new StubService(); } }
        );
    });

    it('generatePairingCode returns code + expiry', async () => {
        const ctx = makeCtx();
        await handlers.generatePairingCode(ctx as never);
        expect(ctx.status).toBe(201);
        expect((ctx.body as any).code).toBe('CODE01');
    });

    it('redeemPairingCode returns the new friend', async () => {
        const ctx = makeCtx({ request: { body: { code: 'CODE01' } } });
        await handlers.redeemPairingCode(ctx as never);
        expect(ctx.status).toBe(201);
        expect((ctx.body as any).username).toBe('bob');
    });

    it('redeemPairingCode 400 when code missing', async () => {
        const ctx = makeCtx({ request: { body: {} } });
        await handlers.redeemPairingCode(ctx as never);
        expect(ctx.status).toBe(400);
    });

    it('getFriends returns the friend list', async () => {
        const ctx = makeCtx();
        await handlers.getFriends(ctx as never);
        expect(ctx.status).toBe(200);
        expect((ctx.body as any)).toHaveLength(1);
    });

    it('removeFriend returns 204', async () => {
        const ctx = makeCtx({ params: { friendId: 'u2' } });
        await handlers.removeFriend(ctx as never);
        expect(ctx.status).toBe(204);
    });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test interfaces/FriendHandlers`
Expected: FAIL — handlers not found.

- [ ] **Step 5: Implement the handlers**

Create `packages/api/src/interfaces/FriendHandlers/index.ts`:

```ts
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { FriendService } from '../../domain/FriendService';
import { withAuth } from '../handlerUtils';

const getFriendService = (): FriendService => dependencyContainer.resolve(DependencyToken.FriendService);

export const generatePairingCode = withAuth(async (ctx, user) => {
    ctx.status = 201;
    ctx.body = await getFriendService().generatePairingCode(user);
});

export const redeemPairingCode = withAuth(async (ctx, user) => {
    const { code } = (ctx.request.body ?? {}) as { code?: string };
    if (!code || typeof code !== 'string' || code.trim() === '') {
        ctx.status = 400;
        ctx.body = { error: 'Code is required' };
        return;
    }
    ctx.status = 201;
    ctx.body = await getFriendService().redeem(code.trim().toUpperCase(), user);
});

export const getFriends = withAuth(async (ctx, user) => {
    ctx.status = 200;
    ctx.body = await getFriendService().listFriends(user.id);
});

export const removeFriend = withAuth(async (ctx, user) => {
    const { friendId } = ctx.params as { friendId: string };
    await getFriendService().unfriend(user.id, friendId);
    ctx.status = 204;
});
```

- [ ] **Step 6: Register routes**

In `packages/api/src/routes/index.ts`:
- Add import: `import * as friendHandlers from '../interfaces/FriendHandlers';`
- Add routes (after the Todos block):
  ```ts
  // Friends
  router.post('/api/friends/code', authenticate, friendHandlers.generatePairingCode);
  router.post('/api/friends/redeem', authenticate, friendHandlers.redeemPairingCode);
  router.get('/api/friends', authenticate, friendHandlers.getFriends);
  router.delete('/api/friends/:friendId', authenticate, friendHandlers.removeFriend);
  ```

- [ ] **Step 7: Run tests + type-check**

Run: `bun run --filter @shoppingo/api test interfaces/FriendHandlers`
Expected: PASS (all 5).
Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Lint and commit**

```bash
bun run lint:fix
git add packages/api/src/dependencies packages/api/src/interfaces/FriendHandlers packages/api/src/routes/index.ts
git commit -m "feat(api): wire friend DI, handlers, and routes"
```

---

## Task 5: Restrict list sharing to friends

**Files:**
- Modify: `packages/api/src/domain/ListService/index.ts`
- Modify: `packages/api/src/dependencies/index.ts` (ListService factory)
- Modify: `packages/api/src/domain/ListService/index.test.ts` (or sibling test file)

**Interfaces:**
- Consumes: `FriendRepository.areFriends`.
- `ListService` constructor gains a trailing `friendRepository: FriendRepository` parameter.

- [ ] **Step 1: Write the failing test**

In the ListService test file, add a mock friend repo and two cases. Add to the existing mock setup a `MockFriendRepo` and pass it as the new last constructor arg wherever `ListService` is built:

```ts
class MockFriendRepo {
    friends = new Set<string>(); // store "a|b" canonical
    async areFriends(a: string, b: string) {
        const [x, y] = a < b ? [a, b] : [b, a];
        return this.friends.has(`${x}|${y}`);
    }
}
```

Add tests:

```ts
it('rejects adding a user who is not a friend with 403', async () => {
    // owner u1 owns the list; target resolves to u2 via auth, but they are not friends
    await expect(service.addUserToList('My List', 'bob', 'u1')).rejects.toMatchObject({ status: 403 });
});

it('adds a user who is a friend', async () => {
    friendRepo.friends.add('u1|u2'); // canonical pair
    const result = await service.addUserToList('My List', 'bob', 'u1');
    expect(result.users.some((u) => u.id === 'u2')).toBe(true);
});
```

(Ensure the auth mock resolves `bob` → `{ id: 'u2', username: 'bob' }`, and the list repo returns a list owned by `u1`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test domain/ListService`
Expected: FAIL — constructor arity / friendship check missing.

- [ ] **Step 3: Add the dependency and the check**

In `packages/api/src/domain/ListService/index.ts`:
- Import: `import type { FriendRepository } from '../FriendRepository';`
- Add the constructor parameter (last): `private readonly friendRepository: FriendRepository`
- In `addUserToList`, after `const userToAdd = fetchedUsers[0];` and before the "already in list" check, add:
  ```ts
  if (!(await this.friendRepository.areFriends(requestingUserId, userToAdd.id))) {
      throw Object.assign(new Error('You can only share with friends'), { status: 403 });
  }
  ```

- [ ] **Step 4: Update DI registration**

In `packages/api/src/dependencies/index.ts`, in the `ListService` factory, add as the final constructor argument:
```ts
                    dependencyContainer.resolve(DependencyToken.FriendRepository),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test domain/ListService`
Expected: PASS.

- [ ] **Step 6: Lint, type-check, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/api/src/domain/ListService packages/api/src/dependencies/index.ts
git commit -m "feat(api): restrict list sharing to friends"
```

---

## Task 6: Todo sharing backend

**Files:**
- Modify: `packages/api/src/domain/TodoService/index.ts`
- Modify: `packages/api/src/domain/TodoRepository/index.ts`
- Modify: `packages/api/src/infrastructure/MongoTodoRepository/index.ts`
- Modify: `packages/api/src/interfaces/TodoHandlers/index.ts`
- Modify: `packages/api/src/dependencies/index.ts` (TodoService factory)
- Modify: `packages/api/src/domain/TodoService/index.test.ts`

**Interfaces:**
- `TodoRepository` gains `findForUser(userId: string): Promise<Todo[]>`.
- `TodoService` constructor gains a trailing `friendRepository: FriendRepository`.
- `CreateTodoInput` and `UpdateTodoInput` accept `userIds?: string[]`.
- `getTodosForUser(userId)` replaces the `getTodos` handler's data source.

- [ ] **Step 1: Write failing service tests**

In `packages/api/src/domain/TodoService/index.test.ts`, extend `MockRepo` with `findForUser` and add a `MockFriendRepo`:

```ts
// add inside MockRepo:
async findForUser(userId: string) {
    return [...this.store.values()].filter(
        (t) => t.ownerId === userId || (t.users ?? []).some((u: any) => u.id === userId)
    );
}
```

```ts
class MockFriendRepo {
    friendsByUser = new Map<string, { id: string; username: string }[]>();
    async listFriends(userId: string) { return this.friendsByUser.get(userId) ?? []; }
    async areFriends() { return true; }
}
```

Build the service with the new arg: `new TodoService(repo, new MockIds(), undefined, friendRepo)` (logger stays optional — place `friendRepository` last; pass `undefined` for logger). Add tests:

```ts
it('shares a todo with a friend on create', async () => {
    friendRepo.friendsByUser.set('u1', [{ id: 'u2', username: 'bob' }]);
    const todo = await svc.createTodo('u1', { title: 'Shared', userIds: ['u2'] });
    expect(todo.users).toEqual([{ id: 'u2', username: 'bob' }]);
});

it('ignores userIds that are not friends', async () => {
    friendRepo.friendsByUser.set('u1', [{ id: 'u2', username: 'bob' }]);
    const todo = await svc.createTodo('u1', { title: 'X', userIds: ['u2', 'stranger'] });
    expect(todo.users).toEqual([{ id: 'u2', username: 'bob' }]);
});

it('getTodosForUser returns owned and shared todos', async () => {
    friendRepo.friendsByUser.set('u1', [{ id: 'u2', username: 'bob' }]);
    await svc.createTodo('u1', { title: 'Owned by u1, shared to u2', userIds: ['u2'] });
    await svc.createTodo('u2', { title: 'Owned by u2' });
    const forU2 = await svc.getTodosForUser('u2');
    expect(forU2).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test domain/TodoService`
Expected: FAIL.

- [ ] **Step 3: Extend the repository interface + Mongo impl**

In `packages/api/src/domain/TodoRepository/index.ts`, add to the interface:
```ts
    findForUser(userId: string): Promise<Todo[]>;
```

In `packages/api/src/infrastructure/MongoTodoRepository/index.ts`, add:
```ts
    async findForUser(userId: string): Promise<Todo[]> {
        return this.collection()
            .find({ $or: [{ ownerId: userId }, { 'users.id': userId }] } as never)
            .toArray();
    }
```

- [ ] **Step 4: Update the service**

In `packages/api/src/domain/TodoService/index.ts`:
- Import: `import type { FriendRepository } from '../FriendRepository';` and `import type { User } from '@shoppingo/types';`
- Add `userIds?: string[];` to `CreateTodoInput`.
- `UpdateTodoInput` already is `Partial<Omit<Todo, ...>>` so it includes `users`; also accept `userIds` by changing it to:
  ```ts
  export type UpdateTodoInput = Partial<Omit<Todo, 'id' | 'ownerId' | 'dateAdded' | 'users'>> & { userIds?: string[] };
  ```
- Add constructor param (last): `private readonly friendRepository: FriendRepository`. Keep `logger` before it; update DI accordingly in Step 6.
- Add a private resolver:
  ```ts
  private async resolveSharedUsers(ownerId: string, userIds?: string[]): Promise<User[] | undefined> {
      if (!userIds || userIds.length === 0) return undefined;
      const friends = await this.friendRepository.listFriends(ownerId);
      return friends.filter((f) => userIds.includes(f.id));
  }
  ```
- In `createTodo`, after building the base `todo`, resolve and attach:
  ```ts
  const users = await this.resolveSharedUsers(ownerId, input.userIds);
  if (users && users.length > 0) todo.users = users;
  ```
  (Add `...(/* nothing */)` not needed — just set after object construction, before `repo.insert`.)
- In `updateTodo`, handle `userIds`:
  ```ts
  const { userIds, ...rest } = input;
  const merged: Todo = { ...existing, ...rest };
  if (userIds !== undefined) {
      const users = await this.resolveSharedUsers(ownerId, userIds);
      merged.users = users && users.length > 0 ? users : [];
  }
  return this.repo.update(todoId, merged);
  ```
- Add the new read method:
  ```ts
  async getTodosForUser(userId: string): Promise<Todo[]> {
      return this.repo.findForUser(userId);
  }
  ```

- [ ] **Step 5: Update the handler**

In `packages/api/src/interfaces/TodoHandlers/index.ts`, change `getTodos`:
```ts
export const getTodos = withAuth(async (ctx, user) => {
    ctx.status = 200;
    ctx.body = await getTodoService().getTodosForUser(user.id);
});
```

- [ ] **Step 6: Update DI registration**

In `packages/api/src/dependencies/index.ts`, in the `TodoService` factory, add as the final constructor argument:
```ts
                    dependencyContainer.resolve(DependencyToken.FriendRepository),
```

- [ ] **Step 7: Run tests + type-check**

Run: `bun run --filter @shoppingo/api test domain/TodoService`
Expected: PASS.
Run: `bun run --filter @shoppingo/api test`
Expected: PASS, coverage ≥ 90%.
Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Lint and commit**

```bash
bun run lint:fix
git add packages/api/src
git commit -m "feat(api): add todo sharing with friends"
```

---

## Task 7: Web API client for friends + todo userIds

**Files:**
- Modify: `packages/web/src/api/index.ts`
- Modify: `packages/web/src/api/index.test.ts` (if present; else create a focused test next to it)

**Interfaces:**
- Produces:
  ```ts
  getFriendsQuery(): { queryKey: ['friends']; queryFn: () => Promise<User[]> }
  generatePairingCode(): Promise<{ code: string; expiresAt: string }>
  redeemPairingCode(code: string): Promise<User>
  removeFriend(friendId: string): Promise<void>
  ```
  `CreateTodoBody` gains `userIds?: string[]`.

- [ ] **Step 1: Add the client functions**

In `packages/web/src/api/index.ts` (follow the existing `makeRequest` style; ensure `User` is imported from `@shoppingo/types`):

```ts
export const getFriendsQuery = () => ({
    queryKey: ['friends'] as const,
    queryFn: async () => await getFriends(),
});

const getFriends = async (): Promise<Array<User>> => {
    return await makeRequest({
        pathname: '/api/friends',
        method: MethodType.GET,
        operationString: 'get friends',
    });
};

export const generatePairingCode = async (): Promise<{ code: string; expiresAt: string }> => {
    return await makeRequest({
        pathname: '/api/friends/code',
        method: MethodType.POST,
        operationString: 'generate pairing code',
        body: JSON.stringify({}),
    });
};

export const redeemPairingCode = async (code: string): Promise<User> => {
    return await makeRequest({
        pathname: '/api/friends/redeem',
        method: MethodType.POST,
        operationString: 'redeem pairing code',
        body: JSON.stringify({ code }),
    });
};

export const removeFriend = async (friendId: string): Promise<void> => {
    return await makeRequest({
        pathname: `/api/friends/${encodeURIComponent(friendId)}`,
        method: MethodType.DELETE,
        operationString: 'remove friend',
    });
};
```

- [ ] **Step 2: Extend `CreateTodoBody`**

Find the `CreateTodoBody` type in `packages/web/src/api/index.ts` and add:
```ts
    userIds?: string[];
```
`createTodo` already serializes the whole body, so no further change is needed.

- [ ] **Step 3: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint and commit**

```bash
bun run lint:fix
git add packages/web/src/api/index.ts
git commit -m "feat(web): add friends api client + todo userIds"
```

---

## Task 8: FriendPicker component + shadcn input-otp + deps

**Files:**
- Create: `packages/web/src/components/FriendPicker/index.tsx`
- Create: `packages/web/src/components/FriendPicker/index.test.tsx`
- Create: `packages/web/src/components/ui/input-otp.tsx` (via shadcn CLI)
- Modify: `packages/web/package.json` (deps)

**Interfaces:**
- Produces:
  ```ts
  interface FriendPickerProps {
      value: string[];                 // selected friend ids
      onChange: (ids: string[]) => void;
      multiple?: boolean;              // default true
  }
  ```

- [ ] **Step 1: Install dependencies**

```bash
bun add --cwd packages/web qrcode.react @yudiel/react-qr-scanner input-otp
bunx --bun shadcn@latest add input-otp --cwd packages/web
```
If the shadcn CLI cannot run offline, create `packages/web/src/components/ui/input-otp.tsx` from the shadcn `input-otp` registry source (it wraps the `input-otp` package and exports `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`).

- [ ] **Step 2: Write the failing component test**

Create `packages/web/src/components/FriendPicker/index.test.tsx` (match the import style of a sibling `*.test.tsx`, e.g. `components/DueDateField/index.test.tsx`). The test wraps the component in a `QueryClientProvider` and stubs `getFriendsQuery` data via a seeded `QueryClient`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { describe, expect, it, vi } from 'vitest';
import { FriendPicker } from './index';

vi.mock('../../api', () => ({
    getFriendsQuery: () => ({
        queryKey: ['friends'],
        queryFn: async () => [
            { id: 'u2', username: 'bob' },
            { id: 'u3', username: 'carol' },
        ],
    }),
}));

const renderWithClient = (ui: React.ReactElement) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('FriendPicker', () => {
    it('lists friends and filters by search', async () => {
        renderWithClient(<FriendPicker value={[]} onChange={() => {}} />);
        expect(await screen.findByText('bob')).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText(/search friends/i), { target: { value: 'car' } });
        expect(screen.queryByText('bob')).not.toBeInTheDocument();
        expect(screen.getByText('carol')).toBeInTheDocument();
    });

    it('toggles selection', async () => {
        const onChange = vi.fn();
        renderWithClient(<FriendPicker value={[]} onChange={onChange} />);
        fireEvent.click(await screen.findByText('bob'));
        expect(onChange).toHaveBeenCalledWith(['u2']);
    });
});
```

> If the web suite uses `bun:test` rather than `vitest`, swap the import to `from 'bun:test'` and use its mock API to match the sibling test file's conventions. Use whichever the neighbouring `*.test.tsx` files use.

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test FriendPicker`
Expected: FAIL — component not found.

- [ ] **Step 4: Implement FriendPicker**

Create `packages/web/src/components/FriendPicker/index.tsx`:

```tsx
import type { User } from '@shoppingo/types';
import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { getFriendsQuery } from '../../api';
import { Input } from '../ui/input';

export interface FriendPickerProps {
    value: string[];
    onChange: (ids: string[]) => void;
    multiple?: boolean;
}

export const FriendPicker = ({ value, onChange, multiple = true }: FriendPickerProps) => {
    const [search, setSearch] = useState('');
    const { data: friends = [] } = useQuery<User[]>(getFriendsQuery());

    const filtered = useMemo(
        () => friends.filter((f) => f.username.toLowerCase().includes(search.trim().toLowerCase())),
        [friends, search]
    );

    const toggle = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange(multiple ? [...value, id] : [id]);
        }
    };

    return (
        <div className="space-y-2">
            <Input
                placeholder="Search friends…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.length === 0 && <p className="text-sm text-muted-foreground px-1">No friends found</p>}
                {filtered.map((f) => {
                    const selected = value.includes(f.id);
                    return (
                        <button
                            type="button"
                            key={f.id}
                            onClick={() => toggle(f.id)}
                            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent active:scale-95 transition"
                        >
                            <span>{f.username}</span>
                            {selected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/web test FriendPicker`
Expected: PASS.

- [ ] **Step 6: Lint, type-check, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/web/src/components/FriendPicker packages/web/src/components/ui/input-otp.tsx packages/web/package.json bun.lockb
git commit -m "feat(web): add reusable FriendPicker + input-otp"
```

---

## Task 9: FriendsPage + route + hamburger entry

**Files:**
- Create: `packages/web/src/pages/FriendsPage/index.tsx`
- Create: `packages/web/src/pages/FriendsPage/index.test.tsx`
- Modify: `packages/web/src/index.tsx` (route + lazy import)
- Modify: `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx` (entry)

**Interfaces:**
- Consumes: `getFriendsQuery`, `generatePairingCode`, `redeemPairingCode`, `removeFriend` (Task 7); `InputOTP*` (Task 8); `QRCodeCanvas` from `qrcode.react`; `Scanner` from `@yudiel/react-qr-scanner`.
- `HamburgerMenu` gains an `onFriends?: () => void` prop wired to navigate to `/friends`.

- [ ] **Step 1: Write the failing page test**

Create `packages/web/src/pages/FriendsPage/index.test.tsx`. Mock the api module and assert the three sections render and redeem fires:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FriendsPage from './index';

const redeem = vi.fn(async () => ({ id: 'u9', username: 'dave' }));
vi.mock('../../api', () => ({
    getFriendsQuery: () => ({ queryKey: ['friends'], queryFn: async () => [{ id: 'u2', username: 'bob' }] }),
    generatePairingCode: async () => ({ code: 'CODE01', expiresAt: new Date(Date.now() + 60000).toISOString() }),
    redeemPairingCode: (c: string) => redeem(c),
    removeFriend: async () => {},
}));
vi.mock('@yudiel/react-qr-scanner', () => ({ Scanner: () => <div data-testid="scanner" /> }));

const wrap = (ui: React.ReactElement) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>{ui}</MemoryRouter>
        </QueryClientProvider>
    );
};

describe('FriendsPage', () => {
    it('shows my friends', async () => {
        wrap(<FriendsPage />);
        expect(await screen.findByText('bob')).toBeInTheDocument();
    });

    it('redeems a typed code', async () => {
        wrap(<FriendsPage />);
        const input = await screen.findByLabelText(/enter code/i);
        fireEvent.change(input, { target: { value: 'CODE01' } });
        fireEvent.click(screen.getByRole('button', { name: /add friend/i }));
        await waitFor(() => expect(redeem).toHaveBeenCalledWith('CODE01'));
    });
});
```

> Match the neighbouring page test conventions (`pages/CalendarPage/index.test.tsx`). Adjust the testing-library/runner imports to whatever those files use.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test FriendsPage`
Expected: FAIL — page not found.

- [ ] **Step 3: Implement FriendsPage**

Create `packages/web/src/pages/FriendsPage/index.tsx`:

```tsx
import type { User } from '@shoppingo/types';
import { QRCodeCanvas } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'sonner';
import { generatePairingCode, getFriendsQuery, redeemPairingCode, removeFriend } from '../../api';
import { Button } from '../../components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../components/ui/input-otp';

const buildQrPayload = (code: string) => `${window.location.origin}/friends/redeem?code=${code}`;

const FriendsPage = () => {
    const queryClient = useQueryClient();
    const { data: friends = [] } = useQuery<User[]>(getFriendsQuery());
    const [generated, setGenerated] = useState<{ code: string } | null>(null);
    const [codeInput, setCodeInput] = useState('');
    const [scanning, setScanning] = useState(false);

    const genMutation = useMutation({
        mutationFn: generatePairingCode,
        onSuccess: (res) => setGenerated({ code: res.code }),
        onError: (e: unknown) => toast.error((e as Error).message || 'Failed to generate code'),
    });

    const redeemMutation = useMutation({
        mutationFn: (code: string) => redeemPairingCode(code),
        onSuccess: (friend) => {
            toast.success(`You are now friends with ${friend.username}`);
            setCodeInput('');
            setScanning(false);
            void queryClient.invalidateQueries(['friends']);
        },
        onError: (e: unknown) => toast.error((e as Error).message || 'Failed to add friend'),
    });

    const removeMutation = useMutation({
        mutationFn: (id: string) => removeFriend(id),
        onSuccess: () => void queryClient.invalidateQueries(['friends']),
        onError: (e: unknown) => toast.error((e as Error).message || 'Failed to remove friend'),
    });

    const extractCode = (raw: string) => {
        try {
            const url = new URL(raw);
            return url.searchParams.get('code') ?? raw;
        } catch {
            return raw;
        }
    };

    return (
        <div className="mx-auto w-full max-w-md space-y-8 p-4">
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">My friends</h2>
                {friends.length === 0 && <p className="text-sm text-muted-foreground">No friends yet.</p>}
                <ul className="space-y-1">
                    {friends.map((f) => (
                        <li key={f.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent">
                            <span>{f.username}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove ${f.username}`}
                                onClick={() => removeMutation.mutate(f.id)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Add a friend — show this</h2>
                {generated ? (
                    <div className="flex flex-col items-center gap-3">
                        <QRCodeCanvas value={buildQrPayload(generated.code)} size={180} />
                        <p className="font-mono text-2xl tracking-widest">{generated.code}</p>
                    </div>
                ) : (
                    <Button onClick={() => genMutation.mutate()} disabled={genMutation.isLoading}>
                        {genMutation.isLoading ? 'Generating…' : 'Generate code'}
                    </Button>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Add a friend — enter their code</h2>
                <label htmlFor="friend-code" className="text-sm text-muted-foreground">
                    Enter code
                </label>
                <InputOTP id="friend-code" maxLength={6} value={codeInput} onChange={setCodeInput}>
                    <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot key={i} index={i} />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
                <div className="flex gap-2">
                    <Button
                        onClick={() => redeemMutation.mutate(codeInput.toUpperCase())}
                        disabled={codeInput.length < 6 || redeemMutation.isLoading}
                    >
                        Add friend
                    </Button>
                    <Button variant="outline" onClick={() => setScanning((s) => !s)}>
                        {scanning ? 'Stop scan' : 'Scan QR'}
                    </Button>
                </div>
                {scanning && (
                    <Scanner
                        onScan={(codes) => {
                            const raw = codes[0]?.rawValue;
                            if (raw) redeemMutation.mutate(extractCode(raw).toUpperCase());
                        }}
                    />
                )}
            </section>
        </div>
    );
};

export default FriendsPage;
```

- [ ] **Step 4: Add the route**

In `packages/web/src/index.tsx`:
- Add lazy import near the others:
  ```ts
  const FriendsPage = lazyLoadPage(() => import('./pages/FriendsPage'), 'friends page');
  ```
- Add a child route inside the `/` route's `children` array:
  ```tsx
  {
      path: 'friends',
      element: (
          <Suspense fallback={<LoadingPage />}>
              <FriendsPage />
          </Suspense>
      ),
  },
  ```
- Add a sibling child route so a scanned QR deep-link lands somewhere valid (reuse the same page; it reads the `code` query param on mount — optional enhancement, but add the route so the URL resolves):
  ```tsx
  {
      path: 'friends/redeem',
      element: (
          <Suspense fallback={<LoadingPage />}>
              <FriendsPage />
          </Suspense>
      ),
  },
  ```

- [ ] **Step 5: Add the hamburger entry**

In `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx`:
- Add `UserPlus` to the lucide import.
- Add `onFriends?: () => void;` to `HamburgerMenuProps` and destructure it.
- Add a button to `conditionalButtons` (always shown):
  ```tsx
  {
      show: true,
      label: 'Friends',
      icon: <UserPlus className="h-4 w-4 mr-2" />,
      onClick: () => onFriends?.(),
  },
  ```
- In the parent that renders `HamburgerMenu` (the ToolBar/Appbar that already supplies `onManageUsers`), pass `onFriends={() => navigate('/friends')}` using the existing `useNavigate` (add the hook there if absent). Locate it via `grep -rn "HamburgerMenu" packages/web/src` and wire the prop in that caller.

- [ ] **Step 6: Run tests + type-check**

Run: `bun run --filter @shoppingo/web test FriendsPage`
Expected: PASS.
Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Lint and commit**

```bash
bun run lint:fix
git add packages/web/src/pages/FriendsPage packages/web/src/index.tsx packages/web/src/components/ToolBar/HamburgerMenu
git commit -m "feat(web): add FriendsPage with QR + OTP pairing and hamburger entry"
```

---

## Task 10: Wire FriendPicker into list sharing

**Files:**
- Modify: `packages/web/src/components/ManageUsersDrawer/index.tsx`
- Modify: `packages/web/src/components/ManageUsersDrawer/ManageUsersSearchSection.tsx`
- Modify: `packages/web/src/hooks/useManageUsers.ts`

**Interfaces:**
- Consumes: `FriendPicker` (Task 8). The "search any username" path (`useSearch`) is replaced by friend selection.

- [ ] **Step 1: Replace the search source with friends in the drawer**

In `ManageUsersDrawer/index.tsx`, replace `<ManageUsersSearchSection .../>` with a friend picker block. Keep the members list as-is. The picker selects a friend id; on confirm, resolve the username from the friends query and call the existing add flow.

Simplest concrete change — render `FriendPicker` (single select) plus an Add button:

```tsx
import { useQuery } from 'react-query';
import type { User } from '@shoppingo/types';
import { getFriendsQuery } from '../../api';
import { FriendPicker } from '../FriendPicker';
// ...
const { data: friends = [] } = useQuery<User[]>(getFriendsQuery());
const [picked, setPicked] = useState<string[]>([]);

const handleAddPicked = async () => {
    const friend = friends.find((f) => f.id === picked[0]);
    if (!friend) return;
    await handleAddUserWithCallback(friend.username);
    setPicked([]);
};
```

Replace the search section JSX with:

```tsx
<div className="space-y-3">
    <FriendPicker
        value={picked}
        onChange={setPicked}
        multiple={false}
    />
    <Button
        onClick={handleAddPicked}
        disabled={picked.length === 0 || addUserMutation.isLoading}
        className="w-full"
    >
        Add to list
    </Button>
</div>
```

Filter out friends already on the list inside `FriendPicker`'s consumer if desired (optional): pass only friends whose id is not in `currentUsers`. For now the backend rejects duplicates with a toast, which is acceptable.

- [ ] **Step 2: Remove the now-unused username search**

In `useManageUsers.ts`, delete the `useSearch` usage and the `availableUsers`/`searchInput`/`setSearchInput`/`isSearching` returns (the drawer no longer uses them). Keep `addUserMutation` and `removeUserMutation`. Delete `ManageUsersSearchSection.tsx` if no longer referenced, and remove its import.

- [ ] **Step 3: Run web tests + type-check**

Run: `bun run --filter @shoppingo/web test ManageUsers`
Expected: PASS (update or remove obsolete assertions referencing the old search).
Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint and commit**

```bash
bun run lint:fix
git add packages/web/src/components/ManageUsersDrawer packages/web/src/hooks/useManageUsers.ts
git commit -m "feat(web): share lists via friend picker instead of username search"
```

---

## Task 11: Share-with-friends in AddTodoDrawer

**Files:**
- Modify: `packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx`
- Modify: `packages/web/src/components/ToolBar/AddTodoDrawer/index.test.tsx`

**Interfaces:**
- Consumes: `FriendPicker` (Task 8). `buildTodoBody` now also carries `userIds`.

- [ ] **Step 1: Write the failing test addition**

In `AddTodoDrawer/index.test.tsx`, add a test that selecting a friend includes `userIds` in the submitted body. Mock `FriendPicker` to immediately call `onChange(['u2'])` via a button, then assert `onAdd` received `userIds: ['u2']`:

```tsx
vi.mock('../../FriendPicker', () => ({
    FriendPicker: ({ onChange }: { onChange: (ids: string[]) => void }) => (
        <button type="button" onClick={() => onChange(['u2'])}>pick-friend</button>
    ),
}));

it('includes selected friend ids in the submitted body', async () => {
    const onAdd = vi.fn(async () => {});
    render(<AddTodoDrawer open onOpenChange={() => {}} onAdd={onAdd} labels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/enter todo title/i), { target: { value: 'Milk' } });
    fireEvent.click(screen.getByText('pick-friend'));
    fireEvent.click(screen.getByRole('button', { name: /add todo/i }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ userIds: ['u2'] })));
});
```

> Match the existing import style in that test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test AddTodoDrawer`
Expected: FAIL — no userIds in body.

- [ ] **Step 3: Wire FriendPicker into the drawer**

In `AddTodoDrawer/index.tsx`:
- Import: `import { FriendPicker } from '../../FriendPicker';`
- Add `userIds?: string[];` to `BuildTodoBodyArgs` and ensure `buildTodoBody` passes it through (the existing loop already copies any non-undefined optional field, so adding `userIds` to the args object suffices).
- Add state: `const [userIds, setUserIds] = useState<string[]>([]);`
- Reset it in `reset()`: `setUserIds([]);`
- Include it in submit: change the `onAdd(buildTodoBody({ ... }))` call to pass `userIds: userIds.length > 0 ? userIds : undefined`.
- Add UI after `<RecurrenceField .../>`:
  ```tsx
  <div className="space-y-2">
      <Label>Share with friends</Label>
      <FriendPicker value={userIds} onChange={setUserIds} />
  </div>
  ```

- [ ] **Step 4: Run tests + type-check**

Run: `bun run --filter @shoppingo/web test AddTodoDrawer`
Expected: PASS.
Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Full verification**

```bash
bun run lint:fix
bun run tsc --noEmit
bun run --filter @shoppingo/api test
bun run --filter @shoppingo/web test
bun run --filter @shoppingo/web build
bun run --filter @shoppingo/api build
```
Expected: all PASS; API coverage ≥ 90%.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/ToolBar/AddTodoDrawer
git commit -m "feat(web): share todos with friends from add todo drawer"
```

---

## Self-Review Notes

- **Spec coverage:** friend store (Tasks 2–4), instant-redeem OTP/QR (Tasks 3, 9), friends-only list sharing (Task 5), full todo sharing (Tasks 1, 6, 7, 11), Friends tab in hamburger (Task 9), reusable FriendPicker in list + todo (Tasks 8, 10, 11), shadcn InputOTP for code entry (Tasks 8, 9), TTL on pairing codes (Task 2). No migration of existing shares — intentionally omitted per spec.
- **qrPayload:** built client-side (`buildQrPayload`), so the API returns only `{ code, expiresAt }` — consistent across Tasks 3, 4, 9.
- **Constructor arity:** `FriendRepository` appended last to both `ListService` (Task 5) and `TodoService` (Task 6); DI updated in the same tasks. `FriendService` arg order `(repo, idGenerator, codeGenerator, logger?)` consistent between Tasks 3 and 4.
- **Naming consistency:** `areFriends`, `listFriends`, `findForUser`, `getTodosForUser`, `generatePairingCode`, `redeemPairingCode`, `removeFriend` used identically across backend and client.
- **Test runner caveat:** web test snippets are written in vitest-style; if the web suite uses `bun:test`, adapt imports/mocks to the sibling `*.test.tsx` convention (called out in Tasks 8, 9, 11).
