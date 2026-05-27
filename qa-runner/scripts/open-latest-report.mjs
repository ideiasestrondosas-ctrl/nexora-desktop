#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const runnerRoot = path.resolve(path.dirname(__filename), '..');
const reportsRoot = path.resolve(runnerRoot, '..', '.logs', 'qa-runs');
const latestFile = path.join(reportsRoot, 'latest.json');

function openFile(filePath) {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/c', 'start', '', filePath], { windowsHide: true });
  } else if (process.platform === 'darwin') {
    execFileSync('open', [filePath]);
  } else {
    execFileSync('xdg-open', [filePath]);
  }
}

if (!fs.existsSync(latestFile)) {
  console.log('Ainda nao existe relatorio QA. Execute um teste primeiro.');
  process.exit(1);
}

const { runDir } = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
const index = path.join(runDir, 'index.html');
if (!fs.existsSync(index)) {
  console.log(`Relatorio em falta: ${index}`);
  process.exit(1);
}

console.log(`A abrir ultimo relatorio: ${index}`);
openFile(index);
