import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm, copyFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, extname, basename } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';
import type { ProgressCallback } from './types';
import { getFfmpegPath } from '../binaries';
import { loadProfile } from '../profiles/types';
import type { TranscodeProfile } from '../profiles/types';

const execFileAsync = promisify(execFile);
const FFMPEG_TIMEOUT_MS = 14_400_000; // 4h — ADR-D010

export class TranscodeWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetPath, profile: profileName, outputDir } = ctx;

    const profile = loadProfile(profileName);
    const targetCodec = profile.videoCodec ?? 'libx264';

    // Extensão de saída baseada no container do perfil
    const containerExt = profile.container === 'webm' ? '.webm' : '.mp4';
    const inputExt = extname(assetPath) || '.mp4';
    const tmpDir = await mkdtemp(join(tmpdir(), 'nexora-transcode-'));

    try {
      const tmpOutput = join(tmpDir, `output${containerExt}`);

      if (targetCodec === 'libvpx-vp9') {
        // VP9 — sem GPU variant
        const args = buildVp9Args(assetPath, tmpOutput, profile, ctx.assetFps ?? null);
        const ffmpegPath = getFfmpegPath();
        await runFFmpeg(ffmpegPath, args, ctx.assetDurationSecs ?? null, onProgress);
      } else if (targetCodec === 'libx265') {
        // HEVC — com GPU fallback
        const hevcEncoder = await detectHevcEncoder();
        const args = buildHevcArgs(
          assetPath,
          tmpOutput,
          profile,
          hevcEncoder,
          ctx.assetFps ?? null,
        );
        const ffmpegPath = getFfmpegPath();
        try {
          await runFFmpeg(ffmpegPath, args, ctx.assetDurationSecs ?? null, onProgress);
        } catch {
          if (hevcEncoder !== 'libx265') {
            console.warn(`Transcode: HEVC GPU (${hevcEncoder}) falhou — libx265 CPU fallback`);
            const cpuArgs = buildHevcArgs(
              assetPath,
              tmpOutput,
              profile,
              'libx265',
              ctx.assetFps ?? null,
            );
            await runFFmpeg(ffmpegPath, cpuArgs, ctx.assetDurationSecs ?? null, onProgress);
          } else {
            throw new Error(`Transcode HEVC falhou com libx265`);
          }
        }
      } else {
        // H.264 — comportamento original
        const gpu = await detectGPU();
        const encoder = resolveEncoder(gpu, profile);
        const args = buildArgs(assetPath, tmpOutput, profile, encoder, ctx.assetFps ?? null);
        const ffmpegPath = getFfmpegPath();
        try {
          await runFFmpeg(ffmpegPath, args, ctx.assetDurationSecs ?? null, onProgress);
        } catch (gpuErr) {
          if (encoder !== 'libx264') {
            console.warn(`Transcode: GPU (${encoder}) falhou — CPU fallback`);
            const cpuArgs = buildArgs(
              assetPath,
              tmpOutput,
              profile,
              'libx264',
              ctx.assetFps ?? null,
            );
            await runFFmpeg(ffmpegPath, cpuArgs, ctx.assetDurationSecs ?? null, onProgress);
          } else {
            throw gpuErr;
          }
        }
      }

      const finalName = `${basename(assetPath, inputExt)}_${profileName}${containerExt}`;
      const finalPath = join(outputDir, finalName);
      await copyFile(tmpOutput, finalPath);

      ctx.transcodedPath = finalPath;
      emit({
        type: 'log',
        level: 'INFO',
        source: 'transcode-worker',
        message: `Transcode completed: ${profileName} -> ${finalPath}`,
      });
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// ── GPU / Encoder detection ────────────────────────────────────────────────────

interface GpuResult {
  vendor: 'nvidia' | 'amd' | 'intel' | 'cpu';
  encoder: string;
}

async function detectGPU(): Promise<GpuResult> {
  try {
    await execFileAsync('nvidia-smi', [], { timeout: 5000 });
    return { vendor: 'nvidia', encoder: 'h264_nvenc' };
  } catch {
    /* continuar */
  }

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

async function detectHevcEncoder(): Promise<string> {
  try {
    await execFileAsync('nvidia-smi', [], { timeout: 5000 });
    return 'hevc_nvenc';
  } catch {
    /* continuar */
  }

  if (process.platform === 'win32') {
    const { existsSync } = await import('fs');
    if (existsSync('C:/Windows/System32/amfrt64.dll')) return 'hevc_amf';
    if (
      existsSync('C:/Windows/System32/libmfxhw64.dll') ||
      existsSync('C:/Windows/System32/libmfx64-gen.dll')
    )
      return 'hevc_qsv';
  }
  return 'libx265';
}

function resolveEncoder(gpu: GpuResult, _profile: TranscodeProfile): string {
  return gpu.encoder;
}

// ── FFmpeg args builders ───────────────────────────────────────────────────────

function buildArgs(
  input: string,
  output: string,
  profile: TranscodeProfile,
  encoder: string,
  assetFps: number | null,
): string[] {
  const fps = assetFps ?? profile.fps ?? 25;
  const gop = Math.round(fps * 2);

  const args: string[] = [
    '-i',
    input,
    '-c:v',
    encoder,
    '-g',
    String(gop),
    '-keyint_min',
    String(gop),
    '-sc_threshold',
    '0',
    '-flags',
    '+cgop',
    '-bf',
    '0',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
  ];

  if (encoder === 'libx264') {
    args.push(
      '-preset',
      profile.cpuPreset,
      '-profile:v',
      profile.h264Profile,
      '-level',
      profile.h264Level,
    );
  } else if (encoder === 'h264_nvenc') {
    args.push('-preset', profile.nvencPreset);
  }

  if (profile.videoBitrateK > 0) {
    args.push('-b:v', `${profile.videoBitrateK}k`);
    args.push('-maxrate', `${profile.maxrateK}k`);
    args.push('-bufsize', `${profile.bufsizeK}k`);
  }

  if (
    profile.resolution !== 'original' &&
    profile.resolution !== 'Original' &&
    profile.resolution
  ) {
    args.push('-vf', `scale=${profile.resolution}`);
  }

  args.push('-c:a', profile.audioCodec);
  if (profile.audioBitrateK > 0) args.push('-b:a', `${profile.audioBitrateK}k`);
  args.push('-ar', String(profile.audioSampleRate));

  args.push('-y', output);
  return args;
}

function buildHevcArgs(
  input: string,
  output: string,
  profile: TranscodeProfile,
  encoder: string,
  assetFps: number | null,
): string[] {
  const fps = assetFps ?? profile.fps ?? 25;
  const gop = Math.round(fps * 2);

  const args: string[] = [
    '-i',
    input,
    '-c:v',
    encoder,
    '-g',
    String(gop),
    '-keyint_min',
    String(gop),
    '-sc_threshold',
    '0',
    '-pix_fmt',
    'yuv420p',
  ];

  if (encoder === 'libx265') {
    const preset = profile.hevcPreset ?? 'medium';
    const crf = profile.hevcCrf ?? 22;
    args.push('-preset', preset, '-crf', String(crf));
    // libx265 usa -movflags +faststart via container mp4
    args.push('-movflags', '+faststart');
  } else if (encoder === 'hevc_nvenc') {
    const preset = profile.hevcPreset ?? 'p4';
    args.push('-preset', preset);
    if (profile.hevcCrf && profile.hevcCrf > 0) args.push('-cq', String(profile.hevcCrf));
  } else if (encoder === 'hevc_amf' || encoder === 'hevc_qsv') {
    const preset = profile.hevcPreset ?? 'medium';
    args.push('-preset', preset);
  }

  if (
    profile.resolution !== 'original' &&
    profile.resolution !== 'Original' &&
    profile.resolution
  ) {
    args.push('-vf', `scale=${profile.resolution}`);
  }

  args.push('-c:a', profile.audioCodec);
  if (profile.audioBitrateK > 0) args.push('-b:a', `${profile.audioBitrateK}k`);
  args.push('-ar', String(profile.audioSampleRate));

  args.push('-y', output);
  return args;
}

function buildVp9Args(
  input: string,
  output: string,
  profile: TranscodeProfile,
  assetFps: number | null,
): string[] {
  const fps = assetFps ?? profile.fps ?? 30;
  const gop = Math.round(fps * 2);

  const crf = profile.vp9Crf ?? 33;
  const speed = profile.vp9Speed ?? 2;

  const args: string[] = [
    '-i',
    input,
    '-c:v',
    'libvpx-vp9',
    '-crf',
    String(crf),
    '-b:v',
    '0',
    '-row-mt',
    '1',
    '-g',
    String(gop),
    '-cpu-used',
    String(speed),
    '-pix_fmt',
    'yuv420p',
  ];

  if (
    profile.resolution !== 'original' &&
    profile.resolution !== 'Original' &&
    profile.resolution
  ) {
    args.push('-vf', `scale=${profile.resolution}`);
  }

  // libopus para VP9 — fallback para libvorbis se não disponível
  const audioCodec = profile.audioCodec === 'libopus' ? 'libopus' : profile.audioCodec;
  args.push('-c:a', audioCodec);
  if (profile.audioBitrateK > 0) args.push('-b:a', `${profile.audioBitrateK}k`);
  args.push('-ar', String(profile.audioSampleRate));

  args.push('-y', output);
  return args;
}

// ── FFmpeg runner ──────────────────────────────────────────────────────────────

function runFFmpeg(
  ffmpegPath: string,
  args: string[],
  durationSecs: number | null,
  onProgress: ProgressCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
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
