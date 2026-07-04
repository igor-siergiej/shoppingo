#!/usr/bin/env bash
# Regenerates the compiled Tailwind stylesheet for design-sync.
# Output is gitignored (packages/web/.design-sync-build/); re-run before the converter.
set -euo pipefail
cd "$(dirname "$0")/../packages/web"
bunx @tailwindcss/cli -i src/index.css -o .design-sync-build/compiled.css
# Montserrat is self-hosted via cfg.extraFonts (.design-sync/montserrat.css); drop the
# CSP-blocked remote @import so the styles.css closure never depends on the network.
sed -i '/fonts\.googleapis\.com/d' .design-sync-build/compiled.css
echo "compiled.css: $(wc -c < .design-sync-build/compiled.css) bytes"
