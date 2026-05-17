import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm, copyFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, basename, extname } from 'path';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';
import type { ProgressCallback } from './types';
import { getFfmpegPath } from '../binaries';

const execFileAsync = promisify(execFile);

export class ProxyWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetPath, outputDir } = ctx;

    const input = ctx.transcodedPath ?? assetPath;
    const ext = extname(input) || '.mp4';
    const tmpDir = await mkdtemp(join(tmpdir(), 'nexora-proxy-'));

    try {
      const tmpOutput = join(tmpDir, `proxy${ext}`);
      const ffmpegPath = getFfmpegPath();

      const fps = ctx.assetFps ?? 25;
      const gop = Math.round(fps * 2);

      onProgress(0.1);
      await execFileAsync(
        ffmpegPath,
        [
          '-i',
          input,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-profile:v',
          'baseline',
          '-level',
          '3.1',
          '-b:v',
          '800k',
          '-maxrate',
          '1000k',
          '-bufsize',
          '1600k',
          '-g',
          String(gop),
          '-keyint_min',
          String(gop),
          '-sc_threshold',
          '0',
          '-flags',
          '+cgop',
          '-bf',
          '0',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          '-vf',
          'scale=960:540:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2',
          '-c:a',
          'aac',
          '-b:a',
          '96k',
          '-ar',
          '48000',
          '-y',
          tmpOutput,
        ],
        { timeout: 3_600_000 },
      );

      onProgress(0.9);

      const finalName = `${basename(input, ext)}_proxy${ext}`;
      const finalPath = join(outputDir, finalName);
      await copyFile(tmpOutput, finalPath);

      ctx.proxyPath = finalPath;

      emit({
        type: 'log',
        level: 'INFO',
        source: 'proxy-worker',
        message: `Proxy completed: ${finalPath}`,
      });
      onProgress(1.0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
