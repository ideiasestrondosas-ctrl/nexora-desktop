import { markJobRunning, updateJobProgress, markJobDone, markJobFailed, writeAuditLog } from '../db';
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
  // Preenchido pelos workers ao longo do pipeline
  transcodedPath?: string;
  proxyPath?: string;
  thumbnailPath?: string;
  vmafScore?: number;
  lufs?: number;
}

interface QueuedJob {
  id: string;
  asset_id: string;
  profile: string;
  output_path: string | null;
}

// Passos do pipeline e os seus pesos relativos (somam 1.0)
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
  async run(job: QueuedJob, assetPath: string, outputDir: string): Promise<void> {
    const ctx: JobContext = {
      jobId: job.id,
      assetId: job.asset_id,
      assetPath,
      profile: job.profile,
      outputDir: job.output_path ?? outputDir,
    };

    markJobRunning(job.id);
    emit({ type: 'job:started', jobId: job.id, assetId: job.asset_id });

    let globalProgress = 0;
    const stepOffsets = STEPS.map((_, i) =>
      STEPS.slice(0, i).reduce((acc, s) => acc + s.weight, 0)
    );

    const stepProgress = (stepIdx: number, localProgress: number): void => {
      const offset = stepOffsets[stepIdx] ?? 0;
      const weight = STEPS[stepIdx]?.weight ?? 0;
      globalProgress = offset + localProgress * weight;
      updateJobProgress(job.id, globalProgress, STEPS[stepIdx]?.name ?? '');
      emit({ type: 'job:progress', jobId: job.id, progress: globalProgress });
    };

    try {
      // Passo 0 — Ingest
      await new IngestWorker().run(ctx);
      stepProgress(0, 1);

      // Passo 1 — QC Pre
      await new QCPreWorker().run(ctx);
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

      markJobDone(job.id, ctx.transcodedPath ?? null, ctx.vmafScore ?? null, ctx.lufs ?? null);

      emit({
        type: 'job:completed',
        jobId: job.id,
        assetId: job.asset_id,
        data: {
          outputPath: ctx.transcodedPath ?? null,
          vmafScore: ctx.vmafScore ?? null,
          lufs: ctx.lufs ?? null,
        },
      });

      writeAuditLog(job.id, 'pipeline:completed', {
        assetId: job.asset_id,
        profile: job.profile,
        vmafScore: ctx.vmafScore ?? null,
        lufs: ctx.lufs ?? null,
        outputPath: ctx.transcodedPath ?? null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      markJobFailed(job.id, message);
      emit({ type: 'job:failed', jobId: job.id, error: message });
      writeAuditLog(job.id, 'pipeline:failed', { assetId: job.asset_id, error: message });
    }
  }
}
