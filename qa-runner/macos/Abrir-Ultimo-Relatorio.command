#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Nexora QA Runner - Abrir Ultimo Relatorio"
node scripts/open-latest-report.mjs
read -r -p "Prima Enter para fechar..."
