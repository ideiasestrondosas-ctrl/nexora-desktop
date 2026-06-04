#!/usr/bin/env node
/**
 * scripts/translate-missing-keys.mjs
 *
 * Para cada uma das 13 locales (es, fr, de, ar, it, ja, ko, nl, pl, ru, sv, tr, zh),
 * traduz as 223 chaves em falta usando Ollama (modelo cloud) e faz merge
 * com o JSON existente, preservando chaves ja' traduzidas.
 *
 * Input:
 *   - scripts/translation-gap.json   (gerado por extract-translation-gap.mjs)
 *   - src/i18n/locales/{lang}/common.json (existente)
 *
 * Output:
 *   - src/i18n/locales/{lang}/common.json (actualizado com 223 novas chaves)
 *
 * Uso:
 *   node scripts/translate-missing-keys.mjs              # todos os 13
 *   node scripts/translate-missing-keys.mjs es fr de    # subset
 *   node scripts/translate-missing-keys.mjs --dry-run   # nao escreve
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = process.cwd();
const LOCALES_DIR = resolve(ROOT, 'src/i18n/locales');
const GAP_PATH = resolve(ROOT, 'scripts/translation-gap.json');
const EN_REF_PATH = resolve(ROOT, 'scripts/translation-gap-en.json');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud';
const BATCH_SIZE = 6;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

const ALL_LANGS = ['es', 'fr', 'de', 'ar', 'it', 'ja', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr', 'zh'];
const LANG_NAMES = {
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  ar: 'Arabic (العربية)',
  it: 'Italian (Italiano)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  nl: 'Dutch (Nederlands)',
  pl: 'Polish (Polski)',
  ru: 'Russian (Русский)',
  sv: 'Swedish (Svenska)',
  tr: 'Turkish (Türkçe)',
  zh: 'Chinese Simplified (简体中文)',
};

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
  'LU',
  'EBU R128',
  'Dashboard',
  'FFmpeg',
  'FFprobe',
  'CSC',
  'JSON',
  'API',
  'UI',
  'URL',
  'CSS',
  'HTML',
];

function setNested(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateBatch(batch, targetName, attempt = 1) {
  const lines = batch.map((e, i) => `${i + 1}. [${e.path}] ${e.text}`).join('\n');

  const prompt = `You are a professional UI translator for a desktop video transcoding application. Translate the following English UI strings to ${targetName}.

STRICT RULES:
- Translate ONLY the text after "]". NEVER translate the [key] in brackets.
- NEVER change placeholders like {{count}}, {{total}}, {{used}}, {{name}}, {{version}}, {{msg}}, {{date}}, {{step}}, {{message}}, {{cores}}, {{threads}}, {{error}}, {{filename}}, {{range}}.
- NEVER translate these technical terms: ${TECH_TERMS.join(', ')}.
- Preserve all punctuation, spacing, and special characters (←, →, —, ·).
- Keep the EXACT format: [key] translated text
- Output ONLY the translated lines, one per line. No explanations, no markdown, no numbering.
- Be concise — these are UI labels/buttons. Prefer short translations.
- For Japanese/Korean/Chinese, use natural short forms (e.g. 1-4 characters for buttons).
- For Arabic, respect RTL.

Strings to translate:
${lines}

Translated output:`;

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature: 0.2 } }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
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
    let matched = lines.find((l) => l.startsWith(expectedPrefix));
    if (!matched && lines[i]) {
      const clean = lines[i].replace(/^\d+\.\s*/, '').trim();
      const m = clean.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (m) {
        matched = `[${m[1]}] ${m[2]}`;
      } else {
        // Model dropped [key] prefix: take the whole line as translation
        const stripped = clean
          .replace(/^[\d\.\)\-\*\s]+/, '')
          .replace(/^[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ffa-zA-Z\s]+\s*/, '')
          .trim();
        if (stripped.length > 0 && stripped.length < 200) {
          result.push({ path: entry.path, text: stripped });
          continue;
        }
      }
    }
    if (matched) {
      const translated = matched.slice(expectedPrefix.length).trim();
      if (translated.length > 0) {
        result.push({ path: entry.path, text: translated });
        continue;
      }
    }
    result.push({ path: entry.path, text: entry.text, fallback: true });
  }
  return result;
}

