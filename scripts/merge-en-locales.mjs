#!/usr/bin/env node
/**
 * scripts/merge-en-locales.mjs
 *
 * Faz merge de src/i18n/locales/en/base.json + en/common.json
 * num único en/common.json (union das chaves).
 *
 * Justificacao: en/base.json e' o runtime mas tem apenas 704 chaves.
 *                en/common.json tem 881 chaves e e' a fonte de verdade
 *                usada pelos outros 14 locales. Algumas chaves so'
 *                existem em base.json (bugReport, comparator, onboarding,
 *                help.metrics, help.usage, help.system, help.support,
 *                help.profiles, help.about, jobCard.errors, settings.privacy,
 *                settings.watchFolders, topbar.bugReport).
 *
 * Uso: node scripts/merge-en-locales.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const BASE_PATH = join(ROOT, 'src/i18n/locales/en/base.json');
const COMMON_PATH = join(ROOT, 'src/i18n/locales/en/common.json');

function deepMerge(target, source) {
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const base = JSON.parse(readFileSync(BASE_PATH, 'utf8'));
  const common = JSON.parse(readFileSync(COMMON_PATH, 'utf8'));

  // Merge: common.json e' a base, sobrepoe com base.json
  // (base.json tem chaves mais recentes/autorais para features usadas no runtime)
  const merged = deepMerge(common, base);

  const newJson = JSON.stringify(merged, null, 2) + '\n';

  if (dryRun) {
    console.log('[DRY-RUN] Nenhum ficheiro escrito. Tamanho final:', newJson.length, 'bytes');
    return;
  }

  writeFileSync(COMMON_PATH, newJson, 'utf8');
  console.log('Merge escrito em', COMMON_PATH);
  console.log('Tamanho final:', newJson.length, 'bytes');
}

main();
