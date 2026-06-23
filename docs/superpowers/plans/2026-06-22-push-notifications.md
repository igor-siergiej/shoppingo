# Web Push Notifications (List Item Added) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user adds an item to a shared list, every *other* member of that list receives a Web Push notification on their PWA — even when the app is closed.

**Architecture:** Standard clean-architecture layers on the API: a `PushSubscription` entity + Mongo repo (`infrastructure/`), a `WebPushSender` infra wrapper around the `web-push` library, and a `NotificationService` (`domain/`) that fans out to list members minus the actor. `ListService.addItem`/`addItems` fire-and-forget into `NotificationService`. New `PushHandlers` expose subscribe/unsubscribe + VAPID public key. On the web, the PWA migrates from Workbox `generateSW` to `injectManifest` so a custom service worker can handle `push`/`notificationclick`; a `usePushNotifications` hook + a toggle in the hamburger menu drive subscription.

**Tech Stack:** TypeScript, Hono, MongoDB native driver, `web-push` (VAPID), `@imapps/api-utils` DI container, Bun native test runner (`bun:test`) for API. React 19, vite-plugin-pwa (`injectManifest` + Workbox), Vitest + Testing Library for web.

## Global Constraints

- API tests use **`bun:test`** only (import from `bun:test`). Web tests use **Vitest** (`vitest` + `@testing-library/react`) — match the file's existing imports.
- Run `bun run lint:fix` and `bun run tsc --noEmit` before every commit. API tests: `bun run --filter @shoppingo/api test`.
- Notifications must NEVER break the originating write. All push fan-out is fire-and-forget with caught + logged errors.
- VAPID config keys are **optional** — when absent, push silently no-ops (log a warn once). The API must boot and all existing flows must work with no VAPID env set.
- A user opts in/out purely by subscribing/unsubscribing. Per-list mute is OUT OF SCOPE for this plan.
- Notification payload shape is fixed: `{ title: string; body: string; data: { url: string } }`.

---

## File Structure

**Shared types**
- Modify: `packages/types/src/index.ts` — add `PushSubscription` interface.

**API — new**
- Create: `packages/api/src/domain/PushSubscriptionRepository/index.ts` — repo interface.
- Create: `packages/api/src/infrastructure/MongoPushSubscriptionRepository/index.ts` (+ `.test.ts`).
- Create: `packages/api/src/infrastructure/WebPushSender/index.ts` (+ `.test.ts`) — wraps `web-push`.
- Create: `packages/api/src/domain/NotificationService/index.ts` (+ `.test.ts`) — fan-out logic.
- Create: `packages/api/src/interfaces/PushHandlers/index.ts` (+ `.test.ts`).

**API — modified**
- `packages/api/src/dependencies/types.ts` — `CollectionNames.PushSubscription`, new `DependencyToken`s + `Dependencies` entries, `Collections` entry.
- `packages/api/src/config/index.ts` — VAPID keys.
- `packages/api/src/dependencies/index.ts` — register repo, sender, service; inject `NotificationService` into `ListService`.
- `packages/api/src/domain/ListService/index.ts` — accept optional `NotificationService`, thread `actor`, fire-and-forget on add.
- `packages/api/src/interfaces/ListHandlers/index.ts` — pass `authenticatedUser` as actor into `addItem`/`addItems`.
- `packages/api/src/routes/index.ts` — push routes.

**Web — new**
- Create: `packages/web/src/sw.ts` — custom service worker (precache + runtime cache + push handlers).
- Create: `packages/web/src/utils/push.ts` (+ `.test.ts`) — `urlBase64ToUint8Array`.
- Create: `packages/web/src/hooks/usePushNotifications.ts` (+ `.test.ts`).

**Web — modified**
- `packages/web/vite.config.ts` — `strategies: 'injectManifest'`, `srcDir`, `filename`.
- `packages/web/package.json` (+ api) — deps (handled via `bun add`).
- `packages/web/src/api/index.ts` — `getVapidPublicKey`, `subscribeToPush`, `unsubscribeFromPush`.
- `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx` — `NotificationToggle`.

---

# Phase 1 — Backend

### Task 1: `PushSubscription` type + collection token wiring

**Files:**
- Modify: `packages/types/src/index.ts`
- Modify: `packages/api/src/dependencies/types.ts`

**Interfaces:**
- Produces: `PushSubscription { endpoint: string; userId: string; keys: { p256dh: string; auth: string }; dateAdded: Date }`; `CollectionNames.PushSubscription = 'pushSubscription'`; `DependencyToken.PushSubscriptionRepository`, `DependencyToken.WebPushSender`, `DependencyToken.NotificationService`.

- [ ] **Step 1: Add the type**

In `packages/types/src/index.ts`, append:

```typescript
export interface PushSubscription {
    /** Push service endpoint URL — unique per browser/device. Used as the document id. */
    endpoint: string;
    userId: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    dateAdded: Date;
}
```

- [ ] **Step 2: Register collection + tokens**

In `packages/api/src/dependencies/types.ts`:

Add to the `import type { ... } from '@shoppingo/types'` line: `PushSubscription`.

Add to the `Collections` type:
```typescript
    [CollectionNames.PushSubscription]: PushSubscription;
```

Add to the `DependencyToken` enum:
```typescript
    PushSubscriptionRepository = 'PushSubscriptionRepository',
    WebPushSender = 'WebPushSender',
    NotificationService = 'NotificationService',
```

Add to the `Dependencies` type:
```typescript
    [DependencyToken.PushSubscriptionRepository]: PushSubscriptionRepository;
    [DependencyToken.WebPushSender]: WebPushSender;
    [DependencyToken.NotificationService]: NotificationService;
```

Add to the `CollectionNames` enum:
```typescript
    PushSubscription = 'pushSubscription',
```

Add these imports near the other domain imports:
```typescript
import type { NotificationService } from '../domain/NotificationService';
import type { PushSubscriptionRepository } from '../domain/PushSubscriptionRepository';
import type { WebPushSender } from '../infrastructure/WebPushSender';
```

- [ ] **Step 3: Type-check**

Run: `bun run tsc --noEmit`
Expected: errors only about the three missing modules (`NotificationService`, `PushSubscriptionRepository`, `WebPushSender`) — created in later tasks. No errors in the types package.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts packages/api/src/dependencies/types.ts
git commit -m "feat(types): add PushSubscription entity and DI tokens"
```

---

### Task 2: `PushSubscriptionRepository` (interface + Mongo impl)

**Files:**
- Create: `packages/api/src/domain/PushSubscriptionRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoPushSubscriptionRepository/index.ts`
- Test: `packages/api/src/infrastructure/MongoPushSubscriptionRepository/index.test.ts`

**Interfaces:**
- Consumes: `PushSubscription` (Task 1), `MongoDbConnection`, `CollectionNames.PushSubscription`.
- Produces: `interface PushSubscriptionRepository { upsert(sub: PushSubscription): Promise<void>; deleteByEndpoint(endpoint: string): Promise<void>; findByUserIds(userIds: string[]): Promise<PushSubscription[]>; deleteByEndpoints(endpoints: string[]): Promise<void>; }`

- [ ] **Step 1: Write the interface**

Create `packages/api/src/domain/PushSubscriptionRepository/index.ts`:

```typescript
import type { PushSubscription } from '@shoppingo/types';

