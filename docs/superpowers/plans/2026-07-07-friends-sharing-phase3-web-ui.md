# Friends Sharing — Phase 3: Web UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the friends experience in the React app — a `/friends` page reachable from the bottom-nav, an `AddFriendDrawer` (invite code + enter code) opened by the app-bar center `+`, per-friend share controls, and replacement of every username-search share UI with a friends-only `FriendPicker`.

**Architecture:** Reuse the existing bottom-nav pattern: add a `Users` nav icon routing to `/friends` and a context-aware center `+` slot (`friendDrawer`) that renders `AddFriendDrawer` on that page. New `FriendsPage` + `FriendDetail`. A reusable `FriendPicker` (Switch/Badge over `GET /api/friends`) replaces the free-text username inputs in `AddListDrawer`, `AddRecipeDrawer`, `ManageUsersDrawer`, and adds a share section to `AddTodoDrawer`. Data via the existing API client + React Query.

**Tech Stack:** React 19, React Router, React Query, shadcn/ui (adds `InputOTP`/`input-otp`), Tailwind v4 tokens (`bg-primary`, etc.), Bun `bun:test` + Testing Library (match existing web tests, e.g. `hooks/useCreateList.test.tsx`).

## Global Constraints

- Bun 1.x. Web tests: `bun run --filter @shoppingo/web test`; single file: `cd packages/web && bun test <path>`.
- Tests import from `bun:test` only; match the existing web test style.
- Style with **token utility classes** (`bg-primary`, `text-muted-foreground`, `border-border`, `rounded-lg`) — never raw colors. shadcn components come from `../../components/ui/*`.
- **No username search anywhere** and **no QR** — friends-only pickers; code entry via `InputOTP`.
- Share selections are **friend user-ids**, not usernames. Create sheets seed friends **toggled on** (opt-out).
- Run `bun run lint:fix` and `bun run tsc --noEmit` before every commit.

---

### Task 1: API client — friends methods + queries

