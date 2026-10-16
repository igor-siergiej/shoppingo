# Shoppingo

[![PR checks](https://github.com/igor-siergiej/shoppingo/actions/workflows/pr.yml/badge.svg)](https://github.com/igor-siergiej/shoppingo/actions/workflows/pr.yml)

A shared shopping-list PWA built around how people actually shop: plan from
recipes, or just add things to a list — either way the list is one tap away in
the shop, works offline, and stays in sync with whoever you share it with.

**Live:** https://shoppingo.imapps.uk

<!-- TODO: replace with a screenshot or short GIF of the lists + recipe flow.
     The kanban card shoppingo-contributor-onboarding tracks this; designers
     and PRs welcome. -->

## Goal

Give a household one shared place to do the shopping together, so everyone stays organised. For home cooks, make it easy to discover new recipes and to keep their own recipes in one place where they are simple to maintain and keep track of.

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contributor-focused setup.
For a quick local-only spin-up:

```bash
bun install
cp .env.example .env
docker compose -f selfhost/docker-compose.yml up -d \
    mongo minio minio-init               # dev infra only — no published images
bun run start                            # web on :4000, api on :4001
```

The full self-host stack (web + api + mongo + minio + kivo from published
images) lives in `selfhost/docker-compose.yml`; see
[Self-hosting](#self-hosting) below.

```bash
bun run lint                                       # Biome
bunx tsc -p packages/api/tsconfig.json --noEmit    # API types
bunx tsc -p packages/web/tsconfig.app.json --noEmit # web types
bun run --filter @shoppingo/api test               # Bun runner; 90 % coverage gate
bun run --filter @shoppingo/web test               # Vitest component tests
bun run test:e2e                                   # Playwright; needs the dev stack
bun run load:local                                 # k6 (manual; see scripts/load)
```

## Contributing

Bug reports, feature requests and PRs welcome — start with
[CONTRIBUTING.md](./CONTRIBUTING.md) for the dev setup, commit format and PR
flow. The
[`good first issue`](https://github.com/igor-siergiej/shoppingo/issues?q=is%3Aopen+label%3A%22good+first+issue%22)
label picks out small, contained starting points.

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

## Self-hosting

Everything published to Docker Hub. `selfhost/docker-compose.yml` brings up
web, api, mongo, minio and kivo with one command:

```bash
cp selfhost/.env.example selfhost/.env
$EDITOR selfhost/.env          # at minimum set MINIO_ROOT_USER + MINIO_ROOT_PASSWORD
cd selfhost
docker compose up -d           # web on http://localhost:4000
./smoke.sh                     # waits for /api/health, then exits 0
```

The web container proxies `/api/*` to the api container via nginx
(`packages/web/nginx.conf`), so a single host port forwards both the SPA and
the API. Mongo and MinIO persist into named volumes (`mongo-data`, `minio-data`).
A one-shot `minio-init` container creates the configured bucket on first run.

`FAL_KEY` is optional. Without it, recipe-import (URL → recipe), AI image
generation and substitute suggestions call Fal.ai with no key and fail
upstream; the rest of the app — lists, recipes, calendar, sharing,
PWA/offline — works exactly as it does in production.

Backups: `docker compose exec -T mongo mongodump --archive` (or
`mongodump` to a mounted dir) for MongoDB, and a `mc mirror` of the configured
bucket for MinIO. Restore with the matching `mongorestore` and `mc mirror`
pair. Both volumes live in the `docker-compose.yml` named volumes; keep their
host paths in the same backup.

Upgrades: `docker compose pull && docker compose up -d` rolls the `web`,
`api`, and `kivo` images to their `:latest` tag while reusing the data
volumes. Mongo and MinIO stay on the image tags pinned in the compose file
until you change them — pin those versions deliberately.

## Licence

AGPL-3.0-or-later. See [LICENSE](LICENSE).
