#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Nexora QA Runner - Stress Forte"
echo "Este teste cria varias copias temporarias de videos na area QA."
node scripts/qa-runner.mjs --suite stress-heavy
read -r -p "Prima Enter para fechar..."
