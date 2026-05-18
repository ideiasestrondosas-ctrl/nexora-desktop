const fs = require('fs');
const path = require('path');

const BASE_PATH = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en', 'base.json');
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const CACHE_FILE = path.join(__dirname, '.translate-cache.json');

const TARGET_LANGS = ['es', 'fr', 'de'];
const LIBRE_TRANSLATE_URL = 'https://libretranslate.de/translate';
const DELAY_MS = 600;
const BATCH_SIZE = 1; // LibreTranslate pública aceita 1 de cada vez

// Cache em disco para evitar re-traduzir strings idênticas
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {}
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

const TECH_TERMS = [
  'VMAF',
  'LUFS',
  'FFmpeg',
  'FFprobe',
  'GPU',
  'NVENC',
  'AMF',
  'QSV',
  'CPU',
  'RAM',
  'H.264',
  'H.265',
  'HEVC',
  'ProRes',
  'DNxHD',
  'AV1',
  'AAC',
  'PCM',
  'MOV',
  'MP4',
  'MXF',
  'TS',
  'SHA-256',
  'R128',
  'dBTP',
  'fps',
  'kbps',
  'Mbps',
  'GB',
  'MB',
  'Node.js',
  'SQLite',
  'Tauri',
  'React',
  'Rust',
  'Nexora',
  'BBC',
  'Netflix',
  'DPP',
  'Windows',
  'macOS',
  'Linux',
  'VS Code',
  'npm',
];

const PLACEHOLDER_REGEX = /\{\{[^}]+\}\}/g;

function escapePlaceholders(text) {
  const placeholders = [];
  const escaped = text.replace(PLACEHOLDER_REGEX, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });
  return { escaped, placeholders };
}

function restorePlaceholders(text, placeholders) {
  return text.replace(/__PH(\d+)__/g, (_, idx) => placeholders[parseInt(idx)]);
}

function escapeTechTerms(text) {
  let tokens = [];
  let prepared = text;
  TECH_TERMS.forEach((term) => {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    prepared = prepared.replace(regex, (match) => {
      tokens.push({ token: `__TECH${tokens.length}__`, original: match });
      return `__TECH${tokens.length - 1}__`;
    });
  });
  return { prepared, tokens };
}

function restoreTechTerms(text, tokens) {
  tokens.forEach(({ token, original }) => {
    text = text.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), original);
  });
  return text;
}

async function translateString(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  if (text.trim() === '') return text;

  const cacheKey = `${targetLang}:${text}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const { escaped, placeholders } = escapePlaceholders(text);
  const { prepared, tokens } = escapeTechTerms(escaped);

  try {
    const res = await fetch(LIBRE_TRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: prepared,
        source: 'en',
        target: targetLang,
        format: 'text',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    let translated = data.translatedText || text;

    translated = restoreTechTerms(translated, tokens);
    translated = restorePlaceholders(translated, placeholders);

    cache[cacheKey] = translated;
    return translated;
  } catch (err) {
    console.warn(`  ⚠️ Falha (${targetLang}): "${text.substring(0, 40)}..." — ${err.message}`);
    return text;
  }
}

async function translateObject(obj, targetLang, path = '') {
  const result = {};
  const entries = Object.entries(obj);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      process.stdout.write(`  [${targetLang}] ${currentPath.padEnd(50)} \r`);
      result[key] = await translateString(value, targetLang);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await translateObject(value, targetLang, currentPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

async function main() {
  console.log('🌐 Nexora i18n Translation Script (LibreTranslate)');
  console.log('=====================================================');

  const baseJson = JSON.parse(fs.readFileSync(BASE_PATH, 'utf-8'));

  for (const lang of TARGET_LANGS) {
    console.log(`\n🔄 A traduzir para ${lang.toUpperCase()}...`);
    const startTime = Date.now();

    const translated = await translateObject(baseJson, lang);

    const outputPath = path.join(LOCALES_DIR, lang, 'common.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(translated, null, 2) + '\n', 'utf-8');

    saveCache();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Guardado em ${outputPath} (${duration}s)`);
  }

  console.log('\n🎉 Tradução completa!');
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
