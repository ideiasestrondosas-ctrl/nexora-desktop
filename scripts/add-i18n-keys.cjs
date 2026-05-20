const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const ptPath = path.join(localesDir, 'pt', 'common.json');

// Novas chaves a propagar (em português)
const newKeys = {
  'help.screens.queue.pipelineSummaryTitle': 'Pipeline Summary Clicável (v0.23.0)',
  'help.screens.queue.pipelineSummaryDesc': 'Clique nos badges de contagem (Queued, Processing, Done, Quarantined) para expandir um painel inline com a lista de ficheiros.',
  'help.screens.queue.reprocessPopupTitle': 'Popup de Reprocessamento (v0.23.0)',
  'help.screens.queue.reprocessPopupDesc': 'Popup renderizado via portal para o foreground, escapando o overflow do container da tabela.',
  'help.screens.library.deleteConfirmTitle': 'Confirmação de Delete (v0.23.0)',
  'help.screens.library.deleteConfirmDesc': 'Diálogo de confirmação em dois passos. Primeiro confirma a remoção do asset; segundo pergunta se quer apagar o ficheiro processado do disco.',
  'help.screens.settings.factoryResetConfirmTitle': 'Factory Reset com Confirmação (v0.23.0)',
  'help.screens.settings.factoryResetConfirmDesc': 'Factory reset com autorização explícita para apagar ficheiros. Primeiro diálogo confirma o reset; segundo pergunta se apaga os ficheiros de output.',
  'help.guideOpened': 'Guia aberto no browser',
  'help.guideOpenFailed': 'Não foi possível abrir o guia. Verifique a sua ligação à internet.',
};

function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const locales = fs.readdirSync(localesDir).filter(d => d !== 'pt');

for (const locale of locales) {
  const filePath = path.join(localesDir, locale, 'common.json');
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${locale} — file not found`);
    continue;
  }
  
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  for (const [key, value] of Object.entries(newKeys)) {
    setNested(content, key, value);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${locale}/common.json`);
}

console.log('All locales updated successfully!');
