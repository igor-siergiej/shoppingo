#!/usr/bin/env bash
# Compose the local-only stack:
#   - Mongo + MinIO from selfhost/docker-compose (re-using what already exists;
#     no fresh images published)
#   - Self-hosted mock kivo on :3099 (localhost-only, refuses NODE_ENV=production)
#   - Web on :4000 and API on :4001 pointed at the mock
#
# Refuses to run under NODE_ENV=production so a careless operator can't launch
# this in a prod-likely shell. A fresh clone reaches a logged-in list in four
# commands:
#
#   git clone https://github.com/igor-siergiej/shoppingo
#   cd shoppingo
#   bun install
#   bun run dev:local        # web on http://localhost:4000
#
# The web/API load environment from .env (or its example), and the mock is the
# AUTH_URL referenced by both.

set -euo pipefail

if [[ "${NODE_ENV:-}" == "production" ]]; then
    echo "dev:local refuses to run under NODE_ENV=production (localhost-only mock, http://AUTH_URL)." >&2
    exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERE="$ROOT/scripts"
COMPOSE_FILE="$ROOT/selfhost/docker-compose.yml"

# env -i: a developer's FAL_KEY etc. cannot accidentally reach the dev mock.
# Only the variables the api/web actually need are exposed.
WEB_PORT="${WEB_PORT:-4000}"
API_PORT="${API_PORT:-4001}"
KIVO_PORT="${MOCK_KIVO_PORT:-3099}"

echo "==> Starting Mongo + MinIO (selfhost/docker-compose, dev infra only)"
docker compose -f "$COMPOSE_FILE" up -d mongo minio minio-init >/dev/null

cleanup() {
    set +e
    echo "==> Stopping web + api + mock"
    [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null
    [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null
    [[ -n "${KIVO_PID:-}" ]] && kill "$KIVO_PID" 2>/dev/null
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

mkdir -p "$HERE/logs"

echo "==> Starting mock kivo on http://127.0.0.1:${KIVO_PORT} (see scripts/mock-kivo/)"
PORT="$KIVO_PORT" NODE_ENV=development bun "$HERE/mock-kivo/bin.ts" >"$HERE/logs/mock-kivo.log" 2>&1 &
KIVO_PID=$!
for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${KIVO_PORT}/verify" >/dev/null 2>&1; then break; fi
    sleep 0.2
done
if ! curl -sf "http://127.0.0.1:${KIVO_PORT}/verify" >/dev/null; then
    echo "mock kivo did not come up; see $HERE/logs/mock-kivo.log" >&2
    exit 1
fi

echo "==> Starting api on :${API_PORT}"
(
    cd "$ROOT"
    env -i PATH="$PATH" HOME="$HOME" \
        NODE_ENV=development \
        PORT="$API_PORT" \
        AUTH_URL="http://127.0.0.1:${KIVO_PORT}" \
        bun run --filter @shoppingo/api start
) >"$HERE/logs/api.log" 2>&1 &
API_PID=$!

echo "==> Starting web on :${WEB_PORT}"
(
    cd "$ROOT"
    env -i PATH="$PATH" HOME="$HOME" \
        NODE_ENV=development \
        PORT="$WEB_PORT" \
        AUTH_URL="http://127.0.0.1:${KIVO_PORT}" \
        bun run start:web
) >"$HERE/logs/web.log" 2>&1 &
WEB_PID=$!

echo
echo "dev:local is up:"
echo "  web:    http://localhost:${WEB_PORT}"
echo "  api:    http://localhost:${API_PORT}/api/health"
echo "  kivo:   http://127.0.0.1:${KIVO_PORT} (mock, localhost only)"
echo "  logs:   $HERE/logs/{web,api,mock-kivo}.log"
echo
echo "Open http://localhost:${WEB_PORT} and register a new account (any username + 6+ char password)."
echo "Press Ctrl-C to stop."

wait
