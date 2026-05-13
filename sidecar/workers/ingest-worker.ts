import { execFile } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getFfprobePath } from '../binaries';
import { updateAssetFields, writeAuditLog } from '../db';

const execFileAsync = promisify(execFile);

interface StreamMetadata {
  duration: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
}

export class IngestWorker {
  async run(ctx: JobContext): Promise<void> {
    const { assetId, assetPath, jobId } = ctx;

    // Calcular SHA-256 via stream (sem carregar em memória)
    const sha256 = await computeSHA256(assetPath);

    // Extrair metadata com ffprobe
    const meta = await extractMetadata(assetPath);

    updateAssetFields(assetId, {
      duration_secs: meta.duration,
      video_codec: meta.videoCodec,
      audio_codec: meta.audioCodec,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      metadata: JSON.stringify({ ...meta, sha256 }),
      status: 'ingested',
    });

    writeAuditLog(jobId, 'ingest:completed', { assetId, sha256, ...meta });
  }
}

async function computeSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function extractMetadata(filePath: string): Promise<StreamMetadata> {
    const ffprobePath = getFfprobePath();
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath],
      { timeout: 30_000 }
    );

    const data = JSON.parse(stdout) as {
      streams?: Array<{
        codec_type: string;
        codec_name?: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
        avg_frame_rate?: string;
      }>;
      format?: { duration?: string };
    };

    const video = data.streams?.find((s) => s.codec_type === 'video');
    const audio = data.streams?.find((s) => s.codec_type === 'audio');

    let fps: number | null = null;
    const fpsStr = video?.r_frame_rate ?? video?.avg_frame_rate;
    if (fpsStr?.includes('/')) {
      const [n, d] = fpsStr.split('/').map(Number);
      if (d && d > 0) fps = Math.round((n / d) * 100) / 100;
    }

    return {
      duration: data.format?.duration ? Number(data.format.duration) : null,
      videoCodec: video?.codec_name ?? null,
      audioCodec: audio?.codec_name ?? null,
      width: video?.width ?? null,
      height: video?.height ?? null,
      fps,
    };
  } catch {
    return { duration: null, videoCodec: null, audioCodec: null, width: null, height: null, fps: null };
  }
}
