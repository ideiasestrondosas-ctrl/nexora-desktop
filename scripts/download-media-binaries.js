#!/usr/bin/env node
/**
 * Descarrega FFmpeg e FFprobe pré-compilados para src-tauri/binaries/.
 * Os ficheiros são renomeados para o formato Tauri externalBin:
 *   {name}-{rust-target-triple}[.exe]
 *
 * Fontes:
 *   Windows / Linux: https://github.com/BtbN/FFmpeg-Builds
 *   macOS: https://evermeet.cx/ffmpeg/
 *
 * Uso:
 *   node scripts/download-media-binaries.js
 *   node scripts/download-media-binaries.js --platform win32 --arch x64
 */

import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'fs';
import { pipeline } from 'stream/promises';
import { get } from 'https';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { createGunzip } from 'zlib';
import { extract } from 'tar';
import { createReadStream } from 'fs';
import { unlink, rename, copyFile } from 'fs/promises';

// ── Argumentos opcionais ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argPlatform = args[args.indexOf('--platform') + 1] ?? process.platform;
const argArch     = args[args.indexOf('--arch')     + 1] ?? process.arch;

// ── Mapeamento plataforma → Rust target triple ───────────────────────────────

function resolveTarget(platform, arch) {
  const map = {
    'win32-x64':    'x86_64-pc-windows-msvc',
    'darwin-x64':   'x86_64-apple-darwin',
    'darwin-arm64': 'aarch64-apple-darwin',
    'linux-x64':    'x86_64-unknown-linux-gnu',
    'linux-arm64':  'aarch64-unknown-linux-gnu',
  };
  const key = `${platform}-${arch}`;
  const triple = map[key];
  if (!triple) throw new Error(`Plataforma não suportada: ${key}`);
  return triple;
}

// ── URLs de download por plataforma ──────────────────────────────────────────

function resolveUrls(platform, arch) {
  if (platform === 'win32') {
    const base = 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download';
    const bundle = arch === 'x64'
      ? 'ffmpeg-master-latest-win64-gpl.zip'
      : 'ffmpeg-master-latest-win32-gpl.zip';
    return { type: 'zip', bundle: `${base}/${bundle}`, binaries: ['ffmpeg.exe', 'ffprobe.exe'] };
  }
  if (platform === 'linux') {
    const base = 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download';
    const bundle = arch === 'arm64'
      ? 'ffmpeg-master-latest-linuxarm64-gpl.tar.xz'
      : 'ffmpeg-master-latest-linux64-gpl.tar.xz';
    return { type: 'tar.xz', bundle: `${base}/${bundle}`, binaries: ['ffmpeg', 'ffprobe'] };
  }
  if (platform === 'darwin') {
    // evermeet.cx — binários estáticos para macOS
    return {
      type: 'individual',
      urls: {
        ffmpeg:  'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
        ffprobe: 'https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip',
      },
      binaries: ['ffmpeg', 'ffprobe'],
    };
  }
  throw new Error(`Plataforma não suportada: ${platform}`);
}

// ── Utilitários HTTP ──────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpGet(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} ao descarregar ${url}`));
        return;
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function downloadFile(url, destPath) {
  console.log(`  Descarregando ${basename(url)} ...`);
  const res = await httpGet(url);
  await pipeline(res, createWriteStream(destPath));
}

// ── Extracção ─────────────────────────────────────────────────────────────────

async function extractZip(zipPath, binaries, outDir) {
  // Usa unzip nativo no macOS/Linux; PowerShell no Windows
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  if (process.platform === 'win32') {
    const tmpOut = join(tmpdir(), 'nexora-ffmpeg-extract');
    await execAsync(`powershell -Command "Expand-Archive -Force '${zipPath}' '${tmpOut}'"`);
    for (const bin of binaries) {
      const found = findInDir(tmpOut, bin);
      if (found) await copyFile(found, join(outDir, bin));
    }
  } else {
    const tmpOut = join(tmpdir(), 'nexora-ffmpeg-extract');
    mkdirSync(tmpOut, { recursive: true });
    await execAsync(`unzip -o "${zipPath}" -d "${tmpOut}"`);
    for (const bin of binaries) {
      const found = findInDir(tmpOut, bin);
      if (found) await copyFile(found, join(outDir, bin));
    }
  }
}

