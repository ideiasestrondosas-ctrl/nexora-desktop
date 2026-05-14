import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, basename, extname } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';
import type { ProgressCallback } from './types';
import { getFfmpegPath } from '../binaries';

const execFileAsync = promisify(execFile);

const THUMB_OFFSET_SECS = 5;
const THUMB_WIDTH = 640;

export class ThumbnailWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, assetPath, jobId, outputDir } = ctx;

    const input = ctx.transcodedPath ?? assetPath;
    const ext = extname(input);
      const ffmpegPath = getFfmpegPath();

    // Usar offset seguro: mínimo entre 5s e metade da duração
    const duration = ctx.assetDurationSecs ?? 10;
    const offset = Math.min(THUMB_OFFSET_SECS, duration / 2);

    onProgress(0.2);

    const thumbName = `${basename(input, ext)}_thumb.jpg`;
    const thumbPath = join(outputDir, thumbName);

    await execFileAsync(
      ffmpegPath,
      [
        '-ss', String(offset),
        '-i', input,
        '-vframes', '1',
        '-vf', `scale=${THUMB_WIDTH}:-1`,
        '-q:v', '3',
        '-y', thumbPath,
      ],
      { timeout: 60_000 }
    );

    ctx.thumbnailPath = thumbPath;

    emit({ type: 'log', level: 'INFO', source: 'thumbnail-worker', message: `Thumbnail completed: ${thumbPath} @ ${offset}s` });
    onProgress(1.0);
  }
}
