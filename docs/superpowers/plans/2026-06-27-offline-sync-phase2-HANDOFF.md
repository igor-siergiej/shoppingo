# Handoff — Offline Sync Phase 2 (Offline List Creation)

**For:** a fresh agent picking up Phase 2 execution.
**Plan to execute:** `docs/superpowers/plans/2026-06-27-offline-sync-phase2.md` (4 TDD tasks).
**Branch:** continue on `feat/offline-sync-phase1` (Phase 1 already merged into this branch / open as PR #96), OR branch off it — see "Where to land it" below.

## What this is

Phase 2 adds **offline shopping-list creation** on top of the Phase 1 outbox engine. Create a list offline → it shows immediately and persists across reload → on reconnect the list (then its items) sync to the API in FIFO order. Lists are **title-addressed**, so there is no temp-id reconciliation.

## Context already in the repo (read these first)

- **Design spec:** `docs/superpowers/specs/2026-06-27-offline-sync-outbox-design.md` (whole feature; Phase 2 is in the rollout section).
- **Phase 1 plan (done):** `docs/superpowers/plans/2026-06-27-offline-sync-phase1.md`.
- **Phase 1 code (the engine you're extending), all under `packages/web/src/offline/`:** `outboxStore.ts` (IndexedDB queue + in-memory mirror), `intents.ts` (pure `applyItemIntent` — do NOT import `../api` here), `replay.ts` (`replayIntent`, the api-touching half), `drainer.ts` (`drainOutbox`/`startDrainer`), `foldPending.ts` (`foldPendingItems`). Item mutation hooks: `hooks/useItemMutations.ts`, `hooks/useItemPageMutations.ts`. App startup wiring: `components/AppInitializer/index.tsx`. Badge: `components/SyncStatusBadge/`.

## How to execute

Use **superpowers:subagent-driven-development** (same as Phase 1): one implementer subagent per task → review the diff → fix → next. The Phase 2 plan is self-contained with verbatim code and TDD steps per task.

Suggested per-task model: Task 1 (API) and Task 4 (page wiring) → `sonnet`; Tasks 2–3 (mechanical, full code given) → `sonnet` or cheaper. Final whole-branch review → `opus`.

## Hard-won gotchas (will bite you otherwise)

1. **Web tests = `vitest`, API tests = `bun:test`.** The root `CLAUDE.md` wrongly says everything uses `bun:test` — true for `packages/api` only. IndexedDB tests need `import 'fake-indexeddb/auto';` at the very top.
2. **CI merge gate = `bunx fallow@2.100.0 dead-code`.** It must be green. fallow ignores test files and `import 'x/auto'` deps, so any new test-only dep must go in `.fallowrc.json` `ignoreDependencies`, and any new export/file must actually be consumed by non-test code or it's flagged "unused". Phase 1's final review failed exactly this way (an unused hook + a test-only dep + an import cycle). **Keep `intents.ts` free of `../api` imports** — that cycle (`api → foldPending → intents → api`) is why `replay.ts` exists.
3. **Pre-push hook also runs fallow complexity** (file-scoped, flags pre-existing functions in files you touch). Complexity is NOT CI-gated — push with `git push --no-verify` if it blocks on complexity only, after confirming `dead-code` is green.
4. **Do not stage pre-existing untracked files:** `packages/api/tsconfig.check.json`, `docs/superpowers/plans/2026-06-06-*.md`. Stage only files you author; never `git add -A`.
5. **One known API test failure is pre-existing** (an auth network-failure mock) — not a regression; report counts but don't chase it.
6. **FIFO ordering is load-bearing:** `list.create` must replay before that list's `item.add`s. The queue is ordered by `seq`; do not add out-of-order draining. If an item ever replayed before its list existed, the API 404 + drop-if-gone would silently discard the item.
7. **Idempotent replay:** Task 1 makes API `addList` accept a client `id` and return the existing list if `(title, id)` already exists — mirrors the Phase 1 `item.add` client-id pattern. This is what makes a replay-after-lost-response safe.

## Where to land it

PR #96 is the Phase 1 PR. Decide with the user: (a) add Phase 2 commits onto `feat/offline-sync-phase1` so they ride in #96, or (b) stack a `feat/offline-sync-phase2` branch off it for a separate PR. Default assumption from the last conversation: same PR (#96).

## Definition of done

All 4 tasks committed; `bun run --filter @shoppingo/web test` green; `bun run tsc --noEmit` clean; `bunx fallow@2.100.0 dead-code` green; both builds pass; the DevTools smoke test in Task 4 Step 7 passes (create list offline → reload offline persists → reconnect syncs list-then-items).