export interface PushSubscriptionRepository {
    /** Insert or replace a subscription, keyed by its endpoint. */
    upsert(sub: PushSubscription): Promise<void>;
    deleteByEndpoint(endpoint: string): Promise<void>;
    findByUserIds(userIds: string[]): Promise<PushSubscription[]>;
    /** Bulk-remove expired/invalid subscriptions discovered during send. */
    deleteByEndpoints(endpoints: string[]): Promise<void>;
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/api/src/infrastructure/MongoPushSubscriptionRepository/index.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'bun:test';
import type { PushSubscription } from '@shoppingo/types';
import { MongoPushSubscriptionRepository } from './index';

class FakeCollection {
    docs: PushSubscription[] = [];

    async replaceOne(filter: { endpoint: string }, doc: PushSubscription, opts: { upsert: boolean }) {
        const idx = this.docs.findIndex((d) => d.endpoint === filter.endpoint);
        if (idx >= 0) {
            this.docs[idx] = doc;
        } else if (opts.upsert) {
            this.docs.push(doc);
        }
    }

    async deleteOne(filter: { endpoint: string }) {
        this.docs = this.docs.filter((d) => d.endpoint !== filter.endpoint);
    }

    async deleteMany(filter: { endpoint: { $in: string[] } }) {
        this.docs = this.docs.filter((d) => !filter.endpoint.$in.includes(d.endpoint));
    }

    find(filter: { userId: { $in: string[] } }) {
        const matched = this.docs.filter((d) => filter.userId.$in.includes(d.userId));
        return { toArray: async () => matched };
    }
}

const makeSub = (endpoint: string, userId: string): PushSubscription => ({
    endpoint,
    userId,
    keys: { p256dh: 'p', auth: 'a' },
    dateAdded: new Date(),
});

describe('MongoPushSubscriptionRepository', () => {
    let collection: FakeCollection;
    let repo: MongoPushSubscriptionRepository;

    beforeEach(() => {
        collection = new FakeCollection();
        const db = { getCollection: () => collection } as never;
        repo = new MongoPushSubscriptionRepository(db);
    });

    it('upserts by endpoint (no duplicates)', async () => {
        await repo.upsert(makeSub('e1', 'u1'));
        await repo.upsert(makeSub('e1', 'u1'));
        expect(collection.docs.length).toBe(1);
    });

    it('finds subscriptions for the given user ids', async () => {
        await repo.upsert(makeSub('e1', 'u1'));
        await repo.upsert(makeSub('e2', 'u2'));
        await repo.upsert(makeSub('e3', 'u3'));
        const found = await repo.findByUserIds(['u1', 'u3']);
        expect(found.map((s) => s.endpoint).sort()).toEqual(['e1', 'e3']);
    });

    it('deletes by endpoint', async () => {
        await repo.upsert(makeSub('e1', 'u1'));
        await repo.deleteByEndpoint('e1');
        expect(collection.docs.length).toBe(0);
    });

    it('bulk-deletes by endpoints', async () => {
        await repo.upsert(makeSub('e1', 'u1'));
        await repo.upsert(makeSub('e2', 'u1'));
        await repo.deleteByEndpoints(['e1', 'e2']);
        expect(collection.docs.length).toBe(0);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/api && bun test src/infrastructure/MongoPushSubscriptionRepository`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 4: Write the implementation**

Create `packages/api/src/infrastructure/MongoPushSubscriptionRepository/index.ts`:

```typescript
import type { MongoDbConnection } from '@imapps/api-utils';
import type { PushSubscription } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { PushSubscriptionRepository } from '../../domain/PushSubscriptionRepository';

export class MongoPushSubscriptionRepository implements PushSubscriptionRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.PushSubscription]: PushSubscription }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.PushSubscription);
    }

    async upsert(sub: PushSubscription): Promise<void> {
        await this.collection().replaceOne({ endpoint: sub.endpoint }, sub, { upsert: true });
    }

    async deleteByEndpoint(endpoint: string): Promise<void> {
        await this.collection().deleteOne({ endpoint });
    }

    async findByUserIds(userIds: string[]): Promise<PushSubscription[]> {
        if (userIds.length === 0) {
            return [];
        }
        return this.collection()
            .find({ userId: { $in: userIds } })
            .toArray();
    }

