import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm, copyFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, extname, basename } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getAsset, writeAuditLog } from '../db';
import type { ProgressCallback } from './types';
import { getFfmpegPath } from '../binaries';
import { loadProfile } from '../profiles/types';
import type { TranscodeProfile } from '../profiles/types';

const execFileAsync = promisify(execFile);
const FFMPEG_TIMEOUT_MS = 14_400_000; // 4h — ADR-D010

export class TranscodeWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, assetPath, jobId, profile: profileName, outputDir } = ctx;
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`Transcode: asset ${assetId} não encontrado`);

    const profile = loadProfile(profileName);
    const gpu = await detectGPU();
    const encoder = resolveEncoder(gpu, profile);

    const ext = extname(assetPath) || '.mp4';
    const tmpDir = await mkdtemp(join(tmpdir(), 'nexora-transcode-'));

    try {
      const tmpOutput = join(tmpDir, `output${ext}`);
      const args = buildArgs(assetPath, tmpOutput, profile, encoder, asset.fps);
      const ffmpegPath = getFfmpegPath();

      // Tentar GPU; em caso de falha usar CPU fallback
      try {
        await runFFmpeg(ffmpegPath, args, asset.duration_secs, onProgress);
      } catch (gpuErr) {
        if (encoder !== 'libx264') {
          console.warn(`Transcode: GPU (${encoder}) falhou — CPU fallback`);
          const cpuArgs = buildArgs(assetPath, tmpOutput, profile, 'libx264', asset.fps);
          await runFFmpeg(ffmpegPath, cpuArgs, asset.duration_secs, onProgress);
        } else {
          throw gpuErr;
        }
      }

      const finalName = `${basename(assetPath, ext)}_${profileName}${ext}`;
      const finalPath = join(outputDir, finalName);
      await copyFile(tmpOutput, finalPath);

      ctx.transcodedPath = finalPath;
      writeAuditLog(jobId, 'transcode:completed', { assetId, profileName, encoder, finalPath });
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// ── GPU detection ──────────────────────────────────────────────────

interface GpuResult {
  vendor: 'nvidia' | 'amd' | 'intel' | 'cpu';
  encoder: string;
}

async function detectGPU(): Promise<GpuResult> {
  // NVENC
  try {
    await execFileAsync('nvidia-smi', [], { timeout: 5000 });
    return { vendor: 'nvidia', encoder: 'h264_nvenc' };
  } catch { /* continuar */ }

  // AMF (Windows)
  if (process.platform === 'win32') {
    const { existsSync } = await import('fs');
    if (existsSync('C:/Windows/System32/amfrt64.dll')) {
      return { vendor: 'amd', encoder: 'h264_amf' };
    }
    if (
      existsSync('C:/Windows/System32/libmfxhw64.dll') ||
      existsSync('C:/Windows/System32/libmfx64-gen.dll')
    ) {
      return { vendor: 'intel', encoder: 'h264_qsv' };
    }
  }

  return { vendor: 'cpu', encoder: 'libx264' };
}

function resolveEncoder(gpu: GpuResult, _profile: TranscodeProfile): string {
  return gpu.encoder;
}

// ── FFmpeg args builder (ADR-D010) ─────────────────────────────────

function buildArgs(
  input: string,
  output: string,
  profile: TranscodeProfile,
  encoder: string,
  assetFps: number | null
): string[] {
  const fps = assetFps ?? profile.fps ?? 25;
  const gop = Math.round(fps * 2); // ADR-D010: -g fps*2

  const args: string[] = [
    '-i', input,
    '-c:v', encoder,
    // Parâmetros broadcast obrigatórios (ADR-D010)
    '-g', String(gop),
    '-keyint_min', String(gop),
    '-sc_threshold', '0',
    '-flags', '+cgop',
    '-bf', '0',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  ];

  if (encoder === 'libx264') {
    args.push('-preset', profile.cpuPreset, '-profile:v', profile.h264Profile, '-level', profile.h264Level);
  } else if (encoder === 'h264_nvenc') {
    args.push('-preset', profile.nvencPreset);
  }

  if (profile.videoBitrateK > 0) {
    args.push('-b:v', `${profile.videoBitrateK}k`);
    args.push('-maxrate', `${profile.maxrateK}k`);
    args.push('-bufsize', `${profile.bufsizeK}k`);
  }

  if (profile.resolution !== 'Original' && profile.resolution) {
    args.push('-vf', `scale=${profile.resolution}`);
  }

  args.push('-c:a', profile.audioCodec);
  if (profile.audioBitrateK > 0) args.push('-b:a', `${profile.audioBitrateK}k`);
  args.push('-ar', String(profile.audioSampleRate));

  args.push('-y', output);
  return args;
}

// ── FFmpeg runner ──────────────────────────────────────────────────

function runFFmpeg(
  ffmpegPath: string,
  args: string[],
  durationSecs: number | null,
  onProgress: ProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    // ADR-D010 + CLAUDE.md: SEMPRE execFile com array, nunca exec com string
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`FFmpeg timeout após ${FFMPEG_TIMEOUT_MS / 1000}s`));
    }, FFMPEG_TIMEOUT_MS);

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;

      if (!durationSecs) return;
      const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.?\d*)/);
      if (timeMatch) {
        const [, h, m, s] = timeMatch;
        const cur = Number(h) * 3600 + Number(m) * 60 + Number(s);
        onProgress(Math.min(cur / durationSecs, 0.99));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        onProgress(1.0);
        resolve();
      } else {
        const tail = stderr.split('\n').slice(-5).join('\n');
        reject(new Error(`FFmpeg código ${code}: ${tail}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
