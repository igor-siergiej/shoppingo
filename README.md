# Shoppingo

[![PR checks](https://github.com/igor-siergiej/shoppingo/actions/workflows/pr.yml/badge.svg)](https://github.com/igor-siergiej/shoppingo/actions/workflows/pr.yml)

A shared shopping-list PWA built around how people actually shop: plan from
recipes, or just add things to a list — either way the list is one tap away in
the shop, works offline, and stays in sync with whoever you share it with.

**Live:** https://shoppingo.imapps.uk

<!-- TODO: add a screenshot or short GIF of the lists + recipe flow here -->

## What it does

- **Two ways in.** Build a shopping list directly (list-first), or start from a
  recipe and push its ingredients onto a list (recipe-first). Recipes can be
  added by hand or **imported from a link** — an LLM extracts the ingredients and
  method, and you edit and confirm before it saves.
- **Meal calendar.** Schedule recipes across the week; the calendar feeds the
  list.
- **Sharing.** Add friends and share individual lists or recipes; members see
  changes live.
- **Installable PWA.** Add to home screen, works offline with queued writes that
  sync when you reconnect, and registers as an Android share target so you can
  send a recipe URL straight into the import flow.

## Architecture

Bun-workspace monorepo — `packages/web`, `packages/api`, `packages/types`
(shared interfaces).

- **web** — React 19 + TypeScript + Vite. Tailwind + Radix/shadcn UI, React
  Query for server state, React Router, react-hook-form + Zod for forms,
  `vite-plugin-pwa` for the service worker / offline / share-target.
- **api** — Koa + TypeScript in a clean-architecture layout: `domain/`
  (services, entities), `infrastructure/` (MongoDB repositories, object store,
  image generators, auth client), `interfaces/` (HTTP handlers), `routes/`,
  `middleware/`, `dependencies/` (DI container).
- **data** — MongoDB (native driver). Images live in MinIO / S3-compatible
  object storage.
- **auth** — a separate service ([`kivo`](https://github.com/igor-siergiej/kivo))
  issues JWT access/refresh tokens. The web client refreshes transparently: a
  `401` triggers a token refresh and the original request is retried once
  (`packages/web/src/api/makeRequest`).
- **AI** — recipe import and image generation go through `fal.ai`
  (FLUX.1 [schnell]); Gemini and OpenAI image generators are also wired up
  behind the same interface.

## Running it

Requires **Bun 1.x**, a local **MongoDB** (`localhost:27017`), **MinIO**, and a
`FAL_KEY` for the AI features. Config lives in `.env`.

```bash
bun install
bun run start            # web on :4000, api on :4001
bun run start:with-mock  # same, with a mock auth server (no kivo needed)
```

```bash
bun run lint                              # Biome
bun run tsc --noEmit                      # type-check
bun run --filter @shoppingo/api test      # API tests (Bun runner, 90% threshold)
bun run --filter @shoppingo/web test      # web component tests
bun run test:e2e                          # Playwright, incl. visual regression
```

## CI/CD

- **`pr.yml`** on every PR: lint → API/web tests → Playwright e2e → report.
- **`cd.yml`** on merge to `main`: semantic-release (version + changelog) →
  Docker image build/publish → deploy webhook. Deployed on Dokploy.

## Decisions

- **Auth is its own service.** `kivo` is shared across several apps, so token
  issuing/refresh doesn't belong in this API. The cost is an extra hop on
  `verify`; the win is one place to reason about sessions.
- **Clean architecture in the API.** Handlers depend on domain services, not on
  MongoDB or a specific image provider — swapping either is a change in
  `infrastructure/` and `dependencies/` only.
- **Offline-first, not offline-tolerant.** The list has to work in a shop with no
  signal, so writes queue locally and reconcile on reconnect rather than failing.
- **AI stays behind an explicit action.** Import is a deliberate "paste a link"
  step and the result is always shown for edit before it's saved — no silent
  model output in your data.
- **Shared `@imapps/*` packages** for config, logging, DB and auth-client code
  that would otherwise be copy-pasted between apps.

## Licence

AGPL-3.0-or-later. See [LICENSE](LICENSE).
