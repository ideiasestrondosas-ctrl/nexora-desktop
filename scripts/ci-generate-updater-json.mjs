#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const tag = process.env.GITHUB_REF_NAME;
if (!tag) throw new Error('GITHUB_REF_NAME not set');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node ci-generate-updater-json.mjs <artifacts-dir>');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
// Versão puramente numérica (sem sufixo pre-release) — igual ao tauri.conf.json
const version = pkg.version.replace(/-.*$/, '');
const baseUrl = `https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/download/${tag}`;

/**
 * Extrai a secção do CHANGELOG para a versão dada.
 * Suporta formatos: "## [0.30.X..." (Keep a Changelog), "## v0.30.X...", ou "## 0.30.X...".
 * Retorna null se a secção não for encontrada.
 */
function extractChangelogSection(changelogText, ver) {
  const escaped = ver.replace(/\./g, '\\.');
  const patterns = [
    // Keep a Changelog format: ## [0.30.4-beta.1] - date
    new RegExp(`##\\s+\\[${escaped}[^\\]]*\\][^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
    // Plain format: ## v0.30.4 or ## 0.30.4
    new RegExp(`##\\s+v?${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
  ];
  for (const pattern of patterns) {
    const match = changelogText.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

const platforms = {};

const dirs = readdirSync(artifactsDir).filter((d) => statSync(join(artifactsDir, d)).isDirectory());

if (dirs.length === 0) {
  console.error('No updater artifact directories found in:', artifactsDir);
  process.exit(1);
}

for (const dir of dirs) {
  const dirPath = join(artifactsDir, dir);
  const platform = readFileSync(join(dirPath, 'platform.txt'), 'utf8').trim();
  const bundleName = readFileSync(join(dirPath, 'bundle-name.txt'), 'utf8').trim();
  const sig = readFileSync(join(dirPath, 'sig.txt'), 'utf8').trim();
  // GitHub converte espaços para pontos em nomes de assets de release
  const encodedName = bundleName.replace(/ /g, '.');

  console.log(`  ${platform}: ${bundleName}`);
  platforms[platform] = {
    signature: sig,
    url: `${baseUrl}/${encodedName}`,
  };
}

// Extrair notas: prioridade 1 CHANGELOG, prioridade 2 release-notes-v{tag}.md
let notes = 'Ver CHANGELOG.md para detalhes das alterações.';
try {
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const extracted = extractChangelogSection(changelog, version);
  if (extracted) {
    notes = extracted.length > 500 ? extracted.substring(0, 497) + '...' : extracted;
    console.log(`\nExtracted CHANGELOG section for v${version} (${notes.length} chars)`);
  } else {
    console.log(`\nNo CHANGELOG section found for v${version}, trying release-notes file...`);
    const releaseNotesPath = `release-notes-v${tag}.md`;
    if (existsSync(releaseNotesPath)) {
      const releaseNotes = readFileSync(releaseNotesPath, 'utf8');
      const mainContent = releaseNotes.split('\n---\n')[0].trim();
      if (mainContent) {
        notes = mainContent.length > 500 ? mainContent.substring(0, 497) + '...' : mainContent;
        console.log(`\nUsed release-notes-v${tag}.md (${notes.length} chars)`);
      }
    } else {
      console.log(`\nrelease-notes-v${tag}.md not found, using default notes`);
    }
  }
} catch (e) {
  console.log(`\nCould not read notes: ${e.message}`);
}

const latestJson = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms,
};

writeFileSync('latest.json', JSON.stringify(latestJson, null, 2));
console.log('\nGenerated latest.json:');
console.log(JSON.stringify(latestJson, null, 2));

execSync(`gh release upload "${tag}" latest.json --clobber`, { stdio: 'inherit' });
console.log('\nUploaded latest.json to release.');
