import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';
import type { ProgressCallback } from './types';
import { generateThumbnail } from '../lib/ffprobe';

export class ThumbnailWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, assetPath } = ctx;

    const input = ctx.transcodedPath ?? assetPath;

    onProgress(0.2);

    const thumbPath = await generateThumbnail(input, assetId, 'out', ctx.assetDurationSecs ?? null);

    if (thumbPath) {
      ctx.thumbnailPath = thumbPath;
      emit({
        type: 'asset:updated',
        assetId,
        data: { thumbnail_output_path: thumbPath },
      });
    }

    emit({
      type: 'log',
      level: 'INFO',
      source: 'thumbnail-worker',
      message: `Thumbnail output: ${thumbPath ?? 'n/a'}`,
    });
    onProgress(1.0);
  }
}
