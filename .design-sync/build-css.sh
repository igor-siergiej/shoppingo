#!/usr/bin/env bash
# Regenerates the compiled Tailwind stylesheet for design-sync.
# Compiles the NEUTRAL base (unthemed): theme-independent utilities + neutral shadcn
# tokens. Brand themes live in packages/web/.design-sync-theme/themes/*.css as scoped
# .theme-* blocks, shipped via cfg.tokensGlob.
# Output is gitignored (packages/web/.design-sync-build/); re-run before the converter.
set -euo pipefail
cd "$(dirname "$0")/../packages/web"
bunx @tailwindcss/cli -i .design-sync-theme/base.css -o .design-sync-build/compiled.css
# Self-hosted fonts ship via cfg.extraFonts; drop any CSP-blocked remote @import so the
# styles.css closure never depends on the network.
sed -i '/fonts\.googleapis\.com/d' .design-sync-build/compiled.css
echo "compiled.css: $(wc -c < .design-sync-build/compiled.css) bytes"
