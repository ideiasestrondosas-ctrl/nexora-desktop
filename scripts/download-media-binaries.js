#!/usr/bin/env node
/**
 * Descarrega FFmpeg e FFprobe pré-compilados para src-tauri/binaries/.
 * Usa apenas módulos nativos do Node.js + ferramentas do sistema (tar, unzip, lipo, PowerShell).
 *
 * No macOS cria sempre binários universais (arm64 + x64) via lipo,
 * pois o build Tauri usa --target universal-apple-darwin.
 *
 * Uso:
 *   node scripts/download-media-binaries.js
 *   node scripts/download-media-binaries.js --platform win32 --arch x64
 */

import { existsSync, mkdirSync, chmodSync, readdirSync, statSync, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { get } from 'https';
import { tmpdir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { copyFile, unlink, rm } from 'fs/promises';

const execAsync = promisify(exec);

// ── Argumentos opcionais ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : null;
};
const argPlatform = flag('--platform') ?? process.platform;
const argArch = flag('--arch') ?? process.arch;

// ── Mapeamento plataforma → Rust target triple ───────────────────────────────

const TARGET_MAP = {
  'win32-x64': 'x86_64-pc-windows-msvc',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
};

// ── URLs BtbN (Windows / Linux) ───────────────────────────────────────────────

const BTBN = 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download';

const BTBN_BUNDLES = {
  'win32-x64': { file: 'ffmpeg-master-latest-win64-gpl.zip', type: 'zip' },
  'win32-arm64': { file: 'ffmpeg-master-latest-win32-gpl.zip', type: 'zip' },
  'linux-x64': { file: 'ffmpeg-master-latest-linux64-gpl.tar.xz', type: 'tar' },
  'linux-arm64': { file: 'ffmpeg-master-latest-linuxarm64-gpl.tar.xz', type: 'tar' },
};

// evermeet.cx — binários estáticos macOS por arquitectura
const EVERMEET = {
  arm64: {
    ffmpeg: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    ffprobe: 'https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip',
  },
  x64: {
    ffmpeg: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    ffprobe: 'https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip',
  },
};

// ── HTTP com redirect ─────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} para ${url}`));
        return;
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function downloadTo(url, dest) {
  console.log(`  ↓ ${url.split('/').pop()}`);
  const res = await httpGet(url);
  await pipeline(res, createWriteStream(dest));
}

// ── Extracção via ferramentas do sistema ──────────────────────────────────────

async function extractZip(zipPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  if (process.platform === 'win32') {
    await execAsync(
      `powershell -NoProfile -Command "Expand-Archive -Force '${zipPath}' '${outDir}'"`,
      { timeout: 120_000 },
    );
  } else {
    await execAsync(`unzip -q -o "${zipPath}" -d "${outDir}"`, { timeout: 120_000 });
  }
}

async function extractTar(tarPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  await execAsync(`tar -xf "${tarPath}" -C "${outDir}"`, { timeout: 120_000 });
}

// ── Pesquisa recursiva de ficheiro por nome ───────────────────────────────────

function findFile(dir, name) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry === name) {
      return full;
    }
  }
  return null;
}

// ── Descarregar e extrair para um binário individual ─────────────────────────

