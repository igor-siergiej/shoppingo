# QA audit

An audit of the quality gates in this repo, run against `main` at `2.4.0`
(2026-10-23) plus the work in flight on `feat/heatmap-preview-guest-funnel`.

The short version: **most of the repo's gates were not gates.** They ran, they
exited zero, and they proved nothing. An agent could make a change that broke
every type in the app and every documented command would still have said "fine".

## What was broken

### 1. The type check checked nothing

`bun run tsc --noEmit` was the documented type-check command in `AGENTS.md` and
in CI. It type-checks **zero files**:

- The root `tsconfig.json` has `"files": []` and only `references`. `tsc` without
  `--build` does not follow references, so it finds no files to check.
- `packages/api/tsconfig.json` extends the root config and inherits `"files": []`,
  so it also included nothing. Confirmed by injecting a deliberate
  `const x: number = "not a number"` into `packages/api/src/index.ts` and
  running `tsc -p packages/api/tsconfig.json --noEmit` — exit 0, no error.
- `packages/web/tsconfig.json` has the same `"files": []` shape. The web app's
  real config is `packages/web/tsconfig.app.json`, which does include `src`, but
  nothing pointed at it. `packages/web`'s build script runs `tsc && vite build`,
  and that `tsc` resolved to the empty `tsconfig.json` — so the build's type
  check was also a no-op. The same injected error passed `vite build` with exit 0.

**The real backlog was 302 type errors** — 170 in the API, 132 in the web app —
spread over 105 files, entirely invisible to every gate. The oldest reach back to
March 2026. Most are `noImplicitAny` gaps (62 in the web app alone) and
`react-hook-form` generics that drifted when the forms were rewritten.

### 2. Lint and dead-code failed locally and passed in CI

`bun run lint` exited 1 locally with *"Found a nested root configuration"*. The
root `biome.json` tried to exclude the `utils` submodule with
`files.experimentalScannerIgnores` — a Biome 1.x key that Biome 2.x rejects
(`biome explain files.experimentalScannerIgnores` → *"Unrecognized option"*).
It was silently ignored, so Biome walked into `.github/workflows-utils/`, found
that repo's own `biome.json`, and refused to run.

The same applied to `bunx fallow dead-code`, which reported **75 unused files**,
all inside the submodule.

CI never saw any of this: no workflow passed `submodules: recursive` to
`actions/checkout`, so in CI the submodule directory was empty. **The gates were
green in CI and broken on every developer's machine** — the worst possible
combination, because agents running the documented commands locally got a hard
failure while CI said the change was fine.

### 3. The e2e suite's rate-limit workaround did not work

`e2e/auth.ts` gave every sign-in its own client IP so the suite would not trip
Better Auth's sign-in limiter (10 per address per minute). The counter lived in a
module variable:

```ts
let ipCounter = 0;
```

Playwright gives each spec file its own module registry, so the counter restarted
at zero in every file and the suite handed out the same addresses again. By the
eleventh spec file, every sign-in failed with `429 Too many requests` and the
rest of the suite collapsed.

Proven directly: twelve spec files each signing in once with the address the
per-file counter produced gave `401` for the first two and `429` for the other
ten. The counter now lives on `globalThis`, which every spec file in the worker
shares; the same fourteen-file experiment now returns `401` for all fourteen.

The fix also holds across the real suite: a run of the fourteen spec files that
sign in (account-resilience through guest-mode, ~120 tests) produced **zero**
rate-limit failures, where the same files previously failed from the eleventh
file onwards.

### 4. `AGENTS.md` documented hooks that did not exist

`AGENTS.md` claimed:

> - **pre-commit**: Runs lint-staged on `*.{ts,tsx,json}` files
> - **commit-msg**: Validates commit message format via commitlint

Neither hook existed. `.husky/` held only `pre-push`; the `pre-commit` and
`commit-msg` files in `.husky/_/` are husky's own v9 stubs, which do nothing
without a matching file in `.husky/`. The `lint-staged` config and
`commitlint.config.js` were both present and both orphaned.