    async deleteByEndpoints(endpoints: string[]): Promise<void> {
        if (endpoints.length === 0) {
            return;
        }
        await this.collection().deleteMany({ endpoint: { $in: endpoints } });
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/api && bun test src/infrastructure/MongoPushSubscriptionRepository`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/PushSubscriptionRepository packages/api/src/infrastructure/MongoPushSubscriptionRepository
git commit -m "feat(api): add PushSubscription repository"
```

---

### Task 3: `WebPushSender` infra (wraps `web-push`)

**Files:**
- Create: `packages/api/src/infrastructure/WebPushSender/index.ts`
- Test: `packages/api/src/infrastructure/WebPushSender/index.test.ts`

**Interfaces:**
- Consumes: `PushSubscription` (Task 1), the `web-push` package.
- Produces: `class WebPushSender { constructor(publicKey?: string, privateKey?: string, subject?: string, logger?: Logger); isConfigured(): boolean; send(sub: PushSubscription, payload: string): Promise<'ok' | 'gone' | 'error'>; }` — `'gone'` means the subscription is dead (404/410) and must be pruned.

- [ ] **Step 1: Add the dependency**

```bash
cd packages/api && bun add web-push && bun add -d @types/web-push
```

- [ ] **Step 2: Write the failing test**

Create `packages/api/src/infrastructure/WebPushSender/index.test.ts`:

```typescript
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PushSubscription } from '@shoppingo/types';

const setVapidDetails = mock(() => {});
const sendNotification = mock(async () => ({ statusCode: 201 }));

mock.module('web-push', () => ({
    default: { setVapidDetails, sendNotification },
    setVapidDetails,
    sendNotification,
}));

const { WebPushSender } = await import('./index');

const sub: PushSubscription = {
    endpoint: 'https://push/e1',
    userId: 'u1',
    keys: { p256dh: 'p', auth: 'a' },
    dateAdded: new Date(),
};

describe('WebPushSender', () => {
    beforeEach(() => {
        setVapidDetails.mockClear();
        sendNotification.mockClear();
    });

    it('is not configured without keys', () => {
        const sender = new WebPushSender(undefined, undefined, undefined);
        expect(sender.isConfigured()).toBe(false);
    });

    it('configures VAPID details when keys present', () => {
        const sender = new WebPushSender('pub', 'priv', 'mailto:a@b.c');
        expect(sender.isConfigured()).toBe(true);
        expect(setVapidDetails).toHaveBeenCalledWith('mailto:a@b.c', 'pub', 'priv');
    });

    it('returns "error" without sending when unconfigured', async () => {
        const sender = new WebPushSender(undefined, undefined, undefined);
        expect(await sender.send(sub, '{}')).toBe('error');
        expect(sendNotification).not.toHaveBeenCalled();
    });

    it('returns "ok" on a successful send', async () => {
        sendNotification.mockResolvedValueOnce({ statusCode: 201 });
        const sender = new WebPushSender('pub', 'priv', 'mailto:a@b.c');
        expect(await sender.send(sub, '{"title":"t"}')).toBe('ok');
        expect(sendNotification).toHaveBeenCalledTimes(1);
    });

    it('returns "gone" when the push service reports 410', async () => {
        sendNotification.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));
        const sender = new WebPushSender('pub', 'priv', 'mailto:a@b.c');
        expect(await sender.send(sub, '{}')).toBe('gone');
    });

    it('returns "error" on other failures', async () => {
        sendNotification.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }));
        const sender = new WebPushSender('pub', 'priv', 'mailto:a@b.c');
        expect(await sender.send(sub, '{}')).toBe('error');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/api && bun test src/infrastructure/WebPushSender`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 4: Write the implementation**

Create `packages/api/src/infrastructure/WebPushSender/index.ts`:

```typescript
import type { Logger } from '@imapps/api-utils';
import type { PushSubscription } from '@shoppingo/types';
import webpush from 'web-push';

export type SendResult = 'ok' | 'gone' | 'error';

export class WebPushSender {
    private readonly configured: boolean;

    constructor(
        publicKey?: string,
        privateKey?: string,
        subject?: string,
        private readonly logger?: Logger
    ) {
        if (publicKey && privateKey && subject) {
            webpush.setVapidDetails(subject, publicKey, privateKey);
            this.configured = true;
        } else {
            this.configured = false;
            this.logger?.warn('Web push not configured — VAPID keys missing; notifications disabled');
        }
    }

    isConfigured(): boolean {
        return this.configured;
    }

    async send(sub: PushSubscription, payload: string): Promise<SendResult> {
        if (!this.configured) {
            return 'error';
        }

        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
            );
            return 'ok';
        } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
                return 'gone';
            }
            this.logger?.error('Failed to send web push', {
                endpoint: sub.endpoint,
                statusCode,
                error: (error as Error).message,
            });
            return 'error';
        }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/api && bun test src/infrastructure/WebPushSender`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/infrastructure/WebPushSender packages/api/package.json
git commit -m "feat(api): add WebPushSender wrapping web-push"
```

---

### Task 4: `NotificationService` (fan-out domain logic)

**Files:**
- Create: `packages/api/src/domain/NotificationService/index.ts`
- Test: `packages/api/src/domain/NotificationService/index.test.ts`

**Interfaces:**
- Consumes: `PushSubscriptionRepository` (Task 2), `WebPushSender` (Task 3), `List`, `Item`, `User`, `Logger`.
- Produces: `class NotificationService { constructor(repo: PushSubscriptionRepository, sender: WebPushSender, logger?: Logger, debounceMs?: number); notifyItemAdded(list: List, item: Item, actor: User): Promise<void>; notifyItemsAdded(list: List, names: string[], actor: User): Promise<void>; }` plus `formatAddedBody(username: string, names: string[]): string` and `MAX_NAMES_SHOWN`. Adds are buffered per `(list.id, actor.id)` and flushed as ONE notification after `debounceMs` (default 8000) of quiet — so rapid single adds coalesce.

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/domain/NotificationService/index.test.ts`:

```typescript
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Item, List, PushSubscription, User } from '@shoppingo/types';
import { ListType } from '@shoppingo/types';
import { formatAddedBody, NotificationService } from './index';

/** Let the debounce timer (constructed with debounceMs=0) fire, then drain its async flush. */
const tick = () => new Promise((r) => setTimeout(r, 5));

const owner: User = { id: 'u1', username: 'owner' };
const member: User = { id: 'u2', username: 'member' };

const list: List = {
    id: 'l1',
    title: 'Groceries',
    dateAdded: new Date(),
    items: [],
    users: [owner, member],
    listType: ListType.SHOPPING,
    ownerId: 'u1',
};

const item = (name: string): Item => ({ id: name, name, isSelected: false, dateAdded: new Date() });

const subFor = (userId: string, endpoint: string): PushSubscription => ({
    endpoint,
    userId,
    keys: { p256dh: 'p', auth: 'a' },
    dateAdded: new Date(),
});

const makeRepo = (subs: PushSubscription[]) => ({
    findByUserIds: mock(async (ids: string[]) => subs.filter((s) => ids.includes(s.userId))),
    deleteByEndpoints: mock(async () => {}),
    upsert: mock(async () => {}),
    deleteByEndpoint: mock(async () => {}),
});

describe('formatAddedBody', () => {
    it('lists a single item', () => {
        expect(formatAddedBody('owner', ['Milk'])).toBe('owner added Milk');
    });

    it('lists up to three items in full', () => {
        expect(formatAddedBody('owner', ['Milk', 'Eggs', 'Bread'])).toBe('owner added Milk, Eggs, Bread');
    });

    it('collapses the tail into "and N more"', () => {
        expect(formatAddedBody('owner', ['Milk', 'Eggs', 'Bread', 'Butter', 'Jam'])).toBe(
            'owner added Milk, Eggs, Bread and 2 more'
        );
    });
});

describe('NotificationService coalescing', () => {
    let repo: ReturnType<typeof makeRepo>;
    let sender: { send: ReturnType<typeof mock>; isConfigured: () => boolean };

    beforeEach(() => {
        repo = makeRepo([subFor('u2', 'e2')]);
        sender = { send: mock(async () => 'ok' as const), isConfigured: () => true };
    });

    it('coalesces rapid single adds into ONE notification', async () => {
        const service = new NotificationService(repo as never, sender as never, undefined, 0);
        await service.notifyItemAdded(list, item('Milk'), owner);
        await service.notifyItemAdded(list, item('Eggs'), owner);
        await service.notifyItemAdded(list, item('Bread'), owner);
        await service.notifyItemAdded(list, item('Butter'), owner);
        await tick();

        expect(sender.send).toHaveBeenCalledTimes(1);
        const [, payload] = sender.send.mock.calls[0];
        expect(JSON.parse(payload as string)).toEqual({
            title: 'Groceries',
            body: 'owner added Milk, Eggs, Bread and 1 more',
            data: { url: '/list/Groceries' },
        });
    });

    it('sends only to members other than the actor, and prunes "gone" subs', async () => {
        sender.send = mock(async () => 'gone' as const);
        const service = new NotificationService(repo as never, sender as never, undefined, 0);
        await service.notifyItemAdded(list, item('Milk'), owner);
        await tick();

        expect(repo.findByUserIds).toHaveBeenCalledWith(['u2']);
        expect(repo.deleteByEndpoints).toHaveBeenCalledWith(['e2']);
    });

    it('does nothing when the only member is the actor', async () => {
        const service = new NotificationService(repo as never, sender as never, undefined, 0);
        await service.notifyItemAdded({ ...list, users: [owner] }, item('Milk'), owner);
        await tick();

        expect(repo.findByUserIds).not.toHaveBeenCalled();
        expect(sender.send).not.toHaveBeenCalled();
    });

    it('never throws when the sender rejects', async () => {
        sender.send = mock(async () => {
            throw new Error('boom');
        });
        const service = new NotificationService(repo as never, sender as never, undefined, 0);
        await service.notifyItemAdded(list, item('Milk'), owner);
        await expect(tick()).resolves.toBeUndefined();
    });

    it('skips entirely when the sender is unconfigured', async () => {
        sender.isConfigured = () => false;
        const service = new NotificationService(repo as never, sender as never, undefined, 0);
        await service.notifyItemAdded(list, item('Milk'), owner);
        await tick();

        expect(repo.findByUserIds).not.toHaveBeenCalled();
    });

    it('formats a bulk add from its item names', async () => {
        const service = new NotificationService(repo as never, sender as never, undefined, 0);
        await service.notifyItemsAdded(list, ['A', 'B', 'C', 'D'], owner);
        await tick();

        expect(JSON.parse(sender.send.mock.calls[0][1] as string).body).toBe('owner added A, B, C and 1 more');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/NotificationService`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Write the implementation**

Create `packages/api/src/domain/NotificationService/index.ts`:

```typescript
import type { Logger } from '@imapps/api-utils';
import type { Item, List, User } from '@shoppingo/types';

import type { PushSubscriptionRepository } from '../PushSubscriptionRepository';
import type { WebPushSender } from '../../infrastructure/WebPushSender';

interface NotificationPayload {
    title: string;
    body: string;
    data: { url: string };
}

interface AddBuffer {
    names: string[];
    actor: User;
    list: List;
    timer: ReturnType<typeof setTimeout>;
}

/** Max item names listed before the rest collapse into "and N more". */
export const MAX_NAMES_SHOWN = 3;

export const formatAddedBody = (username: string, names: string[]): string => {
    const shown = names.slice(0, MAX_NAMES_SHOWN).join(', ');
    const extra = names.length - MAX_NAMES_SHOWN;
    return extra > 0 ? `${username} added ${shown} and ${extra} more` : `${username} added ${shown}`;
};

export class NotificationService {
    /** Pending adds keyed by `${list.id}:${actor.id}`, flushed as one notification after the debounce. */
    private readonly buffers = new Map<string, AddBuffer>();

    constructor(
        private readonly repo: PushSubscriptionRepository,
        private readonly sender: WebPushSender,
        private readonly logger?: Logger,
        private readonly debounceMs = 8000
    ) {}

    async notifyItemAdded(list: List, item: Item, actor: User): Promise<void> {
        this.buffer(list, actor, [item.name]);
    }

    async notifyItemsAdded(list: List, names: string[], actor: User): Promise<void> {
        this.buffer(list, actor, names);
    }

    private buffer(list: List, actor: User, names: string[]): void {
        if (!this.sender.isConfigured() || names.length === 0) {
            return;
        }

        const key = `${list.id}:${actor.id}`;
        const existing = this.buffers.get(key);

        if (existing) {
            existing.names.push(...names);
            existing.list = list;
            clearTimeout(existing.timer);
            existing.timer = setTimeout(() => void this.flush(key), this.debounceMs);
            return;
        }

        this.buffers.set(key, {
            names: [...names],
            actor,
            list,
            timer: setTimeout(() => void this.flush(key), this.debounceMs),
        });
    }

    private async flush(key: string): Promise<void> {
        const entry = this.buffers.get(key);
        if (!entry) {
            return;
        }
        this.buffers.delete(key);

        await this.fanOut(entry.list, entry.actor, {
            title: entry.list.title,
            body: formatAddedBody(entry.actor.username, entry.names),
            data: { url: `/list/${entry.list.title}` },
        });
    }

    private async fanOut(list: List, actor: User, payload: NotificationPayload): Promise<void> {
        try {
            const recipientIds = list.users.map((u) => u.id).filter((id) => id !== actor.id);
            if (recipientIds.length === 0) {
                return;
            }

            const subs = await this.repo.findByUserIds(recipientIds);
            if (subs.length === 0) {
                return;
            }

            const body = JSON.stringify(payload);
            const results = await Promise.all(subs.map((sub) => this.sender.send(sub, body)));

            const dead = subs.filter((_, i) => results[i] === 'gone').map((s) => s.endpoint);
            if (dead.length > 0) {
                await this.repo.deleteByEndpoints(dead);
            }
        } catch (error) {
            this.logger?.error('Notification fan-out failed', {
                listTitle: list.title,
                error: (error as Error).message,
            });
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/NotificationService`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/NotificationService
git commit -m "feat(api): add NotificationService fan-out"
```

---

### Task 5: Config, DI wiring, thread actor through `ListService`

**Files:**
- Modify: `packages/api/src/config/index.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Modify: `packages/api/src/domain/ListService/index.ts`
- Modify: `packages/api/src/domain/ListService/index.test.ts`
- Modify: `packages/api/src/interfaces/ListHandlers/index.ts`

**Interfaces:**
- Consumes: `NotificationService` (Task 4), config (Task 1 tokens).
- Produces: `ListService` constructor gains a 6th param `notificationService?: NotificationService`; `addItem(title, itemName, dateAdded, quantity?, unit?, actor?: User)`; `addItems(title, rawItems, userId, actor?: User)`.

- [ ] **Step 1: Add VAPID config**

In `packages/api/src/config/index.ts`, add inside `schema`:

```typescript
    vapidPublicKey: { parser: parsers.string, from: 'VAPID_PUBLIC_KEY', optional: true },
    vapidPrivateKey: { parser: parsers.string, from: 'VAPID_PRIVATE_KEY', optional: true },
    vapidSubject: { parser: parsers.string, from: 'VAPID_SUBJECT', optional: true },
```

- [ ] **Step 2: Write the failing test for notification on addItem**

In `packages/api/src/domain/ListService/index.test.ts`, add a new test block. First, locate how the existing tests construct `ListService` (note the constructor arg order: `repo, idGenerator, auth?, logger?, authorizationService?`). Append:

```typescript
describe('ListService notifications', () => {
    it('notifies members when an item is added', async () => {
        const list = {
            id: 'l1',
            title: 'Groceries',
            dateAdded: new Date(),
            items: [],
            users: [
                { id: 'u1', username: 'owner' },
                { id: 'u2', username: 'member' },
            ],
            listType: ListType.SHOPPING,
            ownerId: 'u1',
        };
        const repo = {
            getByTitle: async () => list,
            pushItem: async () => {},
        } as never;
        const idGenerator = { generate: () => 'i1' } as never;
        const notify = { notifyItemAdded: mock(async () => {}), notifyItemsAdded: mock(async () => {}) };

        const service = new ListService(repo, idGenerator, undefined, undefined, undefined, notify as never);
        await service.addItem('Groceries', 'Milk', new Date(), undefined, undefined, {
            id: 'u1',
            username: 'owner',
        });

        // fan-out is fire-and-forget — allow the microtask queue to drain
        await Promise.resolve();
        expect(notify.notifyItemAdded).toHaveBeenCalledTimes(1);
    });
});
```

Ensure `mock` and `ListType` are imported at the top of the test file (add to the existing `bun:test` / `@shoppingo/types` imports if missing).

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/ListService`
Expected: FAIL — `ListService` constructor ignores 6th arg / `notifyItemAdded` not called.

- [ ] **Step 4: Thread `NotificationService` + actor into `ListService`**

In `packages/api/src/domain/ListService/index.ts`:

Add import:
```typescript
import type { NotificationService } from '../NotificationService';
```

Extend the constructor (add the 6th parameter, keep existing ones unchanged):
```typescript
    constructor(
        private readonly repo: ListRepository,
        private readonly idGenerator: IdGenerator,
        private readonly auth?: AuthClient,
        private readonly logger?: Logger,
        authorizationService?: AuthorizationService,
        private readonly notificationService?: NotificationService
    ) {
        this.authorizationService = authorizationService ?? new AuthorizationService();
    }
```

Change `addItem`'s signature and add the fan-out just before `return item;`:
```typescript
    async addItem(
        title: string,
        itemName: string,
        dateAdded: Date,
        quantity?: number,
        unit?: string,
        actor?: User
    ) {
```
…and immediately before `return item;` (after the existing `this.logger?.info('Item added to list', …)` call):
```typescript
            if (actor) {
                void this.notificationService?.notifyItemAdded(list, item, actor);
            }
```

Change `addItems`'s signature and add fan-out before `return { added: …, skipped };`:
```typescript
    async addItems(
        title: string,
        rawItems: Array<{ itemName: string; quantity?: number; unit?: string; dateAdded: Date }>,
        userId: string,
        actor?: User
    ): Promise<{ added: number; skipped: number }> {
```
…and after the existing `this.logger?.info('Items bulk added to list', …)` call:
```typescript
            if (actor && newItems.length > 0) {
                void this.notificationService?.notifyItemsAdded(
                    list,
                    newItems.map((i) => i.name),
                    actor
                );
            }
```

- [ ] **Step 5: Pass actor from handlers**

In `packages/api/src/interfaces/ListHandlers/index.ts`:

In `addItem`, change the service call to pass the actor:
```typescript
        const item = await getListService().addItem(title, itemName, dateAdded, quantity, unit, authenticatedUser);
```

In `addItems`, change the service call:
```typescript
        const result = await getListService().addItems(title, items, authenticatedUser.id, authenticatedUser);
```

- [ ] **Step 6: Wire DI**

In `packages/api/src/dependencies/index.ts`:

Add imports:
```typescript
import { NotificationService } from '../domain/NotificationService';
import { MongoPushSubscriptionRepository } from '../infrastructure/MongoPushSubscriptionRepository';
import { WebPushSender } from '../infrastructure/WebPushSender';
```

Register the three new singletons (place after the `ListRepository` registration, before `ListService`):
```typescript
    dependencyContainer.registerSingleton(
        DependencyToken.PushSubscriptionRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoPushSubscriptionRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.WebPushSender,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new WebPushSender(
                    config.get('vapidPublicKey'),
                    config.get('vapidPrivateKey'),
                    config.get('vapidSubject'),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.NotificationService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new NotificationService(
                    dependencyContainer.resolve(DependencyToken.PushSubscriptionRepository),
                    dependencyContainer.resolve(DependencyToken.WebPushSender),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );
```

Update the `ListService` registration to inject the notification service as the 6th arg:
```typescript
                return new ListService(
                    dependencyContainer.resolve(DependencyToken.ListRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.AuthClient),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    dependencyContainer.resolve(DependencyToken.AuthorizationService),
                    dependencyContainer.resolve(DependencyToken.NotificationService)
                );
```

- [ ] **Step 7: Run tests + type-check**

Run: `cd packages/api && bun test && cd /home/igors/imapps/shoppingo && bun run tsc --noEmit`
Expected: All API tests PASS, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/config packages/api/src/dependencies packages/api/src/domain/ListService packages/api/src/interfaces/ListHandlers
git commit -m "feat(api): fan out push notifications on list item add"
```

---

### Task 6: `PushHandlers` + routes

**Files:**
- Create: `packages/api/src/interfaces/PushHandlers/index.ts`
- Test: `packages/api/src/interfaces/PushHandlers/index.test.ts`
- Modify: `packages/api/src/routes/index.ts`

**Interfaces:**
- Consumes: DI tokens `PushSubscriptionRepository`, `WebPushSender`, `Logger`; Hono `Context<HonoVars>`.
- Produces: handlers `getVapidPublicKey`, `subscribe`, `unsubscribe`. Routes: `GET /api/push/vapid-public-key` (no auth), `POST /api/push/subscribe` (auth), `DELETE /api/push/subscribe` (auth).

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/interfaces/PushHandlers/index.test.ts`:

```typescript
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { getVapidPublicKey, subscribe, unsubscribe } from './index';

const makeCtx = (body: unknown, user = { id: 'u1', username: 'owner' }) => {
    const json = mock((payload: unknown, status: number) => ({ payload, status }));
    return {
        req: { json: async () => body },
        get: (_k: string) => user,
        json,
    } as never;
};

describe('PushHandlers', () => {
    let repo: { upsert: ReturnType<typeof mock>; deleteByEndpoint: ReturnType<typeof mock> };

    beforeEach(() => {
        repo = { upsert: mock(async () => {}), deleteByEndpoint: mock(async () => {}) };
        const logger = { info: () => {}, warn: () => {}, error: () => {} };
        dependencyContainer.register(DependencyToken.PushSubscriptionRepository, { useValue: repo } as never);
        dependencyContainer.register(DependencyToken.Logger, { useValue: logger } as never);
        dependencyContainer.register(DependencyToken.WebPushSender, {
            useValue: { isConfigured: () => true },
        } as never);
    });

    it('returns the configured VAPID public key', async () => {
        // config.vapidPublicKey is read via getVapidPublicKey; with no env it returns null publicKey
        const ctx = makeCtx(undefined);
        await getVapidPublicKey(ctx);
        expect((ctx as { json: ReturnType<typeof mock> }).json).toHaveBeenCalled();
    });

    it('upserts a subscription bound to the authenticated user', async () => {
        const ctx = makeCtx({ endpoint: 'e1', keys: { p256dh: 'p', auth: 'a' } });
        await subscribe(ctx);
        expect(repo.upsert).toHaveBeenCalledTimes(1);
        const saved = repo.upsert.mock.calls[0][0];
        expect(saved.endpoint).toBe('e1');
        expect(saved.userId).toBe('u1');
    });

    it('rejects a subscribe with a missing endpoint', async () => {
        const ctx = makeCtx({ keys: { p256dh: 'p', auth: 'a' } });
        await subscribe(ctx);
        expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('deletes a subscription by endpoint', async () => {
        const ctx = makeCtx({ endpoint: 'e1' });
        await unsubscribe(ctx);
        expect(repo.deleteByEndpoint).toHaveBeenCalledWith('e1');
    });
});
```

NOTE: if `dependencyContainer.register(..., { useValue })` is not the container's API, mirror whatever the *existing* handler tests use to inject fakes (grep `dependencyContainer` in `src/interfaces/**/*.test.ts`) and copy that exact pattern.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/interfaces/PushHandlers`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Write the implementation**

Create `packages/api/src/interfaces/PushHandlers/index.ts`:

```typescript
import { APIError } from '@imapps/api-utils/hono';
import type { PushSubscription } from '@shoppingo/types';
import type { Context } from 'hono';
import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { PushSubscriptionRepository } from '../../domain/PushSubscriptionRepository';
import type { HonoVars } from '../handlerUtils';

const getRepo = (): PushSubscriptionRepository =>
    dependencyContainer.resolve(DependencyToken.PushSubscriptionRepository);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

export const getVapidPublicKey = async (c: Context<HonoVars>) => {
    const publicKey = config.get('vapidPublicKey') ?? null;
    return c.json({ publicKey }, 200);
};

export const subscribe = async (c: Context<HonoVars>) => {
    const user = c.get('user');
    const logger = getLogger();
    const body = await c.req.json<{ endpoint?: string; keys?: { p256dh: string; auth: string } }>();

    if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
        return c.json({ error: 'endpoint and keys (p256dh, auth) are required' }, 400);
    }

    try {
        const sub: PushSubscription = {
            endpoint: body.endpoint,
            userId: user.id,
            keys: body.keys,
            dateAdded: new Date(),
        };
        await getRepo().upsert(sub);
        logger.info('Push subscription saved', { userId: user.id });
        return c.json({ success: true }, 201);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        logger.error('Failed to save push subscription', { userId: user.id, error: err.message });
        throw new APIError(err.message ?? 'Internal Server Error', err.status ?? 500);
    }
};

export const unsubscribe = async (c: Context<HonoVars>) => {
    const user = c.get('user');
    const logger = getLogger();
    const body = await c.req.json<{ endpoint?: string }>();

    if (!body?.endpoint) {
        return c.json({ error: 'endpoint is required' }, 400);
    }

    try {
        await getRepo().deleteByEndpoint(body.endpoint);
        logger.info('Push subscription removed', { userId: user.id });
        return c.json({ success: true }, 200);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        logger.error('Failed to remove push subscription', { userId: user.id, error: err.message });
        throw new APIError(err.message ?? 'Internal Server Error', err.status ?? 500);
    }
};
```

- [ ] **Step 4: Wire routes**

In `packages/api/src/routes/index.ts`:

Add import:
```typescript
import { getVapidPublicKey, subscribe, unsubscribe } from '../interfaces/PushHandlers';
```

Add routes (place after the labels routes):
```typescript
    router.get('/api/push/vapid-public-key', getVapidPublicKey);
    router.post('/api/push/subscribe', authenticate, subscribe);
    router.delete('/api/push/subscribe', authenticate, unsubscribe);
```

- [ ] **Step 5: Run tests + type-check**

Run: `cd packages/api && bun test && cd /home/igors/imapps/shoppingo && bun run tsc --noEmit`
Expected: All PASS, no TS errors.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/interfaces/PushHandlers packages/api/src/routes/index.ts
git commit -m "feat(api): add push subscribe/unsubscribe endpoints"
```

---

# Phase 2 — Web

### Task 7: Migrate PWA to `injectManifest` + custom service worker

> ⚠️ **Riskiest task.** The current `generateSW` build auto-generates the SW (precaching, NetworkFirst `/api/` + `config.json`, SKIP_WAITING handling for the update prompt). Moving to `injectManifest` means we own all of that. Preserve every behaviour or the offline/update flow breaks.

**Files:**
- Create: `packages/web/src/sw.ts`
- Modify: `packages/web/vite.config.ts`
- Modify: `packages/web/package.json` (via `bun add`)

**Interfaces:**
- Produces: a service worker that precaches `self.__WB_MANIFEST`, keeps the existing runtime caches, handles `SKIP_WAITING`, and adds `push` + `notificationclick` handlers. The `virtual:pwa-register/react` registration in `PWAContext.tsx` continues to work unchanged.

- [ ] **Step 1: Add Workbox deps**

```bash
cd packages/web && bun add -d workbox-precaching workbox-routing workbox-strategies workbox-core
```

- [ ] **Step 2: Write the custom service worker**

Create `packages/web/src/sw.ts`:

```typescript
/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

// Mirror the previous generateSW runtimeCaching config.
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 2 })
);
registerRoute(({ url }) => url.pathname === '/config.json', new NetworkFirst({ cacheName: 'config-cache' }));

// Preserve the update-prompt flow: the app posts SKIP_WAITING when the user accepts an update.
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        void self.skipWaiting();
    }
});

self.addEventListener('push', (event: PushEvent) => {
    if (!event.data) {
        return;
    }
    let payload: { title?: string; body?: string; data?: { url?: string } };
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'Shoppingo', body: event.data.text() };
    }

    event.waitUntil(
        self.registration.showNotification(payload.title ?? 'Shoppingo', {
            body: payload.body ?? '',
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            data: payload.data ?? {},
        })
    );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();
    const targetUrl = (event.notification.data as { url?: string })?.url ?? '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    void client.focus();
                    if ('navigate' in client) {
                        void (client as WindowClient).navigate(targetUrl);
                    }
                    return;
                }
            }
            return self.clients.openWindow(targetUrl);
        })
    );
});
```

- [ ] **Step 3: Switch the plugin to injectManifest**

In `packages/web/vite.config.ts`, inside the `VitePWA({ ... })` options:

- Add at the top of the options object:
```typescript
                strategies: 'injectManifest',
                srcDir: 'src',
                filename: 'sw.ts',
