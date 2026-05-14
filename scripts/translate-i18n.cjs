const fs = require('fs');
const path = require('path');
const translate = require('translate');

// Configuração do translate (usa Google Translate por defeito)
translate.engine = 'google';

// Diretórios
const BASE_PATH = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en', 'base.json');
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// Idiomas de destino
const TARGET_LANGS = ['pt', 'es', 'fr', 'de'];

// Termos técnicos que NÃO devem ser traduzidos
const TECH_TERMS = [
  'VMAF', 'LUFS', 'FFmpeg', 'FFprobe', 'GPU', 'NVENC', 'AMF', 'QSV',
  'CPU', 'RAM', 'H.264', 'H.265', 'HEVC', 'ProRes', 'DNxHD', 'AV1',
  'AAC', 'PCM', 'MOV', 'MP4', 'MXF', 'TS', 'SHA-256', 'R128',
  'dBTP', 'fps', 'kbps', 'Mbps', 'GB', 'MB', 'Node.js', 'SQLite',
  'Tauri', 'React', 'Rust', 'Nexora', 'BBC', 'Netflix', 'DPP',
  'Windows', 'macOS', 'Linux', 'VS Code', 'npm'
];

// Placeholders que devem ser preservados
const PLACEHOLDER_REGEX = /\{\{[^}]+\}\}/g;

/**
 * Escapa placeholders substituindo-os por tokens temporários
 */
function escapePlaceholders(text) {
  const placeholders = [];
  const escaped = text.replace(PLACEHOLDER_REGEX, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });
  return { escaped, placeholders };
}

/**
 * Restaura placeholders nos tokens temporários
 */
function restorePlaceholders(text, placeholders) {
  return text.replace(/__PH(\d+)__/g, (_, idx) => placeholders[parseInt(idx)]);
}

/**
 * Traduz uma string, preservando termos técnicos e placeholders
 */
async function translateString(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  if (text.trim() === '') return text;

  // Preservar placeholders
  const { escaped, placeholders } = escapePlaceholders(text);

  // Preservar termos técnicos (substituir por tokens)
  let techTokens = [];
  let prepared = escaped;
  TECH_TERMS.forEach((term, idx) => {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    prepared = prepared.replace(regex, (match) => {
      techTokens.push({ token: `__TECH${techTokens.length}__`, original: match });
      return `__TECH${techTokens.length - 1}__`;
    });
  });

  try {
    let translated = await translate(prepared, { to: targetLang });

    // Restaurar termos técnicos
    techTokens.forEach(({ token, original }) => {
      translated = translated.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), original);
    });

    // Restaurar placeholders
    translated = restorePlaceholders(translated, placeholders);

    return translated;
  } catch (err) {
    console.warn(`  ⚠️ Falha ao traduzir para ${targetLang}: "${text.substring(0, 40)}..." — ${err.message}`);
    return text; // Fallback: manter em inglês
  }
}

/**
 * Traduz recursivamente um objeto JSON
 */
async function translateObject(obj, targetLang, path = '') {
  const result = {};
  const entries = Object.entries(obj);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      process.stdout.write(`  [${targetLang}] ${currentPath}                    \r`);
      result[key] = await translateString(value, targetLang);
      // Pequeno delay para evitar rate limiting
      await new Promise(r => setTimeout(r, 150));
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await translateObject(value, targetLang, currentPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Função principal
 */
async function main() {
  console.log('🌐 Nexora i18n Translation Script');
  console.log('==================================');
  console.log(`📖 Base Master: ${BASE_PATH}`);

  if (!fs.existsSync(BASE_PATH)) {
    console.error('❌ Base Master não encontrado!');
    process.exit(1);
  }

  const baseContent = fs.readFileSync(BASE_PATH, 'utf-8');
  const baseJson = JSON.parse(baseContent);

  for (const lang of TARGET_LANGS) {
    console.log(`\n🔄 A traduzir para ${lang.toUpperCase()}...`);
    const startTime = Date.now();

    const translated = await translateObject(baseJson, lang);

    const outputPath = path.join(LOCALES_DIR, lang, 'common.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(translated, null, 2) + '\n', 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Guardado em ${outputPath} (${duration}s)`);
  }

  console.log('\n🎉 Tradução completa!');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
