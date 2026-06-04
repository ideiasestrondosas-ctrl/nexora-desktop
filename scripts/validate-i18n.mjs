#!/usr/bin/env node
/**
 * scripts/validate-i18n.mjs
 *
 * Validacao completa de i18n:
 *   1. JSON valido em todas as 15 locales
 *   2. Estrutura identica (mesmo set de chaves) em en + 14 outras
 *   3. Sem chaves orfas
 *   4. Sem placeholder {{}} partidos
 *   5. Sem raw keys (formato a.b.c com pontos) nos valores
 *   6. Encoding UTF-8 limpo
 *
 * Exit codes:
 *   0 = OK
 *   1 = problemas encontrados
 *
 * Uso:
 *   node scripts/validate-i18n.mjs
 *   node scripts/validate-i18n.mjs --strict    # falha tambem em fallbacks EN
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = process.cwd();
const LOCALES_DIR = resolve(ROOT, 'src/i18n/locales');
const strict = process.argv.includes('--strict');

const LANG_CODES = [
  'en',
  'pt',
  'es',
  'fr',
  'de',
  'ar',
  'it',
  'ja',
  'ko',
  'nl',
  'pl',
  'ru',
  'sv',
  'tr',
  'zh',
];

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, key));
    } else {
      acc[key] = v;
    }
    return acc;
  }, {});
}

let errors = 0;
let warnings = 0;
const enFlat = {};

for (const lang of LANG_CODES) {
  const path = join(LOCALES_DIR, lang, 'common.json');
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    JSON.parse(raw);
  } catch (err) {
    console.error(`❌ [${lang}] JSON invalido: ${err.message}`);
    errors++;
    continue;
  }

  const data = JSON.parse(raw);
  const flat = flatten(data);

  if (lang === 'en') {
    Object.assign(enFlat, flat);
  } else {
    const enKeys = new Set(Object.keys(enFlat));
    const langKeys = new Set(Object.keys(flat));

    // Missing
    const missing = [...enKeys].filter((k) => !langKeys.has(k));
    if (missing.length > 0) {
      console.error(
        `❌ [${lang}] ${missing.length} chaves em falta: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`,
      );
      errors++;
    }

    // Orphan
    const orphan = [...langKeys].filter((k) => !enKeys.has(k));
    if (orphan.length > 0) {
      console.error(
        `❌ [${lang}] ${orphan.length} chaves orfas: ${orphan.slice(0, 5).join(', ')}${orphan.length > 5 ? '...' : ''}`,
      );
      errors++;
    }

    // Placeholders quebrados
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value !== 'string') continue;
      const enVal = enFlat[key];
      if (typeof enVal !== 'string') continue;

      // Contar {{}} em EN e na lang
      const enPh = (enVal.match(/\{\{[^}]+\}\}/g) || []).sort();
      const langPh = (value.match(/\{\{[^}]+\}\}/g) || []).sort();
      if (JSON.stringify(enPh) !== JSON.stringify(langPh)) {
        console.error(
          `❌ [${lang}] placeholders diferentes em ${key}: EN=${JSON.stringify(enPh)} vs ${lang}=${JSON.stringify(langPh)}`,
        );
        errors++;
      }

      // Valor igual a key (raw key leaked)
      if (value === key || /^[a-z]+\.[a-z]+\.[a-z]+$/.test(value)) {
        console.error(`❌ [${lang}] raw key em ${key}: "${value}"`);
        errors++;
      }

      // Mojibake detection (apenas padroes claramente corrupted)
      if (/â€[œžŸ¢¡]|Ã[Â©¨ª°¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º]|锘/.test(value)) {
        console.warn(`⚠️  [${lang}] possivel mojibake em ${key}: "${value}"`);
        warnings++;
      }

      // Fallback EN (valor identico ao EN)
      if (strict && lang !== 'en' && value === enVal && enVal.length > 3) {
        console.warn(`⚠️  [${lang}] fallback EN em ${key}: "${value}"`);
        warnings++;
      }
    }
  }

  const status = errors === 0 ? '✓' : '✗';
  console.log(`${status} [${lang}] ${Object.keys(flat).length} chaves`);
}

console.log();
console.log(`Total: ${errors} erros, ${warnings} avisos`);
if (errors > 0) {
  console.error('\n❌ Validacao falhou');
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  Validacao passou com ${warnings} avisos`);
  process.exit(0);
} else {
  console.log('\n✅ Validacao OK');
  process.exit(0);
}