```
- Replace the `workbox: { ... }` block with an `injectManifest` block (the runtime caching now lives in `sw.ts`):
```typescript
                injectManifest: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
                },
```
- Keep `registerType: 'prompt'`, `injectRegister: 'auto'`, `selfDestroying: false`, the `manifest` block, and `devOptions` unchanged.

- [ ] **Step 4: Verify the build produces a valid SW**

Run: `cd packages/web && bun run build`
Expected: Build succeeds; `build/sw.js` exists and contains `precacheAndRoute`, `push`, and `notificationclick`.

Verify:
```bash
grep -l "notificationclick" packages/web/build/sw.js
```
Expected: prints the path (handler is present in the bundled SW).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/sw.ts packages/web/vite.config.ts packages/web/package.json
git commit -m "feat(web): migrate PWA to injectManifest with push handlers"
```

---

### Task 8: Web push API client + `urlBase64ToUint8Array` util

**Files:**
- Create: `packages/web/src/utils/push.ts`
- Test: `packages/web/src/utils/push.test.ts`
- Modify: `packages/web/src/api/index.ts`

**Interfaces:**
- Produces: `urlBase64ToUint8Array(base64: string): Uint8Array`; `getVapidPublicKey(): Promise<{ publicKey: string | null }>`; `subscribeToPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void>`; `unsubscribeFromPush(endpoint: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/utils/push.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
    it('decodes a standard base64url VAPID key to bytes', () => {
        const result = urlBase64ToUint8Array('SGVsbG8'); // "Hello"
        expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
    });

    it('handles base64url chars (- and _) and missing padding', () => {
        // bytes [255, 224] => base64 "/+A=" => base64url "_-A"
        const result = urlBase64ToUint8Array('_-A');
        expect(Array.from(result)).toEqual([255, 224]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && bun run test -- push.test`
