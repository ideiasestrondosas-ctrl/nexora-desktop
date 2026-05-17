import { execFile } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getFfprobePath } from '../binaries';
import { emit } from '../events';

const execFileAsync = promisify(execFile);

// ── Tipos básicos (compatibilidade upstream) ───────────────────────────────────

interface StreamMetadata {
  duration: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
}

// ── Tipos detalhados (MediaInfo-style) ────────────────────────────────────────

interface FfprobeStream {
  index: number;
  codec_name?: string;
  codec_long_name?: string;
  codec_type?: string;
  profile?: string;
  level?: number;
  // Vídeo
  width?: number;
  height?: number;
  coded_width?: number;
  coded_height?: number;
  display_aspect_ratio?: string;
  pix_fmt?: string;
  color_space?: string;
  color_transfer?: string;
  color_primaries?: string;
  color_range?: string;
  chroma_location?: string;
  field_order?: string;
  bits_per_raw_sample?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  nb_frames?: string;
  has_b_frames?: number;
  refs?: number;
  bit_rate?: string;
  // Áudio
  sample_fmt?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;
  // Tags
  tags?: Record<string, string>;
  // HDR
  side_data_list?: Array<Record<string, unknown>>;
}

interface FfprobeFormat {
  filename?: string;
  nb_streams?: number;
  nb_programs?: number;
  format_name?: string;
  format_long_name?: string;
  start_time?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
  probe_score?: number;
  tags?: Record<string, string>;
}

interface FfprobeResult {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

// ── Worker ─────────────────────────────────────────────────────────────────────

export class IngestWorker {
  async run(ctx: JobContext): Promise<void> {
    const { assetId, assetPath } = ctx;

    // Calcular SHA-256 via stream (sem carregar em memória)
    const sha256 = await computeSHA256(assetPath);

    // Extrair metadata básica (compatibilidade com pipeline downstream)
    const meta = await extractBasicMetadata(assetPath);

    // Extrair metadata detalhada (MediaInfo-style) para guardar no campo metadata
    const detailed = await extractDetailedMetadata(assetPath);

    // Actualizar ctx para que os workers seguintes vejam os valores reais
    ctx.assetDurationSecs = meta.duration;
    ctx.assetVideoCodec = meta.videoCodec;
    ctx.assetAudioCodec = meta.audioCodec;
    ctx.assetWidth = meta.width;
    ctx.assetHeight = meta.height;
    ctx.assetFps = meta.fps;

    // Payload completo para a DB: streams + format + sha256
    const fullMetadata = {
      ...detailed,
      sha256,
      // Compatibilidade com leitores antigos que esperavam estes campos no topo
      duration: meta.duration,
      videoCodec: meta.videoCodec,
      audioCodec: meta.audioCodec,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
    };

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
      },
    });

    emit({ type: 'log', level: 'INFO', source: 'ingest-worker', message: `Ingest completed — ${meta.videoCodec ?? '?'} ${meta.width}x${meta.height} @ ${meta.fps}fps, ${meta.duration?.toFixed(1)}s` });
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

// ── Metadata básica (compatibilidade pipeline) ────────────────────────────────

async function extractBasicMetadata(filePath: string): Promise<StreamMetadata> {
  const ffprobePath = getFfprobePath();
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath],
      { timeout: 30_000 },
    );

    const data = JSON.parse(stdout) as FfprobeResult;
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

// ── Metadata detalhada (MediaInfo-style) ──────────────────────────────────────

async function extractDetailedMetadata(filePath: string): Promise<FfprobeResult> {
  const ffprobePath = getFfprobePath();
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        '-show_chapters',
        '-show_programs',
        // Activar extracção de side_data (HDR metadata)
        '-select_streams', 'v:0',
        filePath,
      ],
      { timeout: 60_000 },
    );

    // Segunda passagem sem -select_streams para todos os streams
    const { stdout: stdout2 } = await execFileAsync(
      ffprobePath,
      [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        filePath,
      ],
      { timeout: 60_000 },
    );

    // Merge: usar primeira passagem para video (tem side_data) + segunda para tudo
    const full = JSON.parse(stdout2) as FfprobeResult;
    const withSideData = JSON.parse(stdout) as FfprobeResult;

    // Copiar side_data_list do vídeo da primeira passagem para o resultado completo
    if (withSideData.streams?.[0]?.side_data_list && full.streams) {
      const videoIdx = full.streams.findIndex((s) => s.codec_type === 'video');
      if (videoIdx >= 0) {
        full.streams[videoIdx].side_data_list = withSideData.streams[0].side_data_list;
      }
    }

    return full;
  } catch (err) {
    // Fallback: retornar estrutura vazia (não fatal)
    console.warn('extractDetailedMetadata failed (non-fatal):', err);
    return {};
  }
}