async function downloadBinary(url, binName, extractType, tmpBase) {
  const archivePath = `${tmpBase}.${extractType === 'zip' ? 'zip' : 'tar.xz'}`;
  const extractDir = `${tmpBase}-out`;

  await downloadTo(url, archivePath);
  if (extractType === 'zip') {
    await extractZip(archivePath, extractDir);
  } else {
    await extractTar(archivePath, extractDir);
  }

  const found = findFile(extractDir, binName);
  await unlink(archivePath).catch(() => {});
  return { found, extractDir };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const platform = argPlatform;
  const arch = argArch;
  const outDir = join(process.cwd(), 'src-tauri', 'binaries');
  const tmpBase = join(tmpdir(), `nexora-ffmpeg-${Date.now()}`);

  mkdirSync(outDir, { recursive: true });

  console.log(`\nNexora — Download de Binários Media`);
  console.log(`Plataforma : ${platform}-${arch}\n`);

  // ── macOS: binários universais (arm64 + x64 → lipo) ──────────────────────

  if (platform === 'darwin') {
    const tools = ['ffmpeg', 'ffprobe'];
    const archTriples = { arm64: 'aarch64-apple-darwin', x64: 'x86_64-apple-darwin' };

    // Tenta encontrar o binário do sistema e determinar a sua arquitectura
    async function findSystemBinary(tool) {
      try {
        const { stdout } = await execAsync(`which ${tool}`);
        const p = stdout.trim();
        if (!p) return null;
        const { stdout: fileInfo } = await execAsync(`file "${p}"`);
        const hasArm64 = fileInfo.includes('arm64');
        const hasX64 = fileInfo.includes('x86_64');
        if (hasArm64 && hasX64) return { path: p, arch: 'universal' };
        if (hasArm64) return { path: p, arch: 'arm64' };
        if (hasX64) return { path: p, arch: 'x64' };
      } catch {}
      return null;
    }

    for (const tool of tools) {
      const sysBin = await findSystemBinary(tool);

      // Caso especial: binário do sistema já é universal
      if (sysBin?.arch === 'universal') {
        const universalDest = join(outDir, `${tool}-universal-apple-darwin`);
        await copyFile(sysBin.path, universalDest);
        chmodSync(universalDest, 0o755);
        for (const [a, triple] of Object.entries(archTriples)) {
          await copyFile(sysBin.path, join(outDir, `${tool}-${triple}`));
          chmodSync(join(outDir, `${tool}-${triple}`), 0o755);
        }
        console.log(`  ✓ ${tool}-universal-apple-darwin (universal do sistema)`);
        continue;
      }

      const slicePaths = {};

      // Usar binário do sistema para a sua arquitectura nativa (ex: arm64 no runner GitHub)
      if (sysBin) {
        slicePaths[sysBin.arch] = sysBin.path;
        const indivDest = join(outDir, `${tool}-${archTriples[sysBin.arch]}`);
        await copyFile(sysBin.path, indivDest);
        chmodSync(indivDest, 0o755);
        console.log(`  → ${tool} nativo do sistema (${sysBin.arch})`);
      }

      // Descarregar x86_64 do evermeet.cx (única arquitectura disponível)
      // Usado para o slot x64 e como fallback para arm64 se não houver binário do sistema
      let evermeetPath = null;
      {
        const url = EVERMEET.x64[tool];
        const tmpDir = `${tmpBase}-${tool}-evermeet`;
        const { found, extractDir } = await downloadBinary(url, tool, 'zip', tmpDir);
        if (found) {
          evermeetPath = `${tmpBase}-${tool}-evermeet-bin`;
          await copyFile(found, evermeetPath);
          chmodSync(evermeetPath, 0o755);
        }
        await rm(extractDir, { recursive: true, force: true }).catch(() => {});
      }

      if (evermeetPath) {
        if (!slicePaths.x64) {
          slicePaths.x64 = evermeetPath;
          const indivDest = join(outDir, `${tool}-${archTriples.x64}`);
          await copyFile(evermeetPath, indivDest);
          chmodSync(indivDest, 0o755);
        }
        if (!slicePaths.arm64) {
          // evermeet só tem x86_64 — usado como fallback; lipo detectará e usaremos cópia directa
          slicePaths.arm64 = evermeetPath;
          const indivDest = join(outDir, `${tool}-${archTriples.arm64}`);
          await copyFile(evermeetPath, indivDest);
          chmodSync(indivDest, 0o755);
        }
      }

      // Criar binário universal com lipo
      const universalDest = join(outDir, `${tool}-universal-apple-darwin`);
      const sliceList = ['arm64', 'x64'].map((a) => slicePaths[a]).filter(Boolean);

      if (sliceList.length === 2) {
        try {
          await execAsync(
            `lipo -create -output "${universalDest}" ${sliceList.map((s) => `"${s}"`).join(' ')}`,
          );
          chmodSync(universalDest, 0o755);
          console.log(`  ✓ ${tool}-universal-apple-darwin (fat binary arm64+x86_64)`);
        } catch (e) {
          const msg = (e.stderr ?? e.message ?? '').toString();
          if (msg.includes('same architectures')) {
            // Ambos os slices têm a mesma arquitectura (x86_64); usar directamente
            await copyFile(sliceList[0], universalDest);
            chmodSync(universalDest, 0o755);
            console.log(`  ✓ ${tool}-universal-apple-darwin (x86_64 — arm64 indisponível)`);
          } else {
            throw e;
          }
        }
      } else if (sliceList.length === 1) {
        await copyFile(sliceList[0], universalDest);
        chmodSync(universalDest, 0o755);
        console.log(`  ✓ ${tool}-universal-apple-darwin (single arch fallback)`);
      }

      // Limpar ficheiro temporário do evermeet
      if (evermeetPath) await unlink(evermeetPath).catch(() => {});
    }

    console.log('\nConcluído.\n');
    return;
  }

  // ── Windows / Linux: bundle único da BtbN ────────────────────────────────

  const key = `${platform}-${arch}`;
  const triple = TARGET_MAP[key];
  const ext = platform === 'win32' ? '.exe' : '';

  if (!triple) {
    console.error(`Plataforma não suportada: ${key}`);
    process.exit(1);
  }

  console.log(`Target     : ${triple}`);
  console.log(`Destino    : ${outDir}\n`);

  const bundle = BTBN_BUNDLES[key];
  if (!bundle) {
    console.error(`Bundle não encontrado para: ${key}`);
    process.exit(1);
  }

  const bins = platform === 'win32' ? ['ffmpeg.exe', 'ffprobe.exe'] : ['ffmpeg', 'ffprobe'];
  const archivePath = `${tmpBase}.${bundle.type === 'zip' ? 'zip' : 'tar.xz'}`;
  const extractDir = `${tmpBase}-out`;

  const urls = [
    `${BTBN}/${bundle.file}`,
    `https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/${bundle.file}`,
  ];

  let lastError;
  let success = false;
  for (const url of urls) {
    try {
      await downloadTo(url, archivePath);
      success = true;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`  ⚠ Falha ao descarregar de ${url}: ${err.message}`);
    }
  }

  if (!success) {
    throw lastError;
  }
  if (bundle.type === 'zip') {
    await extractZip(archivePath, extractDir);
  } else {
    await extractTar(archivePath, extractDir);
  }

  for (const bin of bins) {
    const src = findFile(extractDir, bin);
    const dest = join(outDir, bin.replace(/\.exe$/, '') + `-${triple}${ext}`);
    if (src) {
      await copyFile(src, dest);
      if (platform !== 'win32') chmodSync(dest, 0o755);
      console.log(`  ✓ ${dest.split(/[/\\]/).pop()}`);
    } else {
      console.warn(`  ⚠ ${bin} não encontrado no arquivo`);
    }
  }

  await unlink(archivePath).catch(() => {});
  await rm(extractDir, { recursive: true, force: true }).catch(() => {});

  console.log('\nConcluído.\n');
}

main().catch((err) => {
  console.error(`\nErro fatal: ${err.message}`);
  process.exit(1);
});