function findInDir(dir, name) {
  const { readdirSync, statSync } = require('fs');
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      const result = findInDir(full, name);
      if (result) return result;
    } else if (entry === name) {
      return full;
    }
  }
  return null;
}

async function extractTarXz(tarPath, binaries, outDir) {
  const tmpOut = join(tmpdir(), 'nexora-ffmpeg-extract');
  mkdirSync(tmpOut, { recursive: true });
  await extract({ file: tarPath, cwd: tmpOut });
  for (const bin of binaries) {
    const found = findInDir(tmpOut, bin);
    if (found) await copyFile(found, join(outDir, bin));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const platform = argPlatform;
  const arch     = argArch;
  const triple   = resolveTarget(platform, arch);
  const ext      = platform === 'win32' ? '.exe' : '';

  const outDir = join(process.cwd(), 'src-tauri', 'binaries');
  mkdirSync(outDir, { recursive: true });

  console.log(`\nNexora — Download de Binários Media`);
  console.log(`Plataforma : ${platform}-${arch}`);
  console.log(`Target     : ${triple}`);
  console.log(`Destino    : ${outDir}\n`);

  const info = resolveUrls(platform, arch);
  const tmp  = join(tmpdir(), `nexora-ffmpeg-bundle-${Date.now()}`);

  try {
    if (info.type === 'zip') {
      const zipPath = `${tmp}.zip`;
      await downloadFile(info.bundle, zipPath);
      await extractZip(zipPath, info.binaries, tmp + '-out');
      mkdirSync(tmp + '-out', { recursive: true });
      // Re-extrai para tmp-out e copia
      await extractZip(zipPath, info.binaries, tmp + '-out');
      for (const bin of info.binaries) {
        const src  = join(tmp + '-out', bin);
        const dest = join(outDir, bin.replace('.exe', '') + `-${triple}${ext}`);
        if (existsSync(src)) {
          await rename(src, dest);
          console.log(`  ✓ ${basename(dest)}`);
        }
      }
      await unlink(zipPath).catch(() => {});

    } else if (info.type === 'tar.xz') {
      const tarPath = `${tmp}.tar.xz`;
      await downloadFile(info.bundle, tarPath);
      mkdirSync(`${tmp}-out`, { recursive: true });
      await extractTarXz(tarPath, info.binaries, `${tmp}-out`);
      for (const bin of info.binaries) {
        const src  = join(`${tmp}-out`, bin);
        const dest = join(outDir, `${bin}-${triple}${ext}`);
        if (existsSync(src)) {
          await rename(src, dest);
          chmodSync(dest, 0o755);
          console.log(`  ✓ ${basename(dest)}`);
        }
      }
      await unlink(tarPath).catch(() => {});

    } else if (info.type === 'individual') {
      for (const [name, url] of Object.entries(info.urls)) {
        const zipPath = `${tmp}-${name}.zip`;
        await downloadFile(url, zipPath);
        mkdirSync(`${tmp}-${name}-out`, { recursive: true });
        await extractZip(zipPath, [name], `${tmp}-${name}-out`);
        const src  = join(`${tmp}-${name}-out`, name);
        const dest = join(outDir, `${name}-${triple}${ext}`);
        if (existsSync(src)) {
          await rename(src, dest);
          chmodSync(dest, 0o755);
          console.log(`  ✓ ${basename(dest)}`);
        }
        await unlink(zipPath).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`\nErro: ${err.message}`);
    process.exit(1);
  }

  console.log('\nConcluído. Adiciona os binários ao externalBin no tauri.conf.json se ainda não estiverem listados.\n');
}

main();
