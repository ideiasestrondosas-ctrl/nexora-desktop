import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const localesDir = resolve(process.cwd(), 'src/i18n/locales');

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

const enPath = resolve(localesDir, 'en/common.json');
let enContent = readFileSync(enPath, 'utf8');
// Strip BOM if present
if (enContent.charCodeAt(0) === 0xfeff) {
  enContent = enContent.slice(1);
}
const enRaw = JSON.parse(enContent);
const enKeys = new Set(Object.keys(flatten(enRaw)));

const langs = readdirSync(localesDir).filter((l) => l !== 'en');

let totalMissing = 0;
let report = '';

for (const lang of langs.sort()) {
  const commonPath = resolve(localesDir, lang, 'common.json');
  if (!existsSync(commonPath)) {
    report += `\n[${lang}] — ficheiro common.json não existe\n`;
    continue;
  }
  let content = readFileSync(commonPath, 'utf8');
  // Strip BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  const raw = JSON.parse(content);
  const keys = new Set(Object.keys(flatten(raw)));

  const missing = [...enKeys].filter((k) => !keys.has(k));
  const orphan = [...keys].filter((k) => !enKeys.has(k));

  if (missing.length === 0 && orphan.length === 0) {
    report += `[${lang}] ✓ completo\n`;
  } else {
    report += `\n[${lang}] ${missing.length} em falta, ${orphan.length} órfãs\n`;
    if (missing.length > 0)
      report += `  MISSING:\n${missing.map((k) => `    - ${k}`).join('\n')}\n`;
    if (orphan.length > 0) report += `  ORPHAN:\n${orphan.map((k) => `    + ${k}`).join('\n')}\n`;
    totalMissing += missing.length;
  }
}

console.log(report);
console.log(`\nTotal chaves em EN: ${enKeys.size}`);
console.log(`Total chaves em falta (todas as línguas): ${totalMissing}`);

// Alpha gate: pt deve ter 0 em falta
const ptPath = resolve(localesDir, 'pt/common.json');
if (existsSync(ptPath)) {
  let ptContent = readFileSync(ptPath, 'utf8');
  // Strip BOM if present
  if (ptContent.charCodeAt(0) === 0xfeff) {
    ptContent = ptContent.slice(1);
  }
  const ptRaw = JSON.parse(ptContent);
  const ptKeys = new Set(Object.keys(flatten(ptRaw)));
  const ptMissing = [...enKeys].filter((k) => !ptKeys.has(k));
  if (ptMissing.length > 0) {
    console.error(`\n❌ ALPHA GATE FAIL: pt tem ${ptMissing.length} chaves em falta`);
    process.exit(1);
  } else {
    console.log('\n✅ Alpha gate PT: OK');
  }
}
