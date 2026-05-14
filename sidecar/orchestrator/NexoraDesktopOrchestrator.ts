import { emit } from '../events';
import { IngestWorker } from '../workers/ingest-worker';
import { QCPreWorker } from '../workers/qc-pre-worker';
import { TranscodeWorker } from '../workers/transcode-worker';
import { AudioWorker } from '../workers/audio-worker';
import { ProxyWorker } from '../workers/proxy-worker';
import { ThumbnailWorker } from '../workers/thumbnail-worker';
import { QCPostWorker } from '../workers/qc-post-worker';
import { DeliveryWorker } from '../workers/delivery-worker';

export interface JobContext {
  jobId: string;
  assetId: string;
  assetPath: string;
  profile: string;
  outputDir: string;
  // Asset metadata (passed from Rust, avoids DB read)
  assetDurationSecs?: number | null;
  assetVideoCodec?: string | null;
  assetAudioCodec?: string | null;
  assetWidth?: number | null;
  assetHeight?: number | null;
  assetFps?: number | null;
  assetSizeBytes?: number | null;
  // Results
  transcodedPath?: string;
  proxyPath?: string;
  thumbnailPath?: string;
  vmafScore?: number;
  lufs?: number;
}

const STEPS: Array<{ name: string; weight: number }> = [
  { name: 'ingest',     weight: 0.05 },
  { name: 'qc-pre',     weight: 0.05 },
  { name: 'transcode',  weight: 0.50 },
  { name: 'audio',      weight: 0.15 },
  { name: 'proxy',      weight: 0.10 },
  { name: 'thumbnail',  weight: 0.03 },
  { name: 'qc-post',    weight: 0.07 },
  { name: 'delivery',   weight: 0.05 },
];

export class NexoraDesktopOrchestrator {
  async run(ctx: JobContext): Promise<void> {
    emit({ type: 'job:started', jobId: ctx.jobId, assetId: ctx.assetId });

    let globalProgress = 0;
    const stepOffsets = STEPS.map((_, i) =>
      STEPS.slice(0, i).reduce((acc, s) => acc + s.weight, 0)
    );

    const stepProgress = (stepIdx: number, localProgress: number): void => {
      const offset = stepOffsets[stepIdx] ?? 0;
      const weight = STEPS[stepIdx]?.weight ?? 0;
      globalProgress = offset + localProgress * weight;
      emit({ type: 'job:progress', jobId: ctx.jobId, progress: globalProgress, step: STEPS[stepIdx]?.name ?? '' });
    };

    try {
      // Passo 0 — Ingest
      await new IngestWorker().run(ctx);
      stepProgress(0, 1);

      // Passo 1 — QC Pre
      const qcResult = await new QCPreWorker().run(ctx);
      if (qcResult === 'QUARANTINE') {
        emit({ type: 'job:quarantined', jobId: ctx.jobId, assetId: ctx.assetId });
        return;
      }
      if (qcResult === 'REJECT') {
        throw new Error('QC Pré: rejeitado');
      }
      stepProgress(1, 1);

      // Passo 2 — Transcode
      await new TranscodeWorker().run(ctx, (p) => stepProgress(2, p));

      // Passo 3 — Audio
      await new AudioWorker().run(ctx, (p) => stepProgress(3, p));

      // Passo 4 — Proxy (não-crítico)
      try {
        await new ProxyWorker().run(ctx, (p) => stepProgress(4, p));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Proxy falhou (não-crítico): ${msg}`);
        stepProgress(4, 1);
      }

      // Passo 5 — Thumbnail (não-crítico)
      try {
        await new ThumbnailWorker().run(ctx, (p) => stepProgress(5, p));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Thumbnail falhou (não-crítico): ${msg}`);
        stepProgress(5, 1);
      }

      // Passo 6 — QC Post (não-crítico: VMAF pode não estar disponível)
      try {
        await new QCPostWorker().run(ctx, (p) => stepProgress(6, p));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`QC Post falhou (não-crítico): ${msg}`);
        stepProgress(6, 1);
      }

      // Passo 7 — Delivery
      await new DeliveryWorker().run(ctx, (p) => stepProgress(7, p));

      emit({
        type: 'job:completed',
        jobId: ctx.jobId,
        assetId: ctx.assetId,
        data: {
          outputPath: ctx.transcodedPath ?? null,
          vmafScore: ctx.vmafScore ?? null,
          lufs: ctx.lufs ?? null,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: 'job:failed', jobId: ctx.jobId, error: message });
      throw err;
    }
  }
}
