const fs = require('fs');
const path = require('path');

/**
 * Corrige mojibake (UTF-8 interpretado como Windows-1252) em ficheiros JSON de tradução.
 *
 * Estratégia:
 * 1. Padrões complexos de 3+ caracteres: mapeamento manual
 * 2. Padrões de 2 caracteres com segundo byte em U+0080-U+00BF: Buffer.from(pair, 'binary')
 * 3. Padrões de 2 caracteres com segundo byte fora do intervalo: mapeamento manual
 *    (caracteres Windows-1252 como €, Š, œ, etc. têm code points Unicode > U+00FF)
 */

const TARGET_FILES = [
  'src/i18n/locales/pt/common.json',
  'src/i18n/locales/es/common.json',
  'src/i18n/locales/fr/common.json',
  'src/i18n/locales/de/common.json',
];

// Mojibake patterns de 3+ caracteres: mapeamento manual
const MANUAL_REPLACEMENTS_3PLUS = [
  // Em dash — (U+2014) em UTF-8: E2 80 94 → Win-1252: â + € + "
  ['\u00e2\u20ac\u201d', '\u2014'],
  // Right arrow → (U+2192) em UTF-8: E2 86 92 → Win-1252: â + † + '
  ['\u00e2\u2020\u2019', '\u2192'],
  // Left single quotation mark ' (U+2018) em UTF-8: E2 80 98 → Win-1252: â + € + ˜
  ['\u00e2\u20ac\u02dc', '\u2018'],
  // Right single quotation mark ' (U+2019) em UTF-8: E2 80 99 → Win-1252: â + € + ™
  ['\u00e2\u20ac\u2122', '\u2019'],
  // Left double quotation mark " (U+201C) em UTF-8: E2 80 9C → Win-1252: â + € + œ
  ['\u00e2\u20ac\u0153', '\u201c'],
  // En dash – (U+2013) em UTF-8: E2 80 93 → Win-1252: â + € + "
  ['\u00e2\u20ac\u201c', '\u2013'],
  // Ellipsis … (U+2026) em UTF-8: E2 80 A6 → Win-1252: â + € + ¦
  ['\u00e2\u20ac\u00a6', '\u2026'],
  // Dagger † (U+2020) em UTF-8: E2 80 A0 → Win-1252: â + € + nbsp
  ['\u00e2\u20ac\u00a0', '\u2020'],
  // Euro sign € (U+20AC) em UTF-8: E2 82 AC → Win-1252: â + ‚ + ¬
  ['\u00e2\u201a\u00ac', '\u20ac'],
  // Non-breaking space (U+00A0) em UTF-8: C2 A0 → Win-1252: Â + nbsp
  ['\u00c2\u00a0', '\u00a0'],
];

