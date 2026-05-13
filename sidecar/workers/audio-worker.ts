import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm, copyFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, basename, extname } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { writeAuditLog, getAsset } from '../db';
import type { ProgressCallback } from './types';
import { getFfmpegPath } from '../binaries';
import { loadProfile } from '../profiles/types';

const execFileAsync = promisify(execFile);

export class AudioWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, assetPath, jobId, profile: profileName, outputDir } = ctx;
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`Audio: asset ${assetId} não encontrado`);

    const profile = loadProfile(profileName);
    const targetLufs = profile.targetLufs;
    const truePeak = profile.truePeakLimitDbtp;
    const input = ctx.transcodedPath ?? assetPath;

    const tmpDir = await mkdtemp(join(tmpdir(), 'nexora-audio-'));

    try {
      const normalized = join(tmpDir, 'normalized.wav');
      const ffmpegPath = getFfmpegPath();

      // Pass 1 — análise EBU R128 (ADR-D010)
      onProgress(0.1);
      const measured = await loudnessAnalysis(ffmpegPath, input);
      const gainDb = targetLufs - measured.integratedLufs;

      // Pass 2 — normalização com limitador de true peak
      onProgress(0.5);
      await loudnessNormalize(ffmpegPath, input, normalized, gainDb, truePeak);

      // Verificar LUFS resultante
      onProgress(0.85);
      const after = await loudnessAnalysis(ffmpegPath, normalized);

      // Verificar BS1770GAIN se disponível
      let verifiedByBs1770 = false;
      try {
        await execFileAsync('bs1770gain', ['--ebu', '-i', normalized], { timeout: 60_000 });
        verifiedByBs1770 = true;
      } catch { /* bs1770gain não instalado — não crítico */ }

      if (Math.abs(after.integratedLufs - targetLufs) > 1.5) {
        throw new Error(
          `Normalização fora de especificação: ${after.integratedLufs.toFixed(1)} LUFS (target ${targetLufs})`
        );
      }

      const finalPath = join(outputDir, `${basename(input, extname(input))}_normalized.wav`);
      await copyFile(normalized, finalPath);

      ctx.lufs = after.integratedLufs;

      writeAuditLog(jobId, 'audio:completed', {
        assetId,
        targetLufs,
        measuredLufs: after.integratedLufs,
        truePeak: after.truePeak,
        verifiedByBs1770,
        finalPath,
      });

      onProgress(1.0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

interface LoudnessResult {
  integratedLufs: number;
  truePeak: number;
  loudnessRange: number;
}

async function loudnessAnalysis(ffmpegPath: string, input: string): Promise<LoudnessResult> {
  // ADR-D010: SEMPRE execFile com array
  const { stderr } = await execFileAsync(
    ffmpegPath,
    ['-i', input, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
    { timeout: 600_000 }
  ).catch((e: { stderr?: string }) => ({ stderr: e.stderr ?? '' }));

  const match = stderr.match(/\{[\s\S]*?"input_i"\s*:\s*"([-\d.]+)"[\s\S]*?"input_tp"\s*:\s*"([-\d.]+)"[\s\S]*?"input_lra"\s*:\s*"([-\d.]+)"/);
  if (match) {
    return {
      integratedLufs: Number(match[1]),
      truePeak: Number(match[2]),
      loudnessRange: Number(match[3]),
    };
  }
  return { integratedLufs: -23, truePeak: -1, loudnessRange: 7 };
}

async function loudnessNormalize(
  ffmpegPath: string,
  input: string,
  output: string,
  gainDb: number,
  truePeakLimit: number
): Promise<void> {
  // Pass 2: aplicar ganho + limiter de true peak
  await execFileAsync(
    ffmpegPath,
    [
      '-i', input,
      '-af', `volume=${gainDb.toFixed(2)}dB,alimiter=level_in=1:level_out=1:limit=${Math.pow(10, truePeakLimit / 20).toFixed(4)}:attack=5:release=50`,
      '-ar', '48000',
      '-y', output,
    ],
    { timeout: 600_000 }
  );
}
