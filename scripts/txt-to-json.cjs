const fs = require('fs');
const path = require('path');

/**
 * Converte ficheiros .txt traduzidos de volta para JSON.
 *
 * Uso:
 *   node scripts/txt-to-json.cjs es es_translation.txt
 *   node scripts/txt-to-json.cjs fr fr_translation.txt
 *   node scripts/txt-to-json.cjs de de_translation.txt
 *
 * O ficheiro .txt deve ter o formato:
 *   [namespace.key] Texto traduzido
 */

const [, , lang, inputFile] = process.argv;

if (!lang || !inputFile) {
  console.error('Usage: node txt-to-json.cjs <lang> <input.txt>');
  console.error('Example: node txt-to-json.cjs es es_translation.txt');
  process.exit(1);
}

const inputPath = path.resolve(inputFile);
if (!fs.existsSync(inputPath)) {
  console.error('File not found: ' + inputPath);
  process.exit(1);
}

const lines = fs.readFileSync(inputPath, 'utf8').split('\n');
const result = {};
let imported = 0;
let skipped = 0;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (
    !line ||
    line.startsWith('NEXORA') ||
    line.startsWith('===') ||
    line.startsWith('-') ||
    line.startsWith('INSTRUCTIONS') ||
    line.startsWith('RULES')
  ) {
    skipped++;
    continue;
  }

  const match = line.match(/^\[([^\]]+)\]\s+(.+)$/);
  if (!match) {
    console.warn('  ⚠️ Skipping malformed line: ' + line.substring(0, 60));
    skipped++;
    continue;
  }

  const keyPath = match[1];
  const text = match[2];

  const parts = keyPath.split('.');
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = text;
  imported++;
}

const outputDir = path.join(__dirname, '..', 'src', 'i18n', 'locales', lang);
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, 'common.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');

console.log('\n✅ Conversion complete!');
console.log('  Language: ' + lang.toUpperCase());
console.log('  Imported: ' + imported + ' keys');
console.log('  Skipped:  ' + skipped + ' lines');
console.log('  Output:   ' + outputPath);
console.log('\nNext steps:');
console.log('  1. npx tsc --noEmit');
console.log('  2. npx vitest run');
console.log('  3. tauri build --debug');