`AGENTS.md` also pointed at `.github/workflows/ci-cd.yml`, which does not exist
(the workflows are `pr.yml`, `cd.yml`, `load.yml`), and told agents to run
`bun run tsc --noEmit` as a type check.

### 5. The API build was neither idempotent nor test-safe

`packages/api`'s build script was `cp -r src build`. Two problems:

- **Not idempotent.** `cp -r src build` copies `src` *into* `build` when `build`
  already exists, so a second build produced `build/src/...` nested inside
  `build/`. Each further build added another level.
- **It copied the tests.** `build/` ended up with 90 `.test.ts` files, and Bun's
  test runner collects them. After a build, `bun run --filter @tandra/api test`
  ran **271 files / 3446 tests** instead of **91 files / 1150 tests** — every
  test twice, and after two builds three times. The duplicates also collide:
  `prom-client` throws *"A metric with the name tandra_api_http_requests_total
  has already been registered"* when a module is loaded from two paths.

The build now clears the directory first and excludes the test files, so it is
idempotent and the test run is the same whether or not a build has happened.

### 6. A bare `bun test` at the repo root was a trap

`bun test` with no arguments collects every file that looks like a test across
the whole repo: the 60 Playwright specs in `e2e/` and the 141 Vitest specs in
`packages/web/`. Neither runner can execute them, so the run failed with
**528 failures and 125 errors** — mostly *"Playwright Test did not expect
test.describe() to be called here"* and *"document is not defined"*. Nothing in
that output said anything about the repo.

A root `bunfig.toml` now scopes Bun's collection to the API package and preloads
the API's test setup, so `bun test` at the root runs the API suite (1 150
tests, green) instead of hundreds of meaningless failures.

### 7. Smaller things

- `packages/web/tsconfig.app.tsbuildinfo` was tracked in git. A build artifact.
- No CI job ran either package's build, so the build's (broken) `tsc` step never
  gated anything either.
- The `Release-Notes:` trailer is mandatory in `AGENTS.md` and had no enforcement.
  Every `feat`/`fix` commit in the recent history carried one by hand; nothing
  checked.
- The `fallow` complexity and duplication audit ran only from the `pre-push`
  hook, so an agent that committed without pushing never saw it.

## What changed

| Problem | Fix |
| --- | --- |
| Type check did nothing | `scripts/typecheck.js` — a real check per package, with the known backlog recorded in `scripts/typecheck-baseline.json`. Fails only on **new** errors; the backlog can be paid down without blocking work. `bun run typecheck` |
| Lint and dead-code failed locally only | `biome.json` drops the dead 1.x key and excludes the submodule properly; `.fallowrc.json` ignores it. CI now checks out the submodule, so CI and local agree |
| e2e rate limiter | The IP counter moved to `globalThis`, so it is unique across the whole run rather than per file |
| Documented hooks missing | `.husky/pre-commit` (lint-staged + type check) and `.husky/commit-msg` (commitlint) now exist and fire |
| `AGENTS.md` wrong | Corrected: the false hook claims, the non-existent workflow path, and the type-check command. Added a **Type Checking** section |
| No single command | `bun run verify` — lint, type-check, and every unit test suite, stopping at the first failure with the fix to apply. `bun run verify:fast` for lint and type-check only |
| `Release-Notes:` trailer unenforced | `scripts/check-release-notes.js` runs from the `commit-msg` hook and rejects a `feat`/`fix`/`perf` commit with no trailer. It reuses the release-notes collector's own parser, so the check and the notes cannot disagree |
| API build not idempotent, copied tests | `packages/api`'s build clears the directory first and excludes `*.test.ts`, so it can run twice and the test suite no longer runs the copies |
| Bare `bun test` at the root failed with 528 errors | A root `bunfig.toml` scopes Bun's collection to the API package and preloads its test setup. `bun run test` runs the API suite |
| Tracked build artifact | `packages/web/tsconfig.app.tsbuildinfo` untracked; `.gitignore` now covers `*.tsbuildinfo` |