Expected: FAIL — cannot resolve `./push`.

- [ ] **Step 3: Write the util**

Create `packages/web/src/utils/push.ts`:

```typescript
/** Convert a base64url VAPID public key into the Uint8Array PushManager.subscribe expects. */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && bun run test -- push.test`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the API client functions**

In `packages/web/src/api/index.ts`, append (these reuse the existing `makeRequest` + `MethodType` already imported at the top):

```typescript
export const getVapidPublicKey = async (): Promise<{ publicKey: string | null }> => {
    return await makeRequest({
        pathname: '/api/push/vapid-public-key',
        method: MethodType.GET,
        operationString: 'get vapid public key',
    });
};

export const subscribeToPush = async (subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}): Promise<void> => {
    return await makeRequest({
        pathname: '/api/push/subscribe',
        method: MethodType.POST,
        operationString: 'subscribe to push',
        body: JSON.stringify(subscription),
    });
};

export const unsubscribeFromPush = async (endpoint: string): Promise<void> => {
    return await makeRequest({
        pathname: '/api/push/subscribe',
        method: MethodType.DELETE,
        operationString: 'unsubscribe from push',
        body: JSON.stringify({ endpoint }),
    });
};
```

- [ ] **Step 6: Type-check + commit**

Run: `cd /home/igors/imapps/shoppingo && bun run tsc --noEmit`
Expected: no errors.

