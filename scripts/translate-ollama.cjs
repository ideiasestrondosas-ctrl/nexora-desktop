const fs = require('fs');
const path = require('path');

/**
 * Traduz o base.json para um idioma alvo via Ollama API local.
 * Usa batches pequenos (8) com retry e backoff para evitar timeouts.
 *
 * Uso:
 *   node scripts/translate-ollama.cjs es
 *   node scripts/translate-ollama.cjs fr
 *   node scripts/translate-ollama.cjs de
 */

const TARGET_LANG = process.argv[2];
if (!TARGET_LANG) {
  console.error('Usage: node translate-ollama.cjs <lang>');
  console.error('Example: node translate-ollama.cjs es');
  process.exit(1);
}

const LANG_NAMES = { es: 'Spanish', fr: 'French', de: 'German' };
const TARGET_NAME = LANG_NAMES[TARGET_LANG];

const BASE_PATH = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en', 'base.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'i18n', 'locales', TARGET_LANG, 'common.json');
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:7b-instruct';
const BATCH_SIZE = 8;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

// Termos técnicos que NÃO devem ser traduzidos
const TECH_TERMS = [
  'VMAF', 'LUFS', 'FFmpeg', 'FFprobe', 'GPU', 'NVENC', 'AMF', 'QSV',
  'CPU', 'RAM', 'H.264', 'H.265', 'HEVC', 'ProRes', 'DNxHD', 'AV1',
  'AAC', 'PCM', 'MOV', 'MP4', 'MXF', 'TS', 'SHA-256', 'R128',
  'dBTP', 'fps', 'kbps', 'Mbps', 'GB', 'MB', 'Node.js', 'SQLite',
  'Tauri', 'React', 'Rust', 'Nexora', 'BBC', 'Netflix', 'DPP',
  'Windows', 'macOS', 'Linux', 'VS Code', 'npm', 'LU', 'EBU R128'
];

function flatten(obj, prefix = '') {
  const result = [];
  for (const [key, val] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') {
      result.push({ path: flatKey, text: val });
    } else if (typeof val === 'object' && val !== null) {
      result.push(...flatten(val, flatKey));
    }
  }
  return result;
}

function unflatten(entries) {
  const result = {};
  for (const { path, text } of entries) {
    const parts = path.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = text;
  }
  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateBatch(batch, targetLang, attempt = 1) {
  const lines = batch.map((e, i) => `${i + 1}. [${e.path}] ${e.text}`).join('\n');

  const prompt = `You are a professional translator. Translate the following UI strings from English to ${targetLang}.

RULES:
- ONLY translate the text after the closing bracket ].
- NEVER translate text inside [brackets] — those are keys.
- NEVER change or translate placeholders like {{count}}, {{total}}, {{used}}, {{name}}, {{version}}, {{msg}}, {{date}}, {{step}}, {{message}}, {{cores}}, {{threads}}.
- NEVER translate these technical terms: ${TECH_TERMS.join(', ')}.
- Preserve all punctuation, spacing, and special characters (including ← and —).
- Keep the exact same format: [key] translated text
- Output ONLY the translated lines, one per line. No explanations, no markdown, no numbering.

Strings to translate:
${lines}

Translated output:`;

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false })
  });

  if (!res.ok) throw new Error('Ollama HTTP ' + res.status);
  const data = await res.json();
  return data.response || '';
}

function parseBatchResponse(response, batch) {
  const lines = response.split('\n').map(l => l.trim()).filter(l => l);
  const result = [];

  for (let i = 0; i < batch.length; i++) {
    const entry = batch[i];
    const expectedPrefix = `[${entry.path}]`;
    const line = lines.find(l => l.startsWith(expectedPrefix));

    if (line) {
      const translated = line.slice(expectedPrefix.length).trim();
      result.push({ path: entry.path, text: translated });
    } else {
      // Fallback: try to match by line index
      if (lines[i]) {
        const clean = lines[i].replace(/^\d+\.\s*/, '').trim();
        const match = clean.match(/^\[([^\]]+)\]\s*(.+)$/);
        if (match) {
          result.push({ path: match[1], text: match[2] });
        } else {
          result.push({ path: entry.path, text: entry.text }); // fallback to EN
        }
      } else {
        result.push({ path: entry.path, text: entry.text }); // fallback to EN
      }
    }
  }

  return result;
}

async function translateBatchWithRetry(batch, targetLang) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await translateBatch(batch, targetLang, attempt);
      const parsed = parseBatchResponse(response, batch);
      return { success: true, parsed };
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      console.error(`\n  ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}${isLast ? ' — falling back to EN' : ''}`);
      if (!isLast) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(backoff);
      }
    }
  }
  // All retries exhausted: return original English text
  return {
    success: false,
    parsed: batch.map(e => ({ path: e.path, text: e.text }))
  };
}

async function main() {
  console.log(`🤖 Ollama Translation: EN → ${TARGET_NAME.toUpperCase()}`);
  console.log('================================================');

  const baseJson = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
  const allEntries = flatten(baseJson);
  console.log(`📖 Total keys in base.json: ${allEntries.length}`);

  // Check if there's already a partial translation
  let existing = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    const existingJson = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    existing = flatten(existingJson);
    console.log(`📦 Existing translated keys: ${existing.length}`);
  }

  // Build a set of already translated paths
  const donePaths = new Set(existing.map(e => e.path));
  const pending = allEntries.filter(e => !donePaths.has(e.path));
  console.log(`⏳ Keys to translate: ${pending.length}`);

  if (pending.length === 0) {
    console.log('✅ Nothing to translate!');
    return;
  }

  const translated = [...existing];
  let failedCount = 0;

  // Process in batches
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

    process.stdout.write(`\n🔄 Batch ${batchNum}/${totalBatches} (${batch.length} keys)... `);

    const { success, parsed } = await translateBatchWithRetry(batch, TARGET_NAME);
    translated.push(...parsed);

    if (success) {
      const successCount = parsed.filter(p => p.text !== p.path && p.text !== '').length;
      process.stdout.write(`✅ ${successCount}/${batch.length} translated`);
    } else {
      failedCount += batch.length;
      process.stdout.write(`⚠️ fallback EN (${batch.length} keys)`);
    }

    // Save progress after each batch
    const outputJson = unflatten(translated);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');

    // Delay to not overload Ollama
    await sleep(BASE_DELAY_MS);
  }

  console.log(`\n\n🎉 Translation complete!`);
  console.log(`📁 Saved to: ${OUTPUT_PATH}`);
  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} keys fell back to English due to Ollama errors`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
