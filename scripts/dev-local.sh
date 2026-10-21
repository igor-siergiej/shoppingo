#!/usr/bin/env bash
# Compose the local-only dev stack:
#   - Mongo + RustFS (S3-compatible object store) from selfhost/docker-compose (dev infra only — no api/web images)
#   - API on :4001 with built-in sign-in (Better Auth, dev secret)
#   - Web on :4000
#
# A fresh clone reaches a logged-in list in four commands:
#
#   git clone https://github.com/igor-siergiej/shoppingo
#   cd shoppingo
#   bun install
#   bun run dev:local            # web on http://localhost:4000
#
# The api/web load environment from .env (or .env.example as a starting point).
# Accounts are created through the web's register page. Use this when you want a
# fast inner loop without pulling the published web/api images; the full
# self-host stack (web + api + mongo + rustfs from published images)
# still lives in selfhost/docker-compose.yml.

set -euo pipefail

if [[ "${NODE_ENV:-}" == "production" ]]; then
    echo "dev:local refuses to run under NODE_ENV=production (dev-only Better Auth secret)." >&2
    exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERE="$ROOT/scripts"
COMPOSE_FILE="$ROOT/selfhost/docker-compose.yml"
# The compose file requires RustFS credentials and a Better Auth secret (only the api service uses the secret,
# but compose interpolates the whole file), normally from selfhost/.env. Default to dev values only when that
# file is absent: exported shell env would otherwise override it.
if [[ ! -f "$ROOT/selfhost/.env" ]]; then
    export RUSTFS_ACCESS_KEY="${RUSTFS_ACCESS_KEY:-rustfsadmin}"
    export RUSTFS_SECRET_KEY="${RUSTFS_SECRET_KEY:-rustfsadmin}"
    export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-dev-local-better-auth-secret-not-for-prod}"
fi

WEB_PORT="${WEB_PORT:-4000}"
API_PORT="${API_PORT:-4001}"

if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
    echo "==> No .env found; copying .env.example to .env (edit it before re-running for real secrets)" >&2
    cp "$ROOT/.env.example" "$ROOT/.env"
fi

mkdir -p "$HERE/logs"

cleanup() {
    set +e
    echo
    echo "==> Stopping web + api"
    [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null
    [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null
    wait 2>/dev/null
    echo "==> Stopping Mongo + RustFS"
    docker compose -f "$COMPOSE_FILE" stop mongo rustfs >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "==> Starting Mongo + RustFS (selfhost/docker-compose, dev infra only)"
docker compose -f "$COMPOSE_FILE" up -d mongo rustfs rustfs-init >/dev/null

# Wait for the object store to be reachable on the host. The rustfs-init one-shot only succeeds once rustfs is up.
for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:9000/health/ready" >/dev/null 2>&1; then break; fi
    sleep 0.5
done
if ! curl -sf "http://127.0.0.1:9000/health/ready" >/dev/null; then
    echo "RustFS did not come up; see docker logs shoppingo-selfhost-rustfs-1" >&2
    exit 1
fi

echo "==> Starting api on :${API_PORT} (logs: $HERE/logs/api.log)"
(
    cd "$ROOT"
    dotenv -e .env -- \
        env NODE_ENV=development \
            PORT="$API_PORT" \
            BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-dev-local-better-auth-secret-not-for-prod}" \
            BETTER_AUTH_URL="http://localhost:${WEB_PORT}" \
            BUCKET_ENDPOINT="localhost:9000" \
        bun run --filter @shoppingo/api start
) >"$HERE/logs/api.log" 2>&1 &
API_PID=$!
for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then break; fi
    sleep 0.5
done
if ! curl -sf "http://127.0.0.1:${API_PORT}/api/health" >/dev/null; then
    echo "api did not come up; see $HERE/logs/api.log" >&2
    exit 1
fi

echo "==> Starting web on :${WEB_PORT} (logs: $HERE/logs/web.log)"
(
    cd "$ROOT"
    dotenv -e .env -- \
        env PORT="$WEB_PORT" \
        bun run start:web
) >"$HERE/logs/web.log" 2>&1 &
WEB_PID=$!
for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then break; fi
    sleep 0.5
done

cat <<EOF

dev:local is up:
  web:    http://localhost:${WEB_PORT}
  api:    http://localhost:${API_PORT}/api/health
  logs:   $HERE/logs/{web,api}.log

Open http://localhost:${WEB_PORT} and register a new account (any username + 6+ char password).
Press Ctrl-C to stop.
EOF

wait
