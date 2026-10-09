# API capacity test (k6)

Finds how many concurrent user sessions the shoppingo API handles before latency or errors leave budget.
Run it locally on demand, or let the `Load` workflow run a short gated version on PRs (see "CI").

```bash
bun run load:local                       # ~4.5 min, needs docker, bun, the dev-mongodb container
STEPS=100,200,300 STEP_DURATION=20s bun run load:local
```

`run-local.sh` starts everything it needs and tears it down afterwards:

| Piece | What it is |
|---|---|
| API | `packages/api` on `:4101`, started with `env -i` (no `FAL_KEY`, no OpenSearch, nothing from `.env` except the Mongo URI) |
| Auth | `mock-kivo.ts` on `:3199` stands in for kivo's `/verify` (same idea as `e2e/global-setup.ts`) |
| Database | throwaway `shoppingo_k6` on the local dev Mongo; dropped on exit. The runner refuses non-localhost Mongo URIs |
| k6 | `grafana/k6` in Docker with `--network host`; no local k6 install |

Output lands in `scripts/load/results/<timestamp>/` (gitignored): `report.txt`, `summary.json`, `container-cpu.csv`, `api.log`.

## What a run does

- `setup()` creates `USERS` fixture users (`k6-<run>-user-N`), each owning `LISTS_PER_USER` lists with `ITEMS_PER_LIST` items, plus `BACKGROUND_LISTS` lists owned by one more fixture user so lookups run against a realistic collection size. Everything goes through the public API; no real user's data is read or written.
- `teardown()` deletes every list it created, then checks `/api/metrics` for AI calls.
- The load is an open-model ramp (`ramping-arrival-rate`) of *sessions per second*, one step per entry in `STEPS`. A session is: `GET /api/lists/user/:id`, `GET /api/lists/title/:title`, 50% `GET /api/recipes`, and in 35% of sessions add item, toggle it, delete it, re-read the list (~3.5-4.5 requests per session).
- Every request is tagged with its step, so the report gives p50/p95/p99, error rate, lost updates, API CPU and event-loop lag per step, then names the **cap** (last step inside budget) and the **first breach**.
- Budget: `P95_MS` (default 300) and `ERROR_RATE` (default 1%). By default the exit code stays 0 (measurement). Set `GATE_RATE=<sessions/s>` to turn the budget into a hard threshold (exit 99) for every step at or below that rate, for use as a regression gate.

## Auth: what the number includes

Auth is **always the isolated mock verifier**, so reported numbers exclude kivo. Why that is the useful number:

- `authenticate` caches a positive `/verify` result for 30 s per token (max 1000 entries), so kivo sees roughly one request per active user per 30 s, not one per API call.
- kivo's own limiter (`checkGlobalRateLimit`) allows 55 requests/min per client IP. shoppingo forwards `X-Forwarded-For`, so real users have separate buckets, but a load generator on one IP does not. A real-kivo run would measure that limit, not shoppingo.

## Zero AI spend

The script never calls `/api/recipes/import`, `/image/generate` or `/api/recipes/substitutes`, and the API in `run-local.sh` has no `FAL_KEY`. Independently, `teardown()` diffs the server's own counters (`shoppingo_api_http_requests_total` for those routes, `shoppingo_images_generated_total`) against a baseline taken in `setup()`. The `ai_calls_detected` and `ai_check_unavailable` thresholds fail the run if either moved or the check could not be made.

## Targets

`BASE_URL` may only be `localhost`, `127.0.0.1` or `host.docker.internal`; anything else aborts. There is no staging deployment of shoppingo or kivo, and production must never be load tested. Everything runs against a throwaway API and database.

## CI

`.github/workflows/load.yml` (workflow `Load`) runs on PRs that touch `packages/api/**`, `packages/types/**` or this directory, and on manual dispatch. It uses a Mongo service container, runs two steps (100 and 150 sessions/s, 20 s each) and fails with exit 99 if p95 >= 100 ms or errors >= 1% at either. Both steps are well below the ~200 sessions/s cap, where local p95 is 5-10 ms, so the gate catches order-of-magnitude regressions (a reintroduced collection scan, an N+1) and not small drifts: shared runners are too noisy for that. The report goes to the job summary and a `k6-report` artifact.

It is intentionally not in `kanban-cli`'s `ci.workflowNames` / `checkNamesRequired`, so it cannot block a merge. Make it a required check in branch protection once its numbers have proven stable on real runs. A stricter option is an A/B run (base and head back to back on the same runner, failing on a relative p95 increase); it doubles the runtime and is not built.

## Benchmarks

Local, isolated auth, 50 users x 5 lists x 15 items + 2000 background lists, budget p95 < 300 ms, 30 s per step. Host: 4 cores shared with the homelab's other containers (load average ~2), so absolute numbers are indicative and run-to-run noise is real: the 200 sessions/s step sits on the knee and p95 there ranged 9-111 ms across indexed runs.

| Date | Variant | Cap (sessions/s, ~req/s) | p95 at cap | First breach | Mongo CPU at breach |
|---|---|---|---|---|---|
| 2026-10-08 | no indexes on `list` | 200 (~720) | 225 ms | 300: p95 1.7 s | 100-120% (saturated) |
| 2026-10-08 | indexes added by hand to the throwaway DB | 200 (~730) | 9 ms | 300: p95 0.8 s | 55-75% |
| 2026-10-09 | `MongoListRepository.ensureIndexes` (current code) | 200 (~716) | 111 ms | 300: p95 1.4 s | 87% peak |

Throughput plateaus at ~900-1000 req/s in every variant; past that, extra offered load only adds queueing.

What this says:

1. **The limit is the single API process.** Bun runs the API on one thread; it reaches ~0.9 cores at the plateau and event-loop p99 lag climbs from 3 ms to 100-180 ms. Adding replicas is the lever, not Mongo.
2. **Missing indexes cost latency, not throughput.** Without indexes on `list.title` and `list.users.id` every request scanned the collection: below the knee (150 sessions/s) p95 is 23 ms without indexes vs 5-10 ms with. The API now creates them at startup, so production gets them on the next deploy.
3. **Lost updates under concurrent writes (correctness bug).** Item toggle / delete is read-modify-write on the whole list document (`ListService`: `getByTitle` then `replaceByTitle`). Concurrent edits to one list overwrite each other: a toggle or delete returns 404 for an item the same session had just added. The `lost` column counts them: 0 at 50 sessions/s, 2-8 at 100-200, 250-1300 per step past the cap. This is real for two phones editing one shared list, not only a load artefact. Tracked as `shoppingo-list-lost-updates` on the board.
4. kivo is out of this number by construction (see above).

## Not done yet

- **Real-kivo run.** There is no non-production kivo, so it is not possible without hitting production auth; kivo's 55/min/IP limit would also dominate the result.
- **Recipe indexes.** `MongoRecipeRepository` filters on `id` and `users.id` with no indexes either. The fixtures seed no recipes, so this is unmeasured; add recipe fixtures before indexing.
- **Prometheus/Grafana panel on the tank host.** The local runs read the same `/api/metrics` series via the sampler scenario; attach the Grafana panel for a run's time window if the API is ever load tested in a deployed environment.
