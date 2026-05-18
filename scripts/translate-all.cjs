const fs = require('fs');
const path = require('path');

/**
 * Traduz o base.json EN para múltiplos idiomas via Ollama API local.
 *
 * Uso:
 *   node scripts/translate-all.cjs
 */

const TARGET_LANGS = ['ar', 'it', 'ja', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr', 'zh'];
const LANG_NAMES = {
  ar: 'Arabic',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  sv: 'Swedish',
  tr: 'Turkish',
  zh: 'Chinese (Simplified)',
};

const BASE_PATH = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en', 'base.json');
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:7b-instruct';
const BATCH_SIZE = 4;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

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
  'VS Code:',
  'npm',
  'LU',
  'EBU R128',
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
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    body: JSON.stringify({ model: MODEL, prompt, stream: false }),
  });

  if (!res.ok) throw new Error('Ollama HTTP ' + res.status);
  const data = await res.json();
  return data.response || '';
}

function parseBatchResponse(response, batch) {
  const lines = response
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);
  const result = [];

  for (let i = 0; i < batch.length; i++) {
    const entry = batch[i];
    const expectedPrefix = `[${entry.path}]`;
    const line = lines.find((l) => l.startsWith(expectedPrefix));

    if (line) {
      const translated = line.slice(expectedPrefix.length).trim();
      result.push({ path: entry.path, text: translated });
    } else {
      if (lines[i]) {
        const clean = lines[i].replace(/^\d+\.\s*/, '').trim();
        const match = clean.match(/^\[([^\]]+)\]\s*(.+)$/);
        if (match) {
          result.push({ path: match[1], text: match[2] });
        } else {
          result.push({ path: entry.path, text: entry.text });
        }
      } else {
        result.push({ path: entry.path, text: entry.text });
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
      console.error(
        `  ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}${isLast ? ' — falling back to EN' : ''}`,
      );
      if (!isLast) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(backoff);
      }
    }
  }
  return {
    success: false,
    parsed: batch.map((e) => ({ path: e.path, text: e.text })),
  };
}

async function translateLanguage(lang) {
  const targetName = LANG_NAMES[lang];
  const outputPath = path.join(__dirname, '..', 'src', 'i18n', 'locales', lang, 'common.json');

  console.log(`\n🌐 Translating to ${targetName.toUpperCase()} (${lang})`);
  console.log('─'.repeat(50));

  const baseJson = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
  const allEntries = flatten(baseJson);
  console.log(`📖 Total keys: ${allEntries.length}`);

  let existing = [];
  if (fs.existsSync(outputPath)) {
    const existingJson = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    existing = flatten(existingJson);
    console.log(`📦 Existing keys: ${existing.length}`);
  }

  const donePaths = new Set(existing.map((e) => e.path));
  const pending = allEntries.filter((e) => !donePaths.has(e.path));
  console.log(`⏳ Keys to translate: ${pending.length}`);

  if (pending.length === 0) {
    console.log('✅ Already complete!');
    return { lang, failed: 0 };
  }

  const translated = [...existing];
  let failedCount = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

    process.stdout.write(`  🔄 Batch ${batchNum}/${totalBatches} (${batch.length} keys)... `);

    const { success, parsed } = await translateBatchWithRetry(batch, targetName);
    translated.push(...parsed);

    if (success) {
      const successCount = parsed.filter((p) => p.text !== p.path && p.text !== '').length;
      process.stdout.write(`✅ ${successCount}/${batch.length}\n`);
    } else {
      failedCount += batch.length;
      process.stdout.write(`⚠️ fallback EN (${batch.length} keys)\n`);
    }

    const outputJson = unflatten(translated);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');

    await sleep(BASE_DELAY_MS);
  }

  console.log(
    `  🎉 ${targetName} complete!${failedCount > 0 ? ` (${failedCount} fallback EN)` : ''}`,
  );
  return { lang, failed: failedCount };
}

async function main() {
  console.log('🤖 Ollama Batch Translation');
  console.log('===========================');
  console.log(`Model: ${MODEL}`);
  console.log(`Languages: ${TARGET_LANGS.map((l) => LANG_NAMES[l]).join(', ')}`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  const results = [];
  for (const lang of TARGET_LANGS) {
    const result = await translateLanguage(lang);
    results.push(result);
  }

  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  for (const r of results) {
    const status = r.failed > 0 ? `⚠️ ${r.failed} fallback` : '✅ complete';
    console.log(`  ${LANG_NAMES[r.lang]}: ${status}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
