#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Nexora QA Runner - Teste Completo"
node scripts/qa-runner.mjs --suite complete
read -r -p "Prima Enter para fechar..."
