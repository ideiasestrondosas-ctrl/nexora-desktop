#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Nexora QA Runner - Stress Leve"
node scripts/qa-runner.mjs --suite stress-light
read -r -p "Prima Enter para fechar..."