```bash
git add packages/web/src/utils/push.ts packages/web/src/utils/push.test.ts packages/web/src/api/index.ts
git commit -m "feat(web): add push api client and base64url util"
```

---

### Task 9: `usePushNotifications` hook

**Files:**
- Create: `packages/web/src/hooks/usePushNotifications.ts`
- Test: `packages/web/src/hooks/usePushNotifications.test.ts`

**Interfaces:**
- Consumes: `getVapidPublicKey`, `subscribeToPush`, `unsubscribeFromPush` (Task 8), `urlBase64ToUint8Array` (Task 8).
- Produces: `usePushNotifications(): { isSupported: boolean; permission: NotificationPermission; isSubscribed: boolean; isBusy: boolean; subscribe(): Promise<void>; unsubscribe(): Promise<void>; }`

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/hooks/usePushNotifications.test.ts`:

```typescript
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePushNotifications } from './usePushNotifications';

const subscribeToPush = vi.fn(async () => {});
const unsubscribeFromPush = vi.fn(async () => {});
const getVapidPublicKey = vi.fn(async () => ({ publicKey: 'BIl-key' }));

vi.mock('../api', () => ({
    subscribeToPush: (...args: unknown[]) => subscribeToPush(...args),
    unsubscribeFromPush: (...args: unknown[]) => unsubscribeFromPush(...args),
    getVapidPublicKey: () => getVapidPublicKey(),
}));

