#!/usr/bin/env bash
# Regenerates the compiled Tailwind stylesheet for design-sync.
# Compiles the NEUTRAL base (unthemed): theme-independent utilities + neutral shadcn
# tokens, then APPENDS the brand themes (.theme-* blocks) into the same file so they
# ride inside _ds_bundle.css — the base stylesheet the design runtime always binds.
# (Shipping themes as separate tokens/*.css failed: the runtime binds only the base
# files and never fetched the tokens/ subdir, so the @imports dead-ended.)
# Output is gitignored (packages/web/.design-sync-build/); re-run before the converter.
set -euo pipefail
cd "$(dirname "$0")/../packages/web"
bunx @tailwindcss/cli -i .design-sync-theme/base.css -o .design-sync-build/compiled.css
# Self-hosted fonts ship via cfg.extraFonts; drop any CSP-blocked remote @import.
sed -i '/fonts\.googleapis\.com/d' .design-sync-build/compiled.css
# Inline the brand themes so `class="theme-*"` resolves in every built design.
printf '\n/* ---- brand themes (scoped .theme-* blocks) ---- */\n' >> .design-sync-build/compiled.css
cat .design-sync-theme/themes/*.css >> .design-sync-build/compiled.css
echo "compiled.css: $(wc -c < .design-sync-build/compiled.css) bytes"
