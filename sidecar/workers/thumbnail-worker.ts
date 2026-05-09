import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, basename, extname } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getAsset, writeAuditLog } from '../db';
import type { ProgressCallback } from './types';

const execFileAsync = promisify(execFile);

const THUMB_OFFSET_SECS = 5;
const THUMB_WIDTH = 640;

export class ThumbnailWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, assetPath, jobId, outputDir } = ctx;
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`Thumbnail: asset ${assetId} não encontrado`);

    const input = ctx.transcodedPath ?? assetPath;
    const ext = extname(input);
    const ffmpegPath = process.env['FFMPEG_PATH'] ?? 'ffmpeg';

    // Usar offset seguro: mínimo entre 5s e metade da duração
    const duration = asset.duration_secs ?? 10;
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

    writeAuditLog(jobId, 'thumbnail:completed', { assetId, thumbPath, offsetSecs: offset });
    onProgress(1.0);
  }
}
