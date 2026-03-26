# PWA Update Notification — Design Spec

## Context

The app uses `vite-plugin-pwa` with `registerType: 'autoUpdate'` and `skipWaiting: true`, causing silent background updates that sometimes require a manual cache clear. This adds a user-controlled update flow: a dismissible toast appears when a new version is detected, and a fallback button lives in the hamburger menu if the toast is dismissed.

---

## Architecture

### 1. `vite.config.ts`

- Change `registerType: 'autoUpdate'` → `'prompt'`
- Remove `skipWaiting: true` from workbox config

This makes the new service worker wait (instead of immediately taking over), so `onNeedRefresh` fires and the user can decide when to apply the update.

### 2. `usePWA.ts`

Replace silent auto-update with user-controlled flow:

- `onNeedRefresh` → set `hasUpdate = true`, fire a sonner toast with message "A new version is available" and an "Update" action button
- `updateApp()` → set `isUpdating = true`, call `updateServiceWorker(true)` (triggers SW skip-waiting + page reload)
- `dismissUpdate()` → dismiss toast; `hasUpdate` stays `true` so the hamburger button persists
- Export `hasUpdate: boolean` and `isUpdating: boolean`

Toast is shown once via `toast()` from sonner with a custom `action` prop (Update button) and `onDismiss` calling `dismissUpdate()`.

### 3. `AppInitializer/index.tsx`

Add `usePWA()` call. When `isUpdating` is true, render `<LoadingPage />` via the existing `AnimatePresence` block — same pattern as the auth loading state. The loading page shows until the browser reloads after the SW takes over.

```
AnimatePresence:
  isUpdating → <LoadingPage key="updating" />
  !isReady   → <LoadingPage key="loading" timeoutReached={...} />
  ready      → <motion.div>{children}</motion.div>
```

### 4. `HamburgerMenu/index.tsx`

Add an "Update available" button (same style as "Install app") that:
- Renders when `hasUpdate` is true
- Calls `updateApp()` on click and closes the menu
- Uses `RefreshCw` icon from lucide-react

---

## Data Flow

```
SW detects new version
  → onNeedRefresh fires
  → hasUpdate = true
  → sonner toast shown (Update button + dismissible)

User clicks "Update" (toast or hamburger):
  → isUpdating = true
  → LoadingPage (pizza spinner) shown
  → updateServiceWorker(true) called
  → SW skips waiting, page reloads

User dismisses toast:
  → hasUpdate stays true
  → "Update available" button appears in HamburgerMenu
```

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/vite.config.ts` | `registerType: 'prompt'`, remove `skipWaiting: true` |
| `packages/web/src/hooks/usePWA.ts` | Full rework — update state, toast, export `hasUpdate`/`isUpdating` |
| `packages/web/src/components/AppInitializer/index.tsx` | Add `usePWA`, show `LoadingPage` when `isUpdating` |
| `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx` | Add "Update available" button |

---

## Verification

1. Build the app and serve with a local static server
2. Change any source file, rebuild — new SW should register
3. On reload, toast should appear with "Update" button
4. Clicking Update should show pizza spinner, then reload to new version
5. On a fresh load, dismiss the toast — hamburger menu should show "Update available"
6. Clicking it from hamburger should show spinner and reload
