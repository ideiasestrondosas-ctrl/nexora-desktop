import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const locales = ['ar', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr', 'zh'];

for (const locale of locales) {
  const path = join('src/i18n/locales', locale, 'common.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));

  if (!data.help?.comparator) {
    console.log(`${locale}: sem bloco comparator standalone — ignorado`);
    continue;
  }

  const comparatorBlock = data.help.comparator;
  delete data.help.comparator;

  if (!data.help.screens) data.help.screens = {};
  data.help.screens.comparator = comparatorBlock;

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${locale}: comparator movido para help.screens.comparator`);
}
