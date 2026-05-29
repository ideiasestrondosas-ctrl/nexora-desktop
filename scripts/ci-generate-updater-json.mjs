#!/usr/bin/env node
// Gera latest.json para o tauri-plugin-updater a partir das assinaturas de cada plataforma.
// Executado pelo job generate-updater-json após todos os builds terminarem.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
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
  // GitHub converte espacos para pontos em nomes de assets de release
  const encodedName = bundleName.replace(/ /g, '.');

  console.log(`  ${platform}: ${bundleName}`);
  platforms[platform] = {
    signature: sig,
    url: `${baseUrl}/${encodedName}`,
  };
}

const latestJson = {
  version,
  notes: 'See the CHANGELOG.md for details.',
  pub_date: new Date().toISOString(),
  platforms,
};

writeFileSync('latest.json', JSON.stringify(latestJson, null, 2));
console.log('\nGenerated latest.json:');
console.log(JSON.stringify(latestJson, null, 2));

execSync(`gh release upload "${tag}" latest.json --clobber`, { stdio: 'inherit' });
console.log('\nUploaded latest.json to release.');
