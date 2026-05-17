import { statSync } from 'fs';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';

const MIN_DURATION_SECS = 0.5;
const MAX_FILE_SIZE_BYTES = 100 * 1024 ** 3; // 100 GB

export type QCPreResult = 'PASS' | 'QUARANTINE' | 'REJECT';

export class QCPreWorker {
  async run(ctx: JobContext): Promise<QCPreResult> {
    const { assetPath, jobId } = ctx;

    const stat = statSync(assetPath);
    if (stat.size === 0) throw new Error('QC Pre: ficheiro vazio');
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `QC Pre: ficheiro demasiado grande (${(stat.size / 1024 ** 3).toFixed(1)} GB)`,
      );
    }

    if (!ctx.assetVideoCodec) {
      throw new Error('QC Pre: ficheiro sem stream de vídeo');
    }

    if (
      ctx.assetDurationSecs !== null &&
      ctx.assetDurationSecs !== undefined &&
      ctx.assetDurationSecs < MIN_DURATION_SECS
    ) {
      throw new Error(`QC Pre: duração insuficiente (${ctx.assetDurationSecs}s)`);
    }

    // Regras de quarentena (replicadas do projeto principal)
    // Se o codec for desconhecido ou não suportado, entra em quarentena
    const unsupportedCodecs = ['prores', 'dnxhd', 'av1'];
    const isUnsupported = unsupportedCodecs.some((c) =>
      ctx.assetVideoCodec?.toLowerCase().includes(c),
    );
    const isVeryLarge = stat.size > 50 * 1024 ** 3; // > 50 GB

    if (isUnsupported || isVeryLarge) {
      emit({ type: 'job:status', jobId, status: 'qc_quarantined' });
      emit({
        type: 'log',
        level: 'INFO',
        source: 'qc-pre-worker',
        message: isUnsupported ? `Codec não suportado: ${ctx.assetVideoCodec}` : 'Ficheiro > 50 GB',
      });
      return 'QUARANTINE';
    }

    emit({
      type: 'log',
      level: 'INFO',
      source: 'qc-pre-worker',
      message: `QC Pre passed: ${ctx.assetVideoCodec}, ${ctx.assetWidth}x${ctx.assetHeight}, ${ctx.assetDurationSecs}s`,
    });
    return 'PASS';
  }
}
