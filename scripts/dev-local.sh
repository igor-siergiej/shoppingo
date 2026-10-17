#!/usr/bin/env bash
# Compose the local-only dev stack:
#   - Mongo + MinIO from selfhost/docker-compose (dev infra only — no api/web/kivo images)
#   - Self-hosted mock kivo on 127.0.0.1:3099 (refuses NODE_ENV=production, plain-text creds)
#   - API on :4001 pointed at the mock kivo
#   - Web on :4000
#
# A fresh clone reaches a logged-in list in four commands:
#
#   git clone https://github.com/igor-siergiej/shoppingo
#   cd shoppingo
#   bun install
#   bun run dev:local            # web on http://localhost:4000
#
# The api/web load environment from .env (or .env.example as a starting point),
# and the mock is the AUTH_URL referenced by the api. Use this when you want a
# fast inner loop without pulling the published web/api images; the full
# self-host stack (web + api + mongo + minio + kivo from published images)
# still lives in selfhost/docker-compose.yml.

set -euo pipefail

if [[ "${NODE_ENV:-}" == "production" ]]; then
    echo "dev:local refuses to run under NODE_ENV=production (localhost-only mock, http://AUTH_URL)." >&2
    exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERE="$ROOT/scripts"
COMPOSE_FILE="$ROOT/selfhost/docker-compose.yml"

WEB_PORT="${WEB_PORT:-4000}"
API_PORT="${API_PORT:-4001}"
KIVO_PORT="${MOCK_KIVO_PORT:-3099}"

if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
    echo "==> No .env found; copying .env.example to .env (edit it before re-running for real secrets)" >&2
    cp "$ROOT/.env.example" "$ROOT/.env"
fi

mkdir -p "$HERE/logs"

cleanup() {
    set +e
    echo
    echo "==> Stopping web + api + mock"
    [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null
    [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null
    [[ -n "${KIVO_PID:-}" ]] && kill "$KIVO_PID" 2>/dev/null
    wait 2>/dev/null
    echo "==> Stopping Mongo + MinIO"
    docker compose -f "$COMPOSE_FILE" stop mongo minio >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "==> Starting Mongo + MinIO (selfhost/docker-compose, dev infra only)"
docker compose -f "$COMPOSE_FILE" up -d mongo minio minio-init >/dev/null

# Wait for MinIO to be reachable on the host. The minio-init one-shot only succeeds once minio is up.
for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:9000/minio/health/ready" >/dev/null 2>&1; then break; fi
    sleep 0.5
done
if ! curl -sf "http://127.0.0.1:9000/minio/health/ready" >/dev/null; then
    echo "MinIO did not come up; see docker logs shoppingo-selfhost-minio-1" >&2
    exit 1
fi

echo "==> Starting mock kivo on http://127.0.0.1:${KIVO_PORT}"
PORT="$KIVO_PORT" NODE_ENV=development bun "$HERE/mock-kivo/bin.ts" >"$HERE/logs/mock-kivo.log" 2>&1 &
KIVO_PID=$!
for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${KIVO_PORT}/health" >/dev/null 2>&1; then break; fi
    sleep 0.2
done
if ! curl -sf "http://127.0.0.1:${KIVO_PORT}/health" >/dev/null; then
    echo "mock kivo did not come up; see $HERE/logs/mock-kivo.log" >&2
    exit 1
fi

echo "==> Starting api on :${API_PORT} (logs: $HERE/logs/api.log)"
(
    cd "$ROOT"
    dotenv -e .env -- \
        env NODE_ENV=development \
            PORT="$API_PORT" \
            AUTH_URL="http://127.0.0.1:${KIVO_PORT}" \
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
            AUTH_URL="http://127.0.0.1:${KIVO_PORT}" \
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
  kivo:   http://127.0.0.1:${KIVO_PORT} (mock, localhost only)
  logs:   $HERE/logs/{web,api,mock-kivo}.log

Open http://localhost:${WEB_PORT} and register a new account (any username + 6+ char password).
Press Ctrl-C to stop.
EOF

wait
