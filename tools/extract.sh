#!/usr/bin/env bash
# Extrait le texte du manuel (non versionné : droits d'auteur). Usage : tools/extract.sh [sortie.txt]
set -euo pipefail
out="${1:-/tmp/sie-book.txt}"
pdftotext -layout "$(dirname "$0")/../SIE Textbook 6th Edition.pdf" "$out" 2>/dev/null
echo "OK -> $out ($(wc -w < "$out") mots)"
