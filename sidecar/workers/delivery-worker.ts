import { copyFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getAsset, getSetting, writeAuditLog } from '../db';
import type { ProgressCallback } from './types';

export class DeliveryWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, jobId } = ctx;
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`Delivery: asset ${assetId} não encontrado`);

    const source = ctx.transcodedPath;
    if (!source) throw new Error('Delivery: transcodedPath em falta');

    onProgress(0.1);

    // Prioridade: output_dir_{profile} > output_dir global > outputDir do job
    // || null converte string vazia (default das settings) para null, activando o fallback
    const profileDir = getSetting(`output_dir_${ctx.profile}`) || null;
    const globalDir = getSetting('output_dir') || null;
    const deliveryDir = profileDir ?? globalDir ?? ctx.outputDir;

    await mkdir(deliveryDir, { recursive: true });

    const destPath = join(deliveryDir, basename(source));
    await copyFile(source, destPath);

    onProgress(0.9);

    writeAuditLog(jobId, 'delivery:completed', {
      assetId,
      source,
      destination: destPath,
      vmafScore: ctx.vmafScore ?? null,
      lufs: ctx.lufs ?? null,
      thumbnailPath: ctx.thumbnailPath ?? null,
      proxyPath: ctx.proxyPath ?? null,
    });

    onProgress(1.0);
  }
}
