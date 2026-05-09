#!/usr/bin/env node
/**
 * Descarrega FFmpeg e FFprobe pré-compilados para src-tauri/binaries/.
 * Usa apenas módulos nativos do Node.js + ferramentas do sistema (tar, unzip, PowerShell).
 *
 * Uso:
 *   node scripts/download-media-binaries.js
 *   node scripts/download-media-binaries.js --platform win32 --arch x64
 */

import { createWriteStream, existsSync, mkdirSync, chmodSync, readdirSync, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { get } from 'https';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { rename, copyFile, unlink, rm } from 'fs/promises';

const execAsync = promisify(exec);

// ── Argumentos opcionais ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
const idx = (flag) => args.indexOf(flag);
const argPlatform = idx('--platform') >= 0 ? args[idx('--platform') + 1] : process.platform;
const argArch     = idx('--arch')     >= 0 ? args[idx('--arch')     + 1] : process.arch;

// ── Mapeamento plataforma → Rust target triple ───────────────────────────────

function resolveTarget(platform, arch) {
  const map = {
    'win32-x64':    'x86_64-pc-windows-msvc',
    'darwin-x64':   'x86_64-apple-darwin',
    'darwin-arm64': 'aarch64-apple-darwin',
    'linux-x64':    'x86_64-unknown-linux-gnu',
    'linux-arm64':  'aarch64-unknown-linux-gnu',
  };
  const triple = map[`${platform}-${arch}`];
  if (!triple) throw new Error(`Plataforma não suportada: ${platform}-${arch}`);
  return triple;
}

// ── URLs de download por plataforma ──────────────────────────────────────────

function resolveDownload(platform, arch) {
  const btbn = 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download';

  if (platform === 'win32') {
    const file = arch === 'arm64'
      ? 'ffmpeg-master-latest-win32-gpl.zip'
      : 'ffmpeg-master-latest-win64-gpl.zip';
    return { type: 'zip', url: `${btbn}/${file}`, bins: ['ffmpeg.exe', 'ffprobe.exe'] };
  }
  if (platform === 'linux') {
    const file = arch === 'arm64'
      ? 'ffmpeg-master-latest-linuxarm64-gpl.tar.xz'
      : 'ffmpeg-master-latest-linux64-gpl.tar.xz';
    return { type: 'tar', url: `${btbn}/${file}`, bins: ['ffmpeg', 'ffprobe'] };
  }
  if (platform === 'darwin') {
    // evermeet.cx — binários estáticos para macOS (individual por ferramenta)
    return {
      type: 'individual-zip',
      entries: [
        { name: 'ffmpeg',  url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip'  },
        { name: 'ffprobe', url: 'https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip' },
      ],
    };
  }
  throw new Error(`Plataforma não suportada: ${platform}`);
}

// ── Utilitário HTTP com seguimento de redirects ───────────────────────────────

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
  console.log(`  ↓ ${basename(url)}`);
  const res = await httpGet(url);
  await pipeline(res, createWriteStream(dest));
}

// ── Extracção de arquivos usando ferramentas do sistema ───────────────────────

async function extractZip(zipPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  if (process.platform === 'win32') {
    await execAsync(
      `powershell -NoProfile -Command "Expand-Archive -Force '${zipPath}' '${outDir}'"`,
      { timeout: 120_000 }
    );
  } else {
    await execAsync(`unzip -q -o "${zipPath}" -d "${outDir}"`, { timeout: 120_000 });
  }
}

async function extractTar(tarPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  // tar está disponível em Linux, macOS e Windows 10+ (embutido)
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const platform = argPlatform;
  const arch     = argArch;
  const triple   = resolveTarget(platform, arch);
  const ext      = platform === 'win32' ? '.exe' : '';
  const outDir   = join(process.cwd(), 'src-tauri', 'binaries');

  mkdirSync(outDir, { recursive: true });

  console.log(`\nNexora — Download de Binários Media`);
  console.log(`Plataforma : ${platform}-${arch}`);
  console.log(`Target     : ${triple}`);
  console.log(`Destino    : ${outDir}\n`);

  const info  = resolveDownload(platform, arch);
  const tmpBase = join(tmpdir(), `nexora-ffmpeg-${Date.now()}`);

  try {
    if (info.type === 'zip' || info.type === 'tar') {
      const archivePath = `${tmpBase}.${info.type === 'zip' ? 'zip' : 'tar.xz'}`;
      const extractDir  = `${tmpBase}-out`;

      await downloadTo(info.url, archivePath);

      if (info.type === 'zip') {
        await extractZip(archivePath, extractDir);
      } else {
        await extractTar(archivePath, extractDir);
      }

      for (const bin of info.bins) {
        const src  = findFile(extractDir, bin);
        const dest = join(outDir, bin.replace(/\.exe$/, '') + `-${triple}${ext}`);
        if (src) {
          await copyFile(src, dest);
          if (platform !== 'win32') chmodSync(dest, 0o755);
          console.log(`  ✓ ${basename(dest)}`);
        } else {
          console.warn(`  ⚠ ${bin} não encontrado no arquivo`);
        }
      }

      await unlink(archivePath).catch(() => {});
      await rm(extractDir, { recursive: true, force: true }).catch(() => {});

    } else if (info.type === 'individual-zip') {
      for (const { name, url } of info.entries) {
        const zipPath    = `${tmpBase}-${name}.zip`;
        const extractDir = `${tmpBase}-${name}-out`;

        await downloadTo(url, zipPath);
        await extractZip(zipPath, extractDir);

        const src  = findFile(extractDir, name);
        const dest = join(outDir, `${name}-${triple}${ext}`);
        if (src) {
          await copyFile(src, dest);
          if (platform !== 'win32') chmodSync(dest, 0o755);
          console.log(`  ✓ ${basename(dest)}`);
        } else {
          console.warn(`  ⚠ ${name} não encontrado no arquivo`);
        }

        await unlink(zipPath).catch(() => {});
        await rm(extractDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`\nErro: ${err.message}`);
    process.exit(1);
  }

  console.log('\nConcluído.\n');
}

main();
