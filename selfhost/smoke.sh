#!/usr/bin/env bash
# Smoke-test the self-host docker-compose stack:
# - brings everything up
# - waits until /api/health returns 200
# - confirms the web SPA loads
# - signs up a throwaway user through the built-in auth and reads the session back
# - leaves the stack running on success, tears down on failure
#
# Run from this directory: `./smoke.sh`

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WEB_PORT="${WEB_PORT:-4000}"
HEALTH_URL="http://localhost:${WEB_PORT}/api/health"
HOME_URL="http://localhost:${WEB_PORT}/"

if [[ ! -f .env ]]; then
    echo "❌ No .env found. Copy .env.example to .env and edit it first." >&2
    exit 1
fi

echo "▶ bringing stack up (web port $WEB_PORT)…"
docker compose up -d --remove-orphans

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        echo "❌ smoke failed — tearing stack down with logs"
        docker compose logs --tail=80 || true
        docker compose down -v --remove-orphans >/dev/null 2>&1 || true
    else
        echo "✅ smoke passed; stack left running. Use 'docker compose down' to stop."
    fi
    exit "$exit_code"
}
trap cleanup EXIT

echo "▶ waiting up to 90 s for $HEALTH_URL…"
for _ in $(seq 1 90); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
    if [[ "$code" == "200" ]]; then
        echo "✅ /api/health → 200"
        break
    fi
    sleep 1
done

if [[ "${code:-}" != "200" ]]; then
    echo "❌ /api/health never returned 200 (last code: ${code:-<no response>})" >&2
    exit 1
fi

home_code="$(curl -s -o /dev/null -w '%{http_code}' "$HOME_URL")"
if [[ "$home_code" != "200" ]]; then
    echo "❌ / returned $home_code, expected 200" >&2
    exit 1
fi
echo "✅ /  → 200"

# Built-in sign-in (Better Auth): create a throwaway account, then prove the session cookie works.
JAR="$(mktemp)"
SMOKE_USER="smoke_$(date +%s)"
signup_code="$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" \
    -H 'Content-Type: application/json' -H "Origin: http://localhost:${WEB_PORT}" \
    -d "{\"email\":\"${SMOKE_USER}@users.invalid\",\"name\":\"${SMOKE_USER}\",\"username\":\"${SMOKE_USER}\",\"password\":\"smoke-password-123\"}" \
    "http://localhost:${WEB_PORT}/api/auth/sign-up/email")"
if [[ "$signup_code" != "200" ]]; then
    echo "❌ /api/auth/sign-up/email returned $signup_code, expected 200 (BETTER_AUTH_URL must be http://localhost:${WEB_PORT})" >&2
    exit 1
fi
if ! curl -sf -b "$JAR" "http://localhost:${WEB_PORT}/api/auth/get-session" | grep -q "\"username\":\"${SMOKE_USER}\""; then
    echo "❌ session cookie from sign-up was not accepted by /api/auth/get-session" >&2
    exit 1
fi
rm -f "$JAR"
echo "✅ sign-up + session → ok (${SMOKE_USER})"
