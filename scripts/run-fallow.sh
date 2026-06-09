#!/usr/bin/env bash
# Runs the fallow dead-code/complexity audit the same way CI does, so findings
# surface before pushing instead of after. Downloads the binary on first use.
set -euo pipefail

BIN_DIR=".tooling"
BIN="$BIN_DIR/fallow"

pick_asset() {
    local os arch
    os="$(uname -s)"
    arch="$(uname -m)"
    case "$os-$arch" in
        Linux-x86_64) echo "fallow-linux-x64-gnu" ;;
        Linux-aarch64 | Linux-arm64) echo "fallow-linux-arm64-gnu" ;;
        Darwin-arm64) echo "fallow-darwin-arm64" ;;
        Darwin-x86_64) echo "fallow-darwin-x64" ;;
        *) echo "unsupported platform: $os-$arch" >&2; exit 1 ;;
    esac
}

if [ ! -x "$BIN" ]; then
    mkdir -p "$BIN_DIR"
    asset="$(pick_asset)"
    echo "Downloading fallow ($asset)…" >&2
    curl -fsSL -o "$BIN" "https://github.com/fallow-rs/fallow/releases/latest/download/$asset"
    chmod +x "$BIN"
fi

exec "$BIN" audit --gate new-only "$@"
