import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function runCommand(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 8000 });
  } catch {
    return '';
  }
}

export function detectNexoraProcess() {
  const platform = process.platform;
  let output = '';

  if (platform === 'win32') {
    output = runCommand('powershell.exe', [
      '-NoProfile',
      '-Command',
      "Get-Process | Where-Object { $_.ProcessName -match 'nexora|tauri' } | Select-Object ProcessName,Id | ConvertTo-Json -Compress",
    ]);
  } else {
    output = runCommand('ps', ['-ax', '-o', 'pid=,comm=,args=']);
  }

  const normalized = output.toLowerCase();
  const running = normalized.includes('nexora') || normalized.includes('nexora-desktop');
  return {
    running,
    platform,
    raw: output.trim(),
  };
}

export function findInstalledApp(repoRoot) {
  const candidates = [];
  if (process.env.NEXORA_QA_APP_PATH) candidates.push(process.env.NEXORA_QA_APP_PATH);

  if (process.platform === 'win32') {
    candidates.push(
      path.join(repoRoot, 'src-tauri', 'target', 'release', 'nexora-desktop.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Nexora Desktop', 'Nexora Desktop.exe'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Nexora Desktop.app/Contents/MacOS/Nexora Desktop');
  } else {
    candidates.push(path.join(repoRoot, 'src-tauri', 'target', 'release', 'nexora-desktop'));
  }

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

export function startAppIfPossible(appPath, logger) {
  if (!appPath) {
    return { started: false, pid: null, reason: 'Nenhum binario instalado encontrado.' };
  }

  const child = spawn(appPath, [], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      NEXORA_QA_MODE: '1',
      NEXORA_QA_STARTED_AT: new Date().toISOString(),
    },
  });
  child.unref();
  logger?.debug('Started app candidate', { appPath, pid: child.pid });
  return { started: true, pid: child.pid, reason: null };
}

export function getSystemSnapshot() {
  const load = os.loadavg();
  const total = os.totalmem();
  const free = os.freemem();
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    loadAverage: load,
    memoryTotalBytes: total,
    memoryFreeBytes: free,
    memoryUsedBytes: total - free,
    uptimeSeconds: os.uptime(),
  };
}