vi.mock('../utils/push', () => ({
    urlBase64ToUint8Array: () => new Uint8Array([1, 2, 3]),
}));

const makeSubscription = (endpoint: string) => ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: vi.fn(async () => true),
});

describe('usePushNotifications', () => {
    let pushManager: { getSubscription: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        subscribeToPush.mockClear();
        unsubscribeFromPush.mockClear();

        pushManager = {
            getSubscription: vi.fn(async () => null),
            subscribe: vi.fn(async () => makeSubscription('e-new')),
        };

        vi.stubGlobal('navigator', {
            serviceWorker: { ready: Promise.resolve({ pushManager }) },
        });
        vi.stubGlobal('Notification', {
            permission: 'default',
            requestPermission: vi.fn(async () => 'granted'),
        });
        vi.stubGlobal('PushManager', function () {});
    });

    it('reports support and an unsubscribed initial state', async () => {
        const { result } = renderHook(() => usePushNotifications());
        expect(result.current.isSupported).toBe(true);
        await waitFor(() => expect(result.current.isSubscribed).toBe(false));
    });

    it('subscribes: requests permission, calls PushManager, posts to the API', async () => {
        const { result } = renderHook(() => usePushNotifications());
        await act(async () => {
            await result.current.subscribe();
        });
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
        expect(subscribeToPush).toHaveBeenCalledWith({ endpoint: 'e-new', keys: { p256dh: 'p', auth: 'a' } });
        await waitFor(() => expect(result.current.isSubscribed).toBe(true));
    });

    it('unsubscribes: tears down the PushManager subscription and tells the API', async () => {
        const existing = makeSubscription('e-old');
        pushManager.getSubscription = vi.fn(async () => existing);

        const { result } = renderHook(() => usePushNotifications());
        await waitFor(() => expect(result.current.isSubscribed).toBe(true));

        await act(async () => {
            await result.current.unsubscribe();
        });
        expect(existing.unsubscribe).toHaveBeenCalledTimes(1);
        expect(unsubscribeFromPush).toHaveBeenCalledWith('e-old');
        await waitFor(() => expect(result.current.isSubscribed).toBe(false));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && bun run test -- usePushNotifications`
Expected: FAIL — cannot resolve `./usePushNotifications`.

- [ ] **Step 3: Write the hook**

Create `packages/web/src/hooks/usePushNotifications.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from '../api';
import { logger } from '../utils/logger';
import { urlBase64ToUint8Array } from '../utils/push';

const isPushSupported = (): boolean =>
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window;

export const usePushNotifications = () => {
    const [isSupported] = useState(isPushSupported);
    const [permission, setPermission] = useState<NotificationPermission>(
        isPushSupported() ? Notification.permission : 'denied'
    );
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isBusy, setIsBusy] = useState(false);

    useEffect(() => {
        if (!isSupported) return;
        void navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => setIsSubscribed(Boolean(sub)))
            .catch(() => setIsSubscribed(false));
    }, [isSupported]);

    const subscribe = useCallback(async () => {
        if (!isSupported || isBusy) return;
        setIsBusy(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result !== 'granted') return;

            const { publicKey } = await getVapidPublicKey();
            if (!publicKey) {
                logger.warn('Push not configured on the server (no VAPID key)');
                return;
            }

            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
            await subscribeToPush({ endpoint: json.endpoint, keys: json.keys });
            setIsSubscribed(true);
        } catch (error) {
            logger.error('Failed to subscribe to push', { error: (error as Error).message });
        } finally {
            setIsBusy(false);
        }
    }, [isSupported, isBusy]);

    const unsubscribe = useCallback(async () => {
        if (!isSupported || isBusy) return;
        setIsBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                const { endpoint } = sub;
                await sub.unsubscribe();
                await unsubscribeFromPush(endpoint);
            }
            setIsSubscribed(false);
        } catch (error) {
            logger.error('Failed to unsubscribe from push', { error: (error as Error).message });
        } finally {
            setIsBusy(false);
        }
    }, [isSupported, isBusy]);

    return { isSupported, permission, isSubscribed, isBusy, subscribe, unsubscribe };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && bun run test -- usePushNotifications`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/usePushNotifications.ts packages/web/src/hooks/usePushNotifications.test.ts
git commit -m "feat(web): add usePushNotifications hook"
```

