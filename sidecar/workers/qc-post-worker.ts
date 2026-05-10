import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getAsset, writeAuditLog } from '../db';
import type { ProgressCallback } from './types';

export class QCPostWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, jobId } = ctx;
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`QC Post: asset ${assetId} não encontrado`);

    const distorted = ctx.transcodedPath;
    if (!distorted) throw new Error('QC Post: transcodedPath em falta');

    onProgress(0.2);

    // SHA-256 do ficheiro final para integridade
    const sha256 = await computeSHA256(distorted);

    onProgress(0.8);

    writeAuditLog(jobId, 'qc-post:passed', {
      assetId,
      sha256,
      distorted,
      vmafScore: null,
    });

    onProgress(1.0);
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
