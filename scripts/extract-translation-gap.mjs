#!/usr/bin/env node
/**
 * scripts/extract-translation-gap.mjs
 *
 * Extrai o conjunto de chaves i18n em en/common.json que faltam
 * em cada uma das 13 locales nao-EN nao-PT.
 *
 * Output: scripts/translation-gap.json
 *   {
 *     "es": { "key1": "EN value", "key2": "...", ... },
 *     "fr": { ... },
 *     ...
 *   }
 *
 * Uso: node scripts/extract-translation-gap.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = process.cwd();
const LOCALES_DIR = resolve(ROOT, 'src/i18n/locales');

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

function setNested(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const LANG_CODES = ['es', 'fr', 'de', 'ar', 'it', 'ja', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr', 'zh'];

const enFlat = flatten(JSON.parse(readFileSync(join(LOCALES_DIR, 'en/common.json'), 'utf8')));
const enKeys = Object.keys(enFlat);

// 1. Identifica chaves em falta em cada locale
const missingByLang = {};
for (const lang of LANG_CODES) {
  const langFlat = flatten(
    JSON.parse(readFileSync(join(LOCALES_DIR, lang, 'common.json'), 'utf8')),
  );
  const langKeys = new Set(Object.keys(langFlat));
  const missing = enKeys.filter((k) => !langKeys.has(k));
  missingByLang[lang] = missing;
  console.log(`${lang}: ${missing.length} chaves em falta`);
}

// 2. Verifica que todos os 13 partilham exactamente o mesmo conjunto de chaves em falta
const allSets = LANG_CODES.map((l) => new Set(missingByLang[l]));
const ref = allSets[0];
for (let i = 1; i < allSets.length; i++) {
  if (allSets[i].size !== ref.size) {
    console.error(
      `❌ Locale ${LANG_CODES[i]} tem ${allSets[i].size} chaves em falta, esperado ${ref.size}`,
    );
    process.exit(1);
  }
  for (const k of allSets[i]) {
    if (!ref.has(k)) {
      console.error(`❌ Chave "${k}" em falta só em ${LANG_CODES[i]}`);
      process.exit(1);
    }
  }
}
const uniqueMissing = [...ref].sort();
console.log(
  `\n✓ Os 13 locales partilham exactamente o mesmo conjunto: ${uniqueMissing.length} chaves`,
);
console.log(
  `Total a traduzir: ${uniqueMissing.length} × ${LANG_CODES.length} = ${uniqueMissing.length * LANG_CODES.length} strings`,
);

// 3. Gera output: { lang: { key: enValue, ... } }
const output = {};
for (const lang of LANG_CODES) {
  output[lang] = {};
  for (const k of uniqueMissing) {
    output[lang][k] = enFlat[k];
  }
}

const outPath = join(ROOT, 'scripts/translation-gap.json');
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`\n✓ Escreveu ${outPath}`);

// 4. Tambem gera um ficheiro com os EN values (referencia para o tradutor)
const enRef = { en: {} };
for (const k of uniqueMissing) enRef.en[k] = enFlat[k];
const enRefPath = join(ROOT, 'scripts/translation-gap-en.json');
writeFileSync(enRefPath, JSON.stringify(enRef, null, 2) + '\n', 'utf8');
console.log(`✓ Escreveu ${enRefPath}`);
