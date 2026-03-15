#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# install-editor-deps.sh
#
# Run this from the root of your Next.js project once.
# Usage: bash install-editor-deps.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "📦 Installing Lexical core and official packages..."

pnpm add \
  lexical \
  @lexical/react \
  @lexical/rich-text \
  @lexical/list \
  @lexical/code \
  @lexical/link \
  @lexical/markdown \
  @lexical/html \
  @lexical/utils \
  @lexical/table \
  @lexical/selection \
  @lexical/clipboard \
  @lexical/history \
  @lexical/yjs

echo ""
echo "✅ All Lexical packages installed."
echo ""
echo "Next steps:"
echo "  1. Copy the 'editor/' folder into your src/components/ directory"
echo "  2. Add the following to your root layout (app/layout.tsx):"
echo "       import '@/components/editor/theme/editor-styles.css';"
echo "  3. Use the component:"
echo "       import { RichTextEditor } from '@/components/editor';"
