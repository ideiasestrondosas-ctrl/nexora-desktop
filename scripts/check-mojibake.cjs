const fs = require('fs');
const path = require('path');

const files = ['pt', 'es', 'fr', 'de'];
const target1 = '\u00e2\u20ac\u201d'; // â + € + "
const target2 = '\u00e2\u2020\u2019'; // â + † + '

files.forEach(l => {
  const f = path.join('C:', 'Dev', 'nexora-desktop', 'src', 'i18n', 'locales', l, 'common.json');
  const data = fs.readFileSync(f, 'utf8');
  const count1 = (data.match(new RegExp(target1, 'g')) || []).length;
  const count2 = (data.match(new RegExp(target2, 'g')) || []).length;
  console.log(l, 'em-dash:', count1, 'arrow:', count2);
});