---

### Task 10: Notification toggle in the hamburger menu

**Files:**
- Modify: `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx`
- Modify: `packages/web/src/components/ToolBar/HamburgerMenu/index.test.tsx`

**Interfaces:**
- Consumes: `usePushNotifications` (Task 9). Mirrors the existing `ThemeToggle` pattern in the same file.

- [ ] **Step 1: Write the failing test**

In `packages/web/src/components/ToolBar/HamburgerMenu/index.test.tsx`, add a mock + test. Match the existing test setup in this file (it already renders `HamburgerMenu` with the PWA hook mocked — copy that file's mocking style). Add:

```typescript
vi.mock('../../../hooks/usePushNotifications', () => ({
    usePushNotifications: () => ({
        isSupported: true,
        permission: 'default',
        isSubscribed: false,
        isBusy: false,
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
    }),
}));
```

and a test:

```typescript
it('renders the notifications toggle when push is supported', () => {
    render(
        <HamburgerMenu onManageUsers={() => {}} onClose={() => {}} onLogout={() => {}} />
    );
    expect(screen.getByText(/notifications/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && bun run test -- HamburgerMenu`
Expected: FAIL — no element matching `/notifications/i`.

- [ ] **Step 3: Add the toggle component + mount it**

In `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx`:

Add the import (alongside the existing `usePWA` import):
```typescript
import { Bell } from 'lucide-react';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
```
(Merge `Bell` into the existing `lucide-react` import line rather than adding a duplicate import.)

Add the component next to `ThemeToggle`:
```typescript
const NotificationToggle = () => {
    const { isSupported, isSubscribed, isBusy, subscribe, unsubscribe } = usePushNotifications();
    if (!isSupported) return null;

    const handleToggle = () => {
        if (isBusy) return;
        void (isSubscribed ? unsubscribe() : subscribe());
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isBusy}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
        >
            <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium">Notifications</span>
            </div>
            <Switch checked={isSubscribed} onCheckedChange={handleToggle} disabled={isBusy} />
        </button>
    );
};
```

Mount it after the `ThemeToggle` `MenuItem` (before the `UpdateButton` `MenuItem`):
```typescript
            <MenuItem delay={0.1}>
                <NotificationToggle />
            </MenuItem>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && bun run test -- HamburgerMenu`
Expected: PASS.

- [ ] **Step 5: Lint, type-check, commit**

Run: `cd /home/igors/imapps/shoppingo && bun run lint:fix && bun run tsc --noEmit`
Expected: clean.

```bash
git add packages/web/src/components/ToolBar/HamburgerMenu
git commit -m "feat(web): add notifications toggle to hamburger menu"
```

---

# Phase 3 — Verify

### Task 11: Generate VAPID keys + end-to-end manual verification

**Files:** none (operational).

- [ ] **Step 1: Generate VAPID keys**

```bash
cd packages/api && bunx web-push generate-vapid-keys
```
Copy the public/private keys into `.env`:
```
VAPID_PUBLIC_KEY=<public>
VAPID_PRIVATE_KEY=<private>
VAPID_SUBJECT=mailto:igorsiergiej@gmail.com
```

- [ ] **Step 2: Full suite green**

Run from repo root:
```bash
bun run lint && bun run tsc --noEmit && bun run --filter @shoppingo/api test && bun run --filter @shoppingo/web build && bun run --filter @shoppingo/api build
```
Expected: all succeed.

- [ ] **Step 3: Manual two-account check**

1. `bun run start`. Open the app in two browsers (or one normal + one private), logged in as two users who share a list.
2. As user B, open the hamburger menu → toggle **Notifications** on → accept the browser permission prompt.
3. Confirm via devtools (Application → Service Workers) that `sw.js` is active and a push subscription exists.
4. As user A, add an item to the shared list.
5. Expect user B to receive a system notification: title = list name, body = "A added <item>". Clicking it focuses/opens `/list/<title>`.
6. Close user B's tab entirely and repeat step 4 — the notification should still arrive (push is independent of an open tab).
7. **Coalescing:** as user A, quickly add 5+ items one-by-one. After ~8s user B should get a SINGLE notification like "A added Milk, Eggs, Bread and 2 more" — not five separate ones.

- [ ] **Step 4: Negative check (no VAPID)**

Temporarily blank the VAPID env vars, restart the API, add an item. Expect: no crash, a single "Web push not configured" warn in logs, the add still succeeds.

- [ ] **Step 5: Commit any env/docs tweaks**

```bash
git add -A && git commit -m "chore: document VAPID env for push notifications"
```

---

## Self-Review Notes

- **Coverage:** subscription storage (T2), sending (T3), fan-out incl. actor-exclusion + pruning (T4), trigger wiring (T5), HTTP surface (T6), SW push handling (T7), client plumbing (T8/T9), UI opt-in (T10), keys + e2e (T11). Friends migration is intentionally untouched — fan-out targets `list.users`, so when friends later constrains membership, push narrows automatically with zero changes here.
- **Type consistency:** `PushSubscription` shape (`endpoint`/`userId`/`keys`/`dateAdded`) is identical across types, repo, sender, handlers, hook. Send-result union `'ok' | 'gone' | 'error'` is shared between `WebPushSender` and `NotificationService`.
- **Coalescing caveat:** the debounce buffer (`NotificationService.buffers`) is in-memory and per-process. Fine for a single API replica. If the API is ever scaled to multiple replicas, adds routed to different pods won't merge — each pod sends its own notification. Revisit with a shared store (Redis) or sticky routing only if/when scaling out.
- **Container API caveat:** Task 6's test uses `dependencyContainer.register(..., { useValue })` as a placeholder — the implementer MUST grep an existing `interfaces/**/*.test.ts` and copy the real injection pattern before writing the test.
