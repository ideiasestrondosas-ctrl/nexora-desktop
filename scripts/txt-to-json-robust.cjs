const fs = require('fs');
const path = require('path');

/**
 * Parser robusto para ficheiros .txt traduzidos.
 * Usa regex global para extrair [chave] texto mesmo quando o Google Translate
 * junta múltiplas chaves na mesma linha.
 *
 * Uso:
 *   node scripts/txt-to-json-robust.cjs es scripts/es_translation.txt
 *   node scripts/txt-to-json-robust.cjs fr scripts/fr_translation.txt
 *   node scripts/txt-to-json-robust.cjs de scripts/de_translation.txt
 */

const [, , lang, inputFile] = process.argv;

if (!lang || !inputFile) {
  console.error('Usage: node txt-to-json-robust.cjs <lang> <input.txt>');
  process.exit(1);
}

const inputPath = path.resolve(inputFile);
if (!fs.existsSync(inputPath)) {
  console.error('File not found: ' + inputPath);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');

// Regex global: captura [chave] seguido de texto até ao próximo [chave] ou fim de string
const regex = /\[([^\]]+)\]\s+([^\[]*?)(?=\s*\[|$)/gs;
const result = {};
let imported = 0;
let match;

while ((match = regex.exec(raw)) !== null) {
  const keyPath = match[1].trim();
  let text = match[2].trim();

  // Normalizar quebras de linha dentro do texto (Google Translate pode inserir \n)
  text = text.replace(/\s+/g, ' ').trim();

  // Skip instruction headers
  if (keyPath.includes('INSTRUCTIONS') || keyPath.includes('RULES') || keyPath.includes('REGLAS') || keyPath.includes('RÈGLES') || keyPath.includes('ANLEITUNG')) continue;
  if (text.startsWith('NEXORA') || text.startsWith('====') || text.startsWith('-') || /^\d+\./.test(text)) continue;

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
console.log('  Output:   ' + outputPath);
