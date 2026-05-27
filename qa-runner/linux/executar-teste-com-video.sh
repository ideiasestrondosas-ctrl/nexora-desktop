#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Nexora QA Runner - Teste Com Video"
node scripts/qa-runner.mjs --suite video
read -r -p "Prima Enter para fechar..."