**Files:**
- Modify: `packages/web/src/api/index.ts`
- Modify: `packages/web/src/api/types.ts` if a new `MethodType` value is needed (it isn't — GET/POST/DELETE exist)

**Interfaces:**
- Consumes: `makeRequest`, `MethodType`, `User` from `@shoppingo/types`.
- Produces: `getFriendsQuery()`, `generateFriendCode()`, `redeemFriendCode(code)`, `unfriend(friendId)`.

- [ ] **Step 1: Add the client functions**

In `packages/web/src/api/index.ts` append:

```ts
export const getFriendsQuery = () => ({
    queryKey: ['friends'],
    queryFn: async (): Promise<Array<User>> =>
        makeRequest({ pathname: '/api/friends', method: MethodType.GET, operationString: 'get friends' }),
});

export const generateFriendCode = async (): Promise<{ code: string; expiresAt: string }> =>
    makeRequest({ pathname: '/api/friends/code', method: MethodType.POST, operationString: 'generate friend code' });

export const redeemFriendCode = async (code: string): Promise<{ friend: User }> =>
    makeRequest({
        pathname: '/api/friends/redeem',
        method: MethodType.POST,
        body: { code },
        operationString: 'redeem friend code',
    });

export const unfriend = async (friendId: string): Promise<void> =>
    makeRequest({
        pathname: `/api/friends/${friendId}`,
        method: MethodType.DELETE,
        operationString: 'unfriend',
    });
```

> Match `makeRequest`'s actual body/param names — open `api/makeRequest/` and mirror how `addList`/`updateList` pass a JSON body (the key may be `body`, `data`, or `payload`). Use the same key here.

- [ ] **Step 2: Type-check**

Run: `cd packages/web && bun run tsc --noEmit` (or root `bun run tsc --noEmit`)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api/index.ts
git commit -m "feat(web): friends API client methods"
```

---

### Task 2: Friends hooks

**Files:**
- Create: `packages/web/src/hooks/useFriends.ts`
- Create: `packages/web/src/hooks/useFriends.test.tsx`

**Interfaces:**
- Consumes: the Task 1 client + React Query.
- Produces: `useFriends()` → `{ friends, isLoading }`; `useRedeemFriendCode()` → mutation invalidating `['friends']`; `useUnfriend()` → mutation invalidating `['friends']` and item lists.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/hooks/useFriends.test.tsx` mirroring `useCreateList.test.tsx` (QueryClientProvider wrapper). Assert `useFriends` returns the mocked friends list and `useRedeemFriendCode` invalidates `['friends']` on success. (Copy the exact provider/wrapper boilerplate from `useCreateList.test.tsx`.)

- [ ] **Step 2: Run to verify fail**

Run: `cd packages/web && bun test src/hooks/useFriends.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/web/src/hooks/useFriends.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateFriendCode, getFriendsQuery, redeemFriendCode, unfriend } from '../api';

export const useFriends = () => {
    const { data, isLoading } = useQuery(getFriendsQuery());
    return { friends: data ?? [], isLoading };
};

export const useGenerateFriendCode = () => useMutation({ mutationFn: generateFriendCode });

export const useRedeemFriendCode = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: redeemFriendCode,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
    });
};

export const useUnfriend = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: unfriend,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['friends'] });
            qc.invalidateQueries({ queryKey: ['lists'] });
        },
    });
};
```

> Confirm the React Query import path used elsewhere (`@tanstack/react-query`) and match it.

- [ ] **Step 4: Run test + commit**

Run: `cd packages/web && bun test src/hooks/useFriends.test.tsx`
Expected: PASS.

```bash
git add packages/web/src/hooks/useFriends.ts packages/web/src/hooks/useFriends.test.tsx
git commit -m "feat(web): friends query + mutation hooks"
```

---

### Task 3: Add the shadcn `InputOTP` primitive

**Files:**
- Create: `packages/web/src/components/ui/input-otp.tsx` (shadcn source)
- Modify: `packages/web/package.json` (add `input-otp` dep)

**Interfaces:**
- Produces: `InputOTP`, `InputOTPGroup`, `InputOTPSlot` from `../../components/ui/input-otp`.

- [ ] **Step 1: Install the dependency**

Run: `cd packages/web && bun add input-otp`
Expected: `input-otp` added to `dependencies`.

- [ ] **Step 2: Add the component**

Create `packages/web/src/components/ui/input-otp.tsx` from the shadcn/ui registry source for `input-otp` (the standard `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator` wrappers over the `input-otp` package, using the repo's `cn` util from wherever other `ui/*` components import it). Match the import style of a sibling like `components/ui/input.tsx`.

- [ ] **Step 3: Type-check**

Run: `cd packages/web && bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ui/input-otp.tsx packages/web/package.json packages/web/bun.lock*
git commit -m "chore(web): add shadcn InputOTP primitive"
```

---

### Task 4: `FriendPicker` (reusable, friends-only)

**Files:**
- Create: `packages/web/src/components/FriendPicker/index.tsx`
- Create: `packages/web/src/components/FriendPicker/index.test.tsx`

**Interfaces:**
- Consumes: `useFriends` (Task 2), shadcn `Switch`, `Avatar`.
- Produces: `<FriendPicker value={string[]} onChange={(ids) => void} seedAllByDefault?: boolean />`. When `seedAllByDefault` and `value` is uncontrolled-empty on first render, it reports all friend ids on mount (auto-share). Each friend is a toggle row.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/FriendPicker/index.test.tsx`. Mock `useFriends` to return two friends. Assert: rows render for both; toggling one calls `onChange` with the updated id array; with `seedAllByDefault`, `onChange` is called with both ids on mount.

- [ ] **Step 2: Run to verify fail**

Run: `cd packages/web && bun test src/components/FriendPicker/index.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/web/src/components/FriendPicker/index.tsx`:

```tsx
import { useEffect } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Switch } from '../ui/switch';
import { useFriends } from '../../hooks/useFriends';

interface FriendPickerProps {
    value: string[];
    onChange: (ids: string[]) => void;
    seedAllByDefault?: boolean;
}

export const FriendPicker = ({ value, onChange, seedAllByDefault }: FriendPickerProps) => {
    const { friends, isLoading } = useFriends();

    useEffect(() => {
        if (seedAllByDefault && friends.length > 0 && value.length === 0) {
            onChange(friends.map((f) => f.id));
        }
        // seed once when friends first load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friends.length]);

    if (isLoading) return <p className="text-sm text-muted-foreground">Loading friends…</p>;
    if (friends.length === 0) {
        return <p className="text-sm text-muted-foreground">No friends yet — add one from the Friends tab to share.</p>;
    }

    const toggle = (id: string, on: boolean) =>
        onChange(on ? [...value, id] : value.filter((v) => v !== id));

    return (
        <div className="rounded-lg border border-border divide-y divide-border">
            {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="size-7">
                        <AvatarFallback>{f.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{f.username}</span>
                    <Switch
                        className="ml-auto"
                        checked={value.includes(f.id)}
                        onCheckedChange={(on) => toggle(f.id, on)}
                    />
                </div>
            ))}
        </div>
    );
};
```

> If the repo has no `components/ui/avatar.tsx`, add it via shadcn (same as Task 3) or fall back to a styled `<div>` initial. Check `components/ui/` first.

- [ ] **Step 4: Run test + commit**

Run: `cd packages/web && bun test src/components/FriendPicker/index.test.tsx`
Expected: PASS.

```bash
git add packages/web/src/components/FriendPicker/
git commit -m "feat(web): friends-only FriendPicker with auto-share seeding"
```

---

### Task 5: `AddFriendDrawer` — invite + enter code

**Files:**
- Create: `packages/web/src/components/ToolBar/AddFriendDrawer/index.tsx`
- Create: `packages/web/src/components/ToolBar/AddFriendDrawer/index.test.tsx`

**Interfaces:**
- Consumes: `useGenerateFriendCode`, `useRedeemFriendCode` (Task 2), shadcn `Drawer`, `Button`, `InputOTP` (Task 3), the existing `ToolBarButton` `+` trigger pattern (see `AddListDrawer`).
- Produces: `<AddFriendDrawer open onOpenChange />` with two modes.

- [ ] **Step 1: Write the failing test**

Create the test: render the drawer open in "Invite" mode → clicking "Invite a friend" calls the generate mutation and shows the returned code. Switch to "Enter code" → typing 6 chars + "Add friend" calls redeem; simulate a rejected redeem (status 410) and assert the expired-code error message renders.

- [ ] **Step 2: Run to verify fail**

Run: `cd packages/web && bun test src/components/ToolBar/AddFriendDrawer/index.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `packages/web/src/components/ToolBar/AddFriendDrawer/index.tsx`. Model the trigger/open wiring on `AddListDrawer` (the center `+` `ToolBarButton` inside a `Drawer`). Two segmented modes:

- **Invite:** button → `generateFriendCode()`; show `code` large in `font-mono text-3xl tracking-widest`, a countdown derived from `expiresAt` (a `setInterval` computing `mm:ss`, "Expired" at zero), and `Button`s "Share code" (`navigator.share?.({ text: code })` with clipboard fallback) + "Copy" (`navigator.clipboard.writeText(code)`).
- **Enter code:** `InputOTP maxLength={6}` with 6 `InputOTPSlot`s; "Add friend" → `redeemFriendCode(code)`. Map mutation error `status` to copy: `410 → "This code has expired."`, `409 → "Already used / you're already friends."`, `404 → "Code not found."`, `400 → "That's your own code."`, else generic. On success show a success state and close.

Use token classes throughout; wrap the drawer content root so it inherits the app theme (the app already applies the theme globally — no extra wrapper needed, unlike the design-sync previews).

- [ ] **Step 4: Run test + commit**

Run: `cd packages/web && bun test src/components/ToolBar/AddFriendDrawer/index.test.tsx`
Expected: PASS.

```bash
git add packages/web/src/components/ToolBar/AddFriendDrawer/
git commit -m "feat(web): AddFriendDrawer (invite code + enter code)"
```

---

### Task 6: `FriendsPage` + `FriendDetail` + route

**Files:**
- Create: `packages/web/src/pages/FriendsPage/index.tsx`
- Create: `packages/web/src/pages/FriendsPage/FriendDetail.tsx`
- Create: `packages/web/src/pages/FriendsPage/index.test.tsx`
- Modify: `packages/web/src/index.tsx` (add lazy import + child route `path: 'friends'`)

**Interfaces:**
- Consumes: `useFriends`, `useUnfriend`, `useConfirmation` (existing hook), `Card`/`Avatar`/`Button`/`Empty`.
- Produces: route `/friends` rendering the friends list; tapping a friend opens `FriendDetail` (per-item share toggles + destructive "Remove friend" with confirm → `useUnfriend`).

- [ ] **Step 1: Write the failing test**

Create `pages/FriendsPage/index.test.tsx`: mock `useFriends` with two friends; assert both render; assert the empty-state copy renders when the list is empty. (Match the render/provider boilerplate of an existing page test.)

- [ ] **Step 2: Run to verify fail**

Run: `cd packages/web && bun test src/pages/FriendsPage/index.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the page**

Create `pages/FriendsPage/index.tsx`: a `Card` list — each row `Avatar` (initial) + username + "friends since <month>" + chevron; empty state (shadcn `Empty` if present, else a centered muted message) pointing at the center `+`. Selecting a friend routes to / opens `FriendDetail`. Create `FriendDetail.tsx`: header with the friend, a list of items shared with them each with a `Switch` (wired to the per-item member add/remove endpoints from Phase 2 — `POST/DELETE /api/lists/:title/users`, recipe + todo equivalents), and a destructive `Button` "Remove friend" → `useConfirmation` dialog → `useUnfriend`.

- [ ] **Step 4: Register the route**

In `packages/web/src/index.tsx`:
- Add a lazy import beside the others: `const FriendsPage = lazy(() => import('./pages/FriendsPage'));` (match the existing lazy-import style; add a `default` export to the page or adapt).
- Add a child route in the `/` children array:

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

- [ ] **Step 5: Run test + commit**

Run: `cd packages/web && bun test src/pages/FriendsPage/index.test.tsx`
Expected: PASS.

```bash
git add packages/web/src/pages/FriendsPage/ packages/web/src/index.tsx
git commit -m "feat(web): FriendsPage, FriendDetail, and /friends route"
```

---

### Task 7: Bottom-nav integration — Friends icon + center `+`

**Files:**
- Modify: `packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx`
- Modify: `packages/web/src/components/ToolBar/index.tsx`

**Interfaces:**
- Consumes: `AddFriendDrawer` (Task 5).
- Produces: `isFriendsPage` prop + a `Users` nav button routing to `/friends`; a `friendDrawer` center slot rendered on the friends page.

- [ ] **Step 1: Add the nav icon + slot to `ToolBarAppBar`**

In `ToolBarAppBar/index.tsx`:
- Import `Users` from `lucide-react`.
- Add `isFriendsPage?: boolean;` and `friendDrawer?: ReactNode;` to `ToolBarAppBarProps` and destructure them.
- In the left nav group (the `<>` branch with ShoppingCart/BookOpen), add:

```tsx
                        <ToolBarButton
                            icon={Users}
                            title="Friends"
                            onClick={() => navigate('/friends')}
                            active={isFriendsPage}
                        />
```

- In the center add-slot group, add: `{isFriendsPage && friendDrawer}`.

- [ ] **Step 2: Wire it in `ToolBar`**

In `ToolBar/index.tsx`:
- Compute `const isFriendsPage = location.pathname === '/friends';`.
- Import `AddFriendDrawer` and add local open state (`const [isAddFriendDrawerOpen, setIsAddFriendDrawerOpen] = useState(false);`).
- Pass `isFriendsPage={isFriendsPage}` and the slot to `<ToolBarAppBar>`:

```tsx
                                friendDrawer={
                                    isFriendsPage ? (
                                        <AddFriendDrawer
                                            open={isAddFriendDrawerOpen}
                                            onOpenChange={setIsAddFriendDrawerOpen}
                                        />
                                    ) : undefined
                                }
```

- [ ] **Step 3: Type-check + manual check**

Run: `bun run tsc --noEmit`
Expected: PASS. Then `bun run start:web`, navigate to `/friends` — the `Users` icon is active and the center `+` opens `AddFriendDrawer`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx packages/web/src/components/ToolBar/index.tsx
git commit -m "feat(web): friends nav icon and center + AddFriendDrawer slot"
```

---

### Task 8: Replace username search with `FriendPicker` everywhere

**Files:**
- Modify: `packages/web/src/components/ToolBar/AddListDrawer/index.tsx`
- Modify: `packages/web/src/components/ToolBar/AddRecipeDrawer/index.tsx`
- Modify: `packages/web/src/components/ManageUsersDrawer/index.tsx`
- Modify: `packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx`
- Modify: the create callbacks/types that passed `users: string[]` usernames (e.g. `ToolBar` `onAddList`, `useCreateList`, recipe/todo add) to pass **friend ids**

**Interfaces:**
- Consumes: `FriendPicker` (Task 4).
- Produces: create sheets seed friends toggled on and submit friend ids; `ManageUsersDrawer` becomes a friends-only member manager; `AddTodoDrawer` gains a share section.

- [ ] **Step 1: AddListDrawer**

Remove the `useSearch`/"Search Users to Share With" block. Add local `const [shareWith, setShareWith] = useState<string[]>([]);` and render `<FriendPicker value={shareWith} onChange={setShareWith} seedAllByDefault />` under a "Share with" `Label`. Pass `shareWith` (friend ids) to the `onAdd(name, listType, shareWith)` callback. Update the callback type from usernames to ids up the chain (`ToolBar.onAddList`, `useCreateList`, and the API `addList` body → `friendIds`). Adjust the API `addList` to send `friendIds` and the API to seed accordingly (Phase 2 already validates ids).

- [ ] **Step 2: AddRecipeDrawer**

Same replacement: `FriendPicker` with `seedAllByDefault`; pass ids through `onAddRecipe(..., selectedFriendIds, ...)`.

- [ ] **Step 3: ManageUsersDrawer**

Replace the username-add form with `<FriendPicker value={memberIds} onChange={...} />` (no `seedAllByDefault` — reflects current members). Toggling a friend calls `POST /api/lists/:title/users { friendId }` / `DELETE /api/lists/:title/users/:userId`. Remove all `useSearch`/username lookup code.

- [ ] **Step 4: AddTodoDrawer**

Add a "Share with friends" `FriendPicker` (`seedAllByDefault`), submit `userIds` in the create-todo body (Phase 2 `createTodo` accepts `userIds`).

- [ ] **Step 5: Update/prune tests**

Update any tests referencing the old username search (e.g. `AddListDrawer` search test) to the `FriendPicker` flow. Delete `useSearch` usages that are now dead; if `useSearch` is unused elsewhere, remove it (check first).

- [ ] **Step 6: Full checks**

Run:
```bash
bun run lint:fix
bun run tsc --noEmit
bun run --filter @shoppingo/web test
bun run --filter @shoppingo/web build
```
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src
git commit -m "feat(web): friends-only sharing pickers replace username search"
```

---

## Self-Review

- **Spec coverage:** `/friends` page + `Users` nav + center `+` (Variant B, reuse app bar) ✓ (Tasks 6–7); `AddFriendDrawer` invite (code + 15-min countdown + share/copy) & enter-code (`InputOTP`, error states) ✓ (Tasks 3, 5); auto-share opt-out create sheets (`seedAllByDefault`) ✓ (Tasks 4, 8); `FriendPicker` replaces username search in list/recipe/manage-users + todo share section ✓ (Task 8); FriendDetail per-item toggles + remove-friend hard-revoke ✓ (Task 6); friends data/hooks ✓ (Tasks 1–2). No QR ✓.
- **Placeholders:** the `AddFriendDrawer`/`FriendDetail` bodies and shadcn `InputOTP`/`Avatar` sources are described against concrete siblings (`AddListDrawer`, `components/ui/input.tsx`) rather than pasted verbatim, because they must match repo-local `cn`/import conventions the implementer can read directly — each names the exact file to mirror and the exact props/behavior. Everything else is concrete code.
- **Type consistency:** `FriendPicker` props (`value: string[]`, `onChange`, `seedAllByDefault`) identical across Tasks 4 & 8. Friend-id (not username) flows end-to-end: API `friendIds` body ↔ Phase 2 `resolveSharedUsers(selectedFriendIds)`. `['friends']` query key consistent across client (Task 1) and hooks (Task 2). `AddFriendDrawer` open/onOpenChange props match the `AddListDrawer` drawer contract used in Task 7.
