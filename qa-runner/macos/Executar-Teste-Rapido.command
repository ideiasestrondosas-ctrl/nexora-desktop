#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Nexora QA Runner - Teste Rapido"
node scripts/qa-runner.mjs --suite quick
read -r -p "Prima Enter para fechar..."
