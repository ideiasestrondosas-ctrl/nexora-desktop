/**
 * Actualiza o objecto "startup" nos 13 locales não-ingleses:
 * - Remove nodeMissing e sidecarMissing
 * - Mantém ffmpegMissing (com texto actualizado)
 * - Adiciona engineMissing e engineDetails
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(__dirname, '../src/i18n/locales');

const locales = ['ar', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr', 'zh'];

const newStartup = {
  ffmpegMissing:
    'Video conversion engine unavailable. Check the Help section to install requirements.',
  engineMissing: 'Nexora Engine not found. Reinstall the app to restore video processing.',
  engineDetails: 'View details',
};

for (const locale of locales) {
  const filePath = resolve(localesDir, locale, 'common.json');
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));

  if (!data.startup) {
    console.warn(`[${locale}] sem secção startup — a ignorar`);
    continue;
  }

  // Substituir o objecto startup inteiro com os novos valores
  data.startup = newStartup;

  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`[${locale}] actualizado`);
}

console.log('Concluído.');
