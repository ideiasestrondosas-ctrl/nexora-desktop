import { copyFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';
import type { ProgressCallback } from './types';
import { extractBasicMetadata, extractDetailedMetadata } from '../lib/ffprobe';

export class DeliveryWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const source = ctx.transcodedPath;
    if (!source) throw new Error('Delivery: transcodedPath em falta');

    onProgress(0.1);

    const deliveryDir = ctx.outputDir;
    await mkdir(deliveryDir, { recursive: true });

    const destPath = join(deliveryDir, basename(source));
    await copyFile(source, destPath);

    onProgress(0.7);

    // Análise do ficheiro de output (para comparação antes/depois)
    let outputMetadataStr: string | undefined;
    try {
      const basicOut = await extractBasicMetadata(destPath);
      const detailedOut = await extractDetailedMetadata(destPath);
      outputMetadataStr = JSON.stringify({ ...detailedOut, ...basicOut });
    } catch {
      // Não fatal
    }

    emit({
      type: 'asset:updated',
      assetId: ctx.assetId,
      data: {
        output_path: destPath,
        output_metadata: outputMetadataStr,
      },
    });

    emit({
      type: 'log',
      level: 'INFO',
      source: 'delivery-worker',
      message: `Delivery completed: ${destPath}`,
    });
    onProgress(1.0);
  }
}
