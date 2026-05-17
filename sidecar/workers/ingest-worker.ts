import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { emit } from '../events';
import {
  extractBasicMetadata,
  extractDetailedMetadata,
  extractExtendedMetadata,
  generateThumbnail,
} from '../lib/ffprobe';

// ── Worker ─────────────────────────────────────────────────────────────────────

export class IngestWorker {
  async run(ctx: JobContext): Promise<void> {
    const { assetId, assetPath } = ctx;

    const sha256 = await computeSHA256(assetPath);

    const meta = await extractBasicMetadata(assetPath);

    ctx.assetDurationSecs = meta.duration;
    ctx.assetVideoCodec = meta.videoCodec;
    ctx.assetAudioCodec = meta.audioCodec;
    ctx.assetWidth = meta.width;
    ctx.assetHeight = meta.height;
    ctx.assetFps = meta.fps;

    // Análise alargada (HDR, bit depth, interlace, etc.) — não bloqueia se falhar
    let extended: Awaited<ReturnType<typeof extractExtendedMetadata>> | null = null;
    try {
      extended = await extractExtendedMetadata(assetPath);
    } catch {
      // Não fatal
    }

    const detailed = await extractDetailedMetadata(assetPath);

    const fullMetadata = {
      ...detailed,
      sha256,
      duration: meta.duration,
      videoCodec: meta.videoCodec,
      audioCodec: meta.audioCodec,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      // Campos alargados
      bitDepth: extended?.bitDepth ?? null,
      hdrType: extended?.hdrType ?? null,
      colorSpace: extended?.colorSpace ?? null,
      colorTransfer: extended?.colorTransfer ?? null,
      colorPrimaries: extended?.colorPrimaries ?? null,
      isInterlaced: extended?.isInterlaced ?? null,
      frameCount: extended?.frameCount ?? null,
      audioChannels: extended?.audioChannels ?? null,
      channelLayout: extended?.channelLayout ?? null,
      formatName: extended?.formatName ?? null,
      chapterCount: extended?.chapterCount ?? 0,
      tags: extended?.tags ?? {},
    };

    // Thumbnail do ficheiro original (não fatal)
    const thumbnailPath = await generateThumbnail(assetPath, assetId, 'orig', meta.duration);

    emit({
      type: 'asset:updated',
      assetId,
      data: {
        duration_secs: meta.duration,
        video_codec: meta.videoCodec,
        audio_codec: meta.audioCodec,
        width: meta.width,
        height: meta.height,
        fps: meta.fps,
        metadata: JSON.stringify(fullMetadata),
        status: 'ingested',
        thumbnail_path: thumbnailPath ?? undefined,
      },
    });

    emit({
      type: 'log',
      level: 'INFO',
      source: 'ingest-worker',
      message: `Ingest completed — ${meta.videoCodec ?? '?'} ${meta.width}x${meta.height} @ ${meta.fps}fps, ${meta.duration?.toFixed(1)}s`,
    });
  }
}

// ── SHA-256 ────────────────────────────────────────────────────────────────────

async function computeSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
