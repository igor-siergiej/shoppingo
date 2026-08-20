# E2E tests

Playwright suite in this directory. Run via `bun run test:e2e` (all projects) from the repo root.

## Projects

- `chromium` — desktop functional tests (`e2e/tests/*.spec.ts`, excluding `*.visual.spec.ts`).
- `mobile-visual` — screenshot-diff regression tests at a mobile viewport (`devices['Pixel 7']`), matching only `e2e/tests/*.visual.spec.ts`.
- `desktop-visual` — the same visual spec files at a desktop viewport (`devices['Desktop Chrome']`) — kept as its own project (rather than reusing `chromium`) so its screenshots land in separate `-desktop-visual-linux.png` baseline files and `chromium`'s functional tests stay screenshot-free.

Currently the visual suite covers the `/recipes/new` flow (`recipe-form.visual.spec.ts`) — added after a real bug (PR #131) where that page's layout wasted vertical space and duplicated its header, only caught by manually emulating a phone.

## Updating visual baselines

Baselines are Linux-only (they're compared against GitHub Actions' `ubuntu-latest` runner) — **never commit a baseline generated on your own machine**, even if tests pass locally. Font rendering/anti-aliasing differs enough between Linux distros to cause spurious CI failures.

To add or intentionally update a baseline:

1. Push your change. Let the `e2e` CI job run and fail (missing/mismatched snapshot is expected here).
2. Download and extract the `playwright-report` artifact from the failed run (GitHub Actions run summary → Artifacts, or `gh run download <run-id> -n playwright-report`).
3. Serve it locally with `bunx playwright show-report <extracted-dir>` — the HTML report's UI is JS-driven and does not render correctly opened directly over a plain `file://` URL.
4. In the report UI, open each failed test and look at its attachments (actual/expected/diff images). The files on disk under the artifact's `data/` subdirectory are named by content hash, not `*-actual.png`, so identify which hashed file is which by the attachment slot it's shown under in the UI — or by cross-referencing the failure log's `Expected:`/`Received:` path lines, which do name the expected baseline path even though the actual file on disk is hash-named.
5. Copy the identified image into `e2e/tests/recipe-form.visual.spec.ts-snapshots/`, named exactly as the failure output says the expected path should be.
6. Commit the PNG(s) and push. CI should now pass.

For local iteration (checking your test logic works, *not* for producing the commit) use:

```bash
bun run test:e2e:update-snapshots
```

Then delete the locally-generated snapshot files before committing — they're only for sanity-checking that the test navigates correctly and captures the right screen at both viewports.
