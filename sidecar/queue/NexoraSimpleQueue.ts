import { getQueuedJobs, getRunningJobCount, getAsset } from '../db';
import { NexoraDesktopOrchestrator } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';

const POLL_INTERVAL_MS = 2_000;
const MAX_CONCURRENT = 2;

export class NexoraSimpleQueue {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
    emit({ type: 'ready' });
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.poll().finally(() => this.scheduleNext());
    }, POLL_INTERVAL_MS);
  }

    private async poll(): Promise<void> {
    try {
      const runningCount = getRunningJobCount();
      if (runningCount >= MAX_CONCURRENT) return;

      const slots = MAX_CONCURRENT - runningCount;
      const jobs = getQueuedJobs(slots);
      for (const job of jobs) {
        const asset = getAsset(job.asset_id);
        if (!asset) {
          emit({ type: 'job:failed', jobId: job.id, error: `Asset ${job.asset_id} não encontrado` });
          continue;
        }

        // Fire-and-forget — cada job corre em paralelo limitado por MAX_CONCURRENT
        // Jobs em quarentena libertam o slot automaticamente (o orchestrator retorna cedo)
        const ctx: import('../orchestrator/NexoraDesktopOrchestrator').JobContext = {
          jobId: job.id,
          assetId: job.asset_id,
          assetPath: asset.path,
          profile: job.profile,
          outputDir: this.outputDir,
          assetDurationSecs: asset.duration_secs,
          assetVideoCodec: asset.video_codec,
          assetAudioCodec: asset.audio_codec,
          assetWidth: asset.width,
          assetHeight: asset.height,
          assetFps: asset.fps,
          assetSizeBytes: asset.size_bytes,
        };
        new NexoraDesktopOrchestrator()
          .run(ctx)
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            emit({ type: 'job:failed', jobId: job.id, error: message });
          });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Queue poll error:', message);
    }
  }
}
