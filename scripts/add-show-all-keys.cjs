// Adiciona showAll e showLess à secção "common" em todos os locales
const fs = require('fs');
const path = require('path');

const translations = {
  ar: { showAll: 'عرض الكل', showLess: 'عرض أقل' },
  de: { showAll: 'Alle anzeigen', showLess: 'Weniger anzeigen' },
  en: { showAll: 'Show all', showLess: 'Show less' },
  es: { showAll: 'Ver todo', showLess: 'Ver menos' },
  fr: { showAll: 'Tout voir', showLess: 'Voir moins' },
  it: { showAll: 'Mostra tutto', showLess: 'Mostra meno' },
  ja: { showAll: 'すべて表示', showLess: '表示を減らす' },
  ko: { showAll: '모두 보기', showLess: '접기' },
  nl: { showAll: 'Alles tonen', showLess: 'Minder tonen' },
  pl: { showAll: 'Pokaż wszystko', showLess: 'Pokaż mniej' },
  pt: { showAll: 'Ver tudo', showLess: 'Ver menos' },
  ru: { showAll: 'Показать всё', showLess: 'Показать меньше' },
  sv: { showAll: 'Visa alla', showLess: 'Visa färre' },
  tr: { showAll: 'Tümünü göster', showLess: 'Daha az göster' },
  zh: { showAll: '显示全部', showLess: '收起' },
};

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
let ok = 0, failed = 0;

for (const [lang, keys] of Object.entries(translations)) {
  const filePath = path.join(localesDir, lang, 'common.json');
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.common) { console.warn(`${lang}: sem secção "common"`); failed++; continue; }
    data.common.showAll = keys.showAll;
    data.common.showLess = keys.showLess;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`${lang}: ok`);
    ok++;
  } catch (e) {
    console.error(`${lang}: ERRO —`, e.message);
    failed++;
  }
}

console.log(`\nDone: ${ok} ok, ${failed} failed`);