// Mojibake patterns de 2 caracteres com segundo byte Win-1252 que tem code point > U+00FF.
// O Buffer.from(str, 'binary') trunca para 8 bits, por isso precisamos de mapeamento manual.
const MANUAL_REPLACEMENTS_2CHAR = {
  // Segundo byte 0x80 (€ em Win-1252, U+20AC)
  '\u00c2\u20ac': '\u0080', // Â€ -> <control> (raro, mas possível)
  '\u00c3\u20ac': '\u00c0', // Ã€ → À (C3 80)

  // Segundo byte 0x82 (‚ em Win-1252, U+201A)
  '\u00c2\u201a': '\u0082', // Â‚
  '\u00c3\u201a': '\u00c2', // Ã‚ → Â (C3 82)

  // Segundo byte 0x83 (ƒ em Win-1252, U+0192)
  '\u00c2\u0192': '\u0083', // Âƒ
  '\u00c3\u0192': '\u00c3', // Ãƒ → Ã (C3 83)

  // Segundo byte 0x84 („ em Win-1252, U+201E)
  '\u00c2\u201e': '\u0084', // Â„
  '\u00c3\u201e': '\u00c4', // Ã„ → Ä (C3 84)

  // Segundo byte 0x85 (… em Win-1252, U+2026)
  '\u00c2\u2026': '\u0085', // Â…
  '\u00c3\u2026': '\u00c5', // Ã… → Å (C3 85)

  // Segundo byte 0x86 († em Win-1252, U+2020)
  '\u00c2\u2020': '\u0086', // Â†
  '\u00c3\u2020': '\u00c6', // Ã† → Æ (C3 86)

  // Segundo byte 0x87 (‡ em Win-1252, U+2021)
  '\u00c2\u2021': '\u0087', // Â‡
  '\u00c3\u2021': '\u00c7', // Ã‡ → Ç (C3 87)

  // Segundo byte 0x88 (ˆ em Win-1252, U+02C6)
  '\u00c2\u02c6': '\u0088', // Âˆ
  '\u00c3\u02c6': '\u00c8', // Ãˆ → È (C3 88)

  // Segundo byte 0x89 (‰ em Win-1252, U+2030)
  '\u00c2\u2030': '\u0089', // Â‰
  '\u00c3\u2030': '\u00c9', // Ã‰ → É (C3 89)

  // Segundo byte 0x8A (Š em Win-1252, U+0160)
  '\u00c2\u0160': '\u008a', // ÂŠ
  '\u00c3\u0160': '\u00ca', // ÃŠ → Ê (C3 8A)

  // Segundo byte 0x8B (‹ em Win-1252, U+2039)
  '\u00c2\u2039': '\u008b', // Â‹
  '\u00c3\u2039': '\u00cb', // Ã‹ → Ë (C3 8B)

  // Segundo byte 0x8C (Œ em Win-1252, U+0152)
  '\u00c2\u0152': '\u008c', // ÂŒ
  '\u00c3\u0152': '\u00cc', // ÃŒ → Ì (C3 8C)

  // Segundo byte 0x8D (não definido em Win-1252)
  // Ignorar

  // Segundo byte 0x8E (Ž em Win-1252, U+017D)
  '\u00c2\u017d': '\u008e', // ÂŽ
  '\u00c3\u017d': '\u00ce', // ÃŽ → Î (C3 8E)

  // Segundo byte 0x8F (não definido)
  // Ignorar

  // Segundo byte 0x90 (não definido)
  // Ignorar

  // Segundo byte 0x91 (' em Win-1252, U+2018)
  '\u00c2\u2018': '\u0091', // Â'
  '\u00c3\u2018': '\u00d1', // Ã' → Ñ (C3 91)

  // Segundo byte 0x92 (' em Win-1252, U+2019)
  '\u00c2\u2019': '\u0092', // Â'
  '\u00c3\u2019': '\u00d2', // Ã' → Ò (C3 92)

  // Segundo byte 0x93 (" em Win-1252, U+201C)
  '\u00c2\u201c': '\u0093', // Â"
  '\u00c3\u201c': '\u00d3', // Ã" → Ó (C3 93)

  // Segundo byte 0x94 (" em Win-1252, U+201D)
  '\u00c2\u201d': '\u0094', // Â"
  '\u00c3\u201d': '\u00d4', // Ã" → Ô (C3 94)

  // Segundo byte 0x95 (• em Win-1252, U+2022)
  '\u00c2\u2022': '\u0095', // Â•
  '\u00c3\u2022': '\u00d5', // Ã• → Õ (C3 95)

  // Segundo byte 0x96 (– em Win-1252, U+2013)
  '\u00c2\u2013': '\u0096', // Â–
  '\u00c3\u2013': '\u00d6', // Ã– → Ö (C3 96)

  // Segundo byte 0x97 (— em Win-1252, U+2014)
  '\u00c2\u2014': '\u0097', // Â—
  '\u00c3\u2014': '\u00d7', // Ã— → × (C3 97)

  // Segundo byte 0x98 (˜ em Win-1252, U+02DC)
  '\u00c2\u02dc': '\u0098', // Â˜
  '\u00c3\u02dc': '\u00d8', // Ã˜ → Ø (C3 98)

  // Segundo byte 0x99 (™ em Win-1252, U+2122)
  '\u00c2\u2122': '\u0099', // Â™
  '\u00c3\u2122': '\u00d9', // Ã™ → Ù (C3 99)

  // Segundo byte 0x9A (š em Win-1252, U+0161)
  '\u00c2\u0161': '\u009a', // Âš
  '\u00c3\u0161': '\u00da', // Ãš → Ú (C3 9A)

  // Segundo byte 0x9B (› em Win-1252, U+203A)
  '\u00c2\u203a': '\u009b', // Â›
  '\u00c3\u203a': '\u00db', // Ã› → Û (C3 9B)

  // Segundo byte 0x9C (œ em Win-1252, U+0153)
  '\u00c2\u0153': '\u009c', // Âœ
  '\u00c3\u0153': '\u00dc', // Ãœ → Ü (C3 9C)

  // Segundo byte 0x9D (não definido)
  // Ignorar

  // Segundo byte 0x9E (ž em Win-1252, U+017E)
  '\u00c2\u017e': '\u009e', // Âž
  '\u00c3\u017e': '\u00de', // Ãž → Þ (C3 9E)

  // Segundo byte 0x9F (Ÿ em Win-1252, U+0178)
  '\u00c2\u0178': '\u009f', // ÂŸ
  '\u00c3\u0178': '\u00df', // ÃŸ → ß (C3 9F)
};

function fixMojibake(text) {
  let result = text;

  // 1. Aplicar substituições manuais de 3+ caracteres
  for (const [bad, good] of MANUAL_REPLACEMENTS_3PLUS) {
    result = result.split(bad).join(good);
  }

  // 2. Aplicar substituições manuais de 2 caracteres (code points altos)
  for (const [bad, good] of Object.entries(MANUAL_REPLACEMENTS_2CHAR)) {
    result = result.split(bad).join(good);
  }

  // 3. Aplicar correção automática para pares com segundo byte em U+0080-U+00BF
  const pattern2 = /[\u00C0-\u00FF][\u0080-\u00BF]/g;
  const matches = result.match(pattern2);
  if (matches) {
    const unique = [...new Set(matches)];
    for (const p of unique) {
      const fixed = Buffer.from(p, 'binary').toString('utf8');
      if (!fixed.includes('\uFFFD') && fixed !== p) {
        result = result.split(p).join(fixed);
      }
    }
  }

  return result;
}

function main() {
  const root = path.join(__dirname, '..');

  for (const relPath of TARGET_FILES) {
    const filePath = path.join(root, relPath);
    console.log('Fixing:', relPath);

    const original = fs.readFileSync(filePath, 'utf8');
    const fixed = fixMojibake(original);

    try {
      JSON.parse(fixed);
      console.log('  JSON valid ✓');
    } catch (e) {
      console.error('  JSON INVALID ✗', e.message);
      continue;
    }

    if (original !== fixed) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log('  Fixed and saved ✓');
    } else {
      console.log('  No changes needed');
    }
  }

  console.log('\nDone!');
}

main();
