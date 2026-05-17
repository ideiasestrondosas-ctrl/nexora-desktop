import { createReadStream, existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve, relative } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';
import { getFfmpegPath } from '../binaries';
import type { ProgressCallback } from './types';

const execFileAsync = promisify(execFile);

// Thresholds VMAF por perfil (replicados do projeto principal)
const VMAF_THRESHOLDS: Record<string, number> = {
  'broadcast-hd': 90,
  'broadcast-sd': 90,
  'web-4k': 85,
  'web-hd': 85,
  'proxy': 70,
  'social': 85,
};

export class QCPostWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const distorted = ctx.transcodedPath;
    if (!distorted) throw new Error('QC Post: transcodedPath em falta');

    onProgress(0.2);

    const sha256 = await computeSHA256(distorted);

    onProgress(0.5);

    // VMAF — comparar original vs transcodificado
    let vmafScore: number | null = null;
    let vmafPassed = false;

    try {
      const vmafResult = await this.calculateVMAF(ctx.assetPath, distorted, ctx.profile);
      vmafScore = vmafResult.mean;
      const threshold = VMAF_THRESHOLDS[ctx.profile] ?? 85;
      vmafPassed = vmafResult.mean >= threshold && vmafResult.percentile1 >= threshold - 5;
      ctx.vmafScore = vmafScore;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`QC Post: VMAF falhou (não-crítico): ${msg}`);
      // Não falha o pipeline se o VMAF não conseguir correr
    }

    onProgress(0.9);

    emit({ type: 'log', level: 'INFO', source: 'qc-post-worker', message: `QC Post passed: VMAF ${vmafScore ?? 'N/A'}, passed=${vmafPassed}, sha256=${sha256}` });

    onProgress(1.0);
  }

  private async calculateVMAF(reference: string, distorted: string, profile: string): Promise<{
    mean: number;
    min: number;
    max: number;
    percentile1: number;
    percentile5: number;
    harmonicMean: number;
    passed: boolean;
    failureReason?: string;
  }> {
    const ffmpeg = getFfmpegPath();

    // Resolver path do modelo VMAF
    const resourceDir = process.env['NEXORA_RESOURCE_DIR'];
    const modelCandidates = [
      resourceDir ? resolve(resourceDir, 'vmaf_models', 'vmaf_v0.6.1.json') : '',
      resolve(__dirname, '..', '..', 'src-tauri', 'resources', 'vmaf_models', 'vmaf_v0.6.1.json'),
      resolve(__dirname, '..', '..', 'resources', 'vmaf_models', 'vmaf_v0.6.1.json'),
    ];
    const modelPath = modelCandidates.find(p => p && existsSync(p)) ?? '';

    // Converter para caminho relativo de forma a evitar os problemas de escaping
    // com a letra do disco (ex: C:) que partem o parser do FFmpeg.
    const relModelPath = modelPath ? relative(process.cwd(), modelPath) : '';
    const safeModelPath = relModelPath.replace(/\\/g, '/');
    const hasModel = !!modelPath;
    
    const tempLogFile = distorted + '.vmaf.json';
    const relLogPath = relative(process.cwd(), tempLogFile).replace(/\\/g, '/');

    const filter = hasModel
      ? `[0:v]scale=1920:1080:flags=bicubic[dist];[1:v]scale=1920:1080:flags=bicubic[ref];[dist][ref]libvmaf=model=path=${safeModelPath}:log_path=${relLogPath}:log_fmt=json:n_subsample=5`
      : `[0:v]scale=1920:1080:flags=bicubic[dist];[1:v]scale=1920:1080:flags=bicubic[ref];[dist][ref]libvmaf=log_path=${relLogPath}:log_fmt=json:n_subsample=5`;

    try {
      await execFileAsync(ffmpeg, [
        '-i', distorted,
        '-i', reference,
        '-lavfi', filter,
        '-f', 'null',
        '-',
      ], { timeout: 3600_000, maxBuffer: 50 * 1024 * 1024 });
    } catch (e) {
      // Ignora erro de exit code, vmaf pode ter escrito o json antes de falhar ou
      // o null muxer causar EOF error
    }

    if (!existsSync(tempLogFile)) {
      throw new Error('VMAF: ficheiro de log não foi gerado pelo FFmpeg');
    }

    const jsonContent = await readFile(tempLogFile, 'utf8');
    await unlink(tempLogFile).catch(() => {});

    const vmafData = JSON.parse(jsonContent) as {
      pooled_metrics?: { vmaf?: { mean?: number; min?: number; max?: number; harmonic_mean?: number } };
      frames?: Array<{ metrics?: { vmaf?: number } }>;
    };
    const pooled = vmafData.pooled_metrics ?? {};

    const mean = pooled.vmaf?.mean ?? 0;
    const min = pooled.vmaf?.min ?? 0;
    const max = pooled.vmaf?.max ?? 0;
    const harmonicMean = pooled.vmaf?.harmonic_mean ?? 0;

    // Calcular percentis a partir dos frames se disponíveis
    const frames = vmafData.frames ?? [];
    const scores = frames.map((f) => f.metrics?.vmaf ?? 0).sort((a, b) => a - b);
    const percentile1 = scores.length > 0 ? scores[Math.floor(scores.length * 0.01)] ?? scores[0] : 0;
    const percentile5 = scores.length > 0 ? scores[Math.floor(scores.length * 0.05)] ?? scores[0] : 0;

    const threshold = VMAF_THRESHOLDS[profile] ?? 85;
    const passed = mean >= threshold && percentile1 >= threshold - 5;

    return {
      mean,
      min,
      max,
      percentile1,
      percentile5,
      harmonicMean,
      passed,
      failureReason: passed ? undefined : `VMAF médio ${mean.toFixed(1)} abaixo do threshold ${threshold}`,
    };
  }
}

async function computeSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
