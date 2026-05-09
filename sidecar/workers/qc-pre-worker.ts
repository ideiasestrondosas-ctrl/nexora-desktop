import { statSync } from 'fs';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getAsset, writeAuditLog } from '../db';

const MIN_DURATION_SECS = 0.5;
const MAX_FILE_SIZE_BYTES = 100 * 1024 ** 3; // 100 GB

export class QCPreWorker {
  async run(ctx: JobContext): Promise<void> {
    const { assetId, assetPath, jobId } = ctx;

    // Verificar existência e tamanho
    const stat = statSync(assetPath);
    if (stat.size === 0) throw new Error('QC Pre: ficheiro vazio');
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `QC Pre: ficheiro demasiado grande (${(stat.size / 1024 ** 3).toFixed(1)} GB)`
      );
    }

    // Verificar metadata da ingestão
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`QC Pre: asset ${assetId} não encontrado`);

    if (!asset.video_codec) {
      throw new Error('QC Pre: ficheiro sem stream de vídeo');
    }

    if (asset.duration_secs !== null && asset.duration_secs < MIN_DURATION_SECS) {
      throw new Error(`QC Pre: duração insuficiente (${asset.duration_secs}s)`);
    }

    writeAuditLog(jobId, 'qc-pre:passed', {
      assetId,
      sizeBytes: stat.size,
      durationSecs: asset.duration_secs,
      videoCodec: asset.video_codec,
      audioCodec: asset.audio_codec,
      resolution: `${asset.width}x${asset.height}`,
    });
  }
}