## How the gates behave now

```
$ bun run verify
Verifying the change (5 checks)

── 1/5 lint ─────────────────────────────────────
── 2/5 type-check ───────────────────────────────
Type-check api: 170 errors
Type-check web: 132 errors
✅ No new type errors (302 known errors, all in the baseline)
── 3/5 api tests ─────────────────────────────────
── 4/5 web tests ─────────────────────────────────
── 5/5 script tests ──────────────────────────────
✅ All checks passed
```

A change that introduces a type error fails like this, with the file and line:

```
❌ New type error in packages/web/src/utils/logger.ts::TS2322 (baseline allows 0)
   packages/web/src/utils/logger.ts:157:14 TS2322: Type 'string' is not assignable to type 'number'.

❌ 1 new type error group introduced by this change
   (303 errors in total, 302 of them already in the baseline)
```

## The remaining gaps

These are real and were not fixed here:

- **302 type errors still exist.** The gate stops the backlog growing; it does not
  shrink it. `bun run typecheck:update` re-baselines, so paying errors down means
  fixing them and re-running that.
- **The e2e suite is slow and load-sensitive.** On a busy machine it fails on
  timeouts rather than on real defects. The suite has no per-test timeout budget
  beyond the 8 s default and no retry budget for a loaded runner.
- **Visual-regression baselines cannot be produced locally.** They are
  Linux-only and must be copied back from a CI artifact, so a visual change has
  no fast local loop.
- **`ErrorBoundary` and the service-worker update toast are untested.** Both are
  named in `e2e/COVERAGE.md` as known gaps; service workers are blocked in e2e.
- **The web package has no coverage gate.** The API has a 90 % line and function
  threshold; the web package has no coverage provider installed at all.

## What was verified

| Check | Result |
| --- | --- |
| `bun run lint` | exit 0 (5 pre-existing warnings) |
| `bun run typecheck` | exit 0 — 302 known errors, all in the baseline |
| `bun run typecheck` with an injected new error | exit 1, names file, line and code |
| `bun run verify --fast` | exit 0 |
| `bun run verify --fast` with an injected new error | exit 1 at the type-check step |
| `bun scripts/verify.js` | exit 0 — lint, type-check, API tests (1126), web tests (896), script tests (44) |
| API coverage gate | 95.32 % lines, 93.81 % functions — passes the 90 % threshold |
| `bun run --filter @tandra/web build` | exit 0 |
| `bun run --filter @tandra/api build` | exit 0 |
| `bun run --filter @tandra/api build` run twice | identical output, no `build/src` nesting, no test files in `build/` |
| `bun run tsc:e2e` | exit 0 |
| `bunx fallow@2.100.0 dead-code` | exit 0 — no issues |
| `bun run test` (root) | 1 150 tests across 91 files, 0 fail |
| `bun run --filter @tandra/api test` after a build | 1 150 tests across 91 files, 0 fail — the build no longer leaks copies into the run |
| `bun run test:scripts` | 44 pass, 0 fail |
| e2e (14 spec files, 127 tests) | 118 passed, 3 flaky, 1 failed — **0 rate-limit failures**; every failure was a timeout under load and passed on retry or in isolation |
| `.husky/pre-commit` | fires; runs lint-staged then the type-check gate |
| `.husky/commit-msg` | rejects a non-conventional message, accepts a conventional one |
| `bun run check:release-notes` | rejects a `feat`/`fix`/`perf` commit with no trailer, accepts one with it; `chore`/`test`/`docs` commits need no trailer; the release commit (`chore(release)`) is unaffected |
| `pr.yml` | parses; `lint` and `fallow-deadcode` now check out the submodule, `test` runs the type-check gate |

