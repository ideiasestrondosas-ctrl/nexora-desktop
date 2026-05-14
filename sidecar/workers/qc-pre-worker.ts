import { statSync } from 'fs';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getAsset, writeAuditLog, updateJobStatus } from '../db';

const MIN_DURATION_SECS = 0.5;
const MAX_FILE_SIZE_BYTES = 100 * 1024 ** 3; // 100 GB

export type QCPreResult = 'PASS' | 'QUARANTINE' | 'REJECT';

export class QCPreWorker {
  async run(ctx: JobContext): Promise<QCPreResult> {
    const { assetId, assetPath, jobId } = ctx;

    const stat = statSync(assetPath);
    if (stat.size === 0) throw new Error('QC Pre: ficheiro vazio');
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `QC Pre: ficheiro demasiado grande (${(stat.size / 1024 ** 3).toFixed(1)} GB)`
      );
    }

    const asset = getAsset(assetId);
    if (!asset) throw new Error(`QC Pre: asset ${assetId} não encontrado`);

    if (!asset.video_codec) {
      throw new Error('QC Pre: ficheiro sem stream de vídeo');
    }

    if (asset.duration_secs !== null && asset.duration_secs < MIN_DURATION_SECS) {
      throw new Error(`QC Pre: duração insuficiente (${asset.duration_secs}s)`);
    }

    // Regras de quarentena (replicadas do projeto principal)
    // Se o codec for desconhecido ou não suportado, entra em quarentena
    const unsupportedCodecs = ['hevc', 'prores', 'dnxhd', 'av1'];
    const isUnsupported = unsupportedCodecs.some(c => asset.video_codec?.toLowerCase().includes(c));
    const isVeryLarge = stat.size > 50 * 1024 ** 3; // > 50 GB

    if (isUnsupported || isVeryLarge) {
      updateJobStatus(jobId, 'qc_quarantined');
      writeAuditLog(jobId, 'qc-pre:quarantined', {
        assetId,
        reason: isUnsupported ? `Codec não suportado: ${asset.video_codec}` : 'Ficheiro > 10 GB',
        sizeBytes: stat.size,
        videoCodec: asset.video_codec,
      });
      return 'QUARANTINE';
    }

    writeAuditLog(jobId, 'qc-pre:passed', {
      assetId,
      sizeBytes: stat.size,
      durationSecs: asset.duration_secs,
      videoCodec: asset.video_codec,
      audioCodec: asset.audio_codec,
      resolution: `${asset.width}x${asset.height}`,
    });
    return 'PASS';
  }
}