async function translateBatchWithRetry(batch, targetName) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await translateBatch(batch, targetName, attempt);
      return { success: true, parsed: parseBatchResponse(response, batch) };
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      process.stderr.write(
        `\n  ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}${isLast ? ' — fallback EN' : ''}\n`,
      );
      if (!isLast) await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }
  return {
    success: false,
    parsed: batch.map((e) => ({ path: e.path, text: e.text, fallback: true })),
  };
}

async function translateLang(lang, dryRun) {
  const targetName = LANG_NAMES[lang];
  if (!targetName) {
    console.error(`❌ Lingua desconhecida: ${lang}`);
    process.exit(1);
  }
  console.log(`\n🤖 ${lang} → ${targetName}`);
  console.log('─'.repeat(50));

  // Load gap
  const gap = JSON.parse(readFileSync(GAP_PATH, 'utf8'));
  const pending = Object.entries(gap[lang] || {}).map(([path, text]) => ({ path, text }));
  if (pending.length === 0) {
    console.log('  ✓ Nada a traduzir');
    return;
  }
  console.log(`  📖 ${pending.length} chaves em falta`);

  // Load existing locale JSON
  const localePath = join(LOCALES_DIR, lang, 'common.json');
  let localeJson = {};
  if (existsSync(localePath)) {
    let raw = readFileSync(localePath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    localeJson = JSON.parse(raw);
  }

  // Translate in batches
  const translated = [];
  let fallbackCount = 0;
  const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  🔄 Batch ${batchNum}/${totalBatches}... `);
    const { parsed } = await translateBatchWithRetry(batch, targetName);
    translated.push(...parsed);
    fallbackCount += parsed.filter((p) => p.fallback).length;
    const okCount = parsed.length - parsed.filter((p) => p.fallback).length;
    process.stdout.write(`✓ ${okCount}/${batch.length}\n`);
    await sleep(BASE_DELAY_MS);
  }

  if (dryRun) {
    console.log(
      `  [DRY-RUN] Não escreveu. ${translated.length} traduzidas, ${fallbackCount} fallback EN`,
    );
    return;
  }

  // Merge into existing JSON (preserves already-translated keys)
  for (const { path, text } of translated) {
    setNested(localeJson, path, text);
  }
  writeFileSync(localePath, JSON.stringify(localeJson, null, 2) + '\n', 'utf8');
  console.log(`  ✓ Escreveu ${localePath}`);
  console.log(`  📊 ${translated.length} novas chaves, ${fallbackCount} fallback EN`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');

  const langs = args.length > 0 ? args : ALL_LANGS;
  console.log(`Modelo: ${MODEL}`);
  console.log(`Idiomas: ${langs.join(', ')}`);
  console.log(`Dry-run: ${dryRun ? 'sim' : 'não'}`);

  // Verify gap file exists
  if (!existsSync(GAP_PATH)) {
    console.error(
      `❌ ${GAP_PATH} nao existe. Correr primeiro: node scripts/extract-translation-gap.mjs`,
    );
    process.exit(1);
  }

  // Verify Ollama is reachable
  try {
    const r = await fetch(OLLAMA_URL.replace('/api/generate', '/api/tags'));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (err) {
    console.error(`❌ Ollama nao esta' acessivel em ${OLLAMA_URL}: ${err.message}`);
    process.exit(1);
  }
  console.log(`✓ Ollama acessivel\n`);

  for (const lang of langs) {
    await translateLang(lang, dryRun);
  }
  console.log('\n✅ Concluido');
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
