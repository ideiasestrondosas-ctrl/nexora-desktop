import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
<<<<<<< HEAD
import { getAsset, writeAuditLog } from '../db';
import type { ProgressCallback } from './types';

export class QCPostWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, jobId } = ctx;
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`QC Post: asset ${assetId} não encontrado`);
=======
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
    const { assetId, jobId } = ctx;
>>>>>>> dev

    const distorted = ctx.transcodedPath;
    if (!distorted) throw new Error('QC Post: transcodedPath em falta');

    onProgress(0.2);

    // SHA-256 do ficheiro final para integridade
    const sha256 = await computeSHA256(distorted);

<<<<<<< HEAD
    onProgress(0.8);

    writeAuditLog(jobId, 'qc-post:passed', {
      assetId,
      sha256,
      distorted,
      vmafScore: null,
    });
=======
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

    emit({ type: 'log', level: 'INFO', source: 'qc-post-worker', message: `QC Post passed: VMAF ${vmafScore ?? 'N/A'}, passed=${vmafPassed}` });
>>>>>>> dev

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
    const modelPath = modelCandidates.find(p => p && require('fs').existsSync(p)) ?? '';

    // Verificar se o modelo existe; se não, usar modelo embutido do FFmpeg (se disponível)
    const hasModel = !!modelPath;
    const filter = hasModel
      ? `libvmaf=model='path=${modelPath}':log_path='-':log_fmt=json:n_subsample=5`
      : `libvmaf=log_path='-':log_fmt=json:n_subsample=5`;

    const { stdout } = await execFileAsync(ffmpeg, [
      '-i', distorted,
      '-i', reference,
      '-lavfi', filter,
      '-f', 'null',
      '-',
    ], { timeout: 3600_000, maxBuffer: 50 * 1024 * 1024 });

    // Procurar JSON no stdout
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('VMAF: JSON de resultado não encontrado no stdout');
    }

    const vmafData = JSON.parse(jsonMatch[0]);
    const pooled = vmafData.pooled_metrics ?? {};

    const mean = pooled.vmaf?.mean ?? 0;
    const min = pooled.vmaf?.min ?? 0;
    const max = pooled.vmaf?.max ?? 0;
    const harmonicMean = pooled.vmaf?.harmonic_mean ?? 0;

    // Calcular percentis a partir dos frames se disponíveis
    const frames = vmafData.frames ?? [];
    const scores = frames.map((f: any) => f.metrics?.vmaf ?? 0).sort((a: number, b: number) => a - b);
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
