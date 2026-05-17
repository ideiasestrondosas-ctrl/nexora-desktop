import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { getFfmpegPath, getFfprobePath } from '../binaries';

const execFileAsync = promisify(execFile);

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface StreamMetadata {
  duration: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
}

export interface ExtendedStreamMetadata extends StreamMetadata {
  bitDepth: number | null;
  hdrType: 'SDR' | 'HDR10' | 'HLG' | 'DV' | null;
  colorSpace: string | null;
  colorTransfer: string | null;
  colorPrimaries: string | null;
  isInterlaced: boolean | null;
  frameCount: number | null;
  audioChannels: number | null;
  channelLayout: string | null;
  audioBitDepth: number | null;
  formatName: string | null;
  chapterCount: number;
  tags: Record<string, string>;
}

export interface FfprobeStream {
  index: number;
  codec_name?: string;
  codec_long_name?: string;
  codec_type?: string;
  profile?: string;
  level?: number;
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
  sample_fmt?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;
  tags?: Record<string, string>;
  side_data_list?: Array<Record<string, unknown>>;
}

export interface FfprobeFormat {
  filename?: string;
  nb_streams?: number;
  format_name?: string;
  format_long_name?: string;
  start_time?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
  probe_score?: number;
  tags?: Record<string, string>;
}

export interface FfprobeResult {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
  chapters?: unknown[];
}

interface FfprobeFrame {
  media_type?: string;
  interlaced_frame?: number;
  top_field_first?: number;
}

// ── Metadata básica ────────────────────────────────────────────────────────────

export async function extractBasicMetadata(filePath: string): Promise<StreamMetadata> {
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
    return {
      duration: null,
      videoCodec: null,
      audioCodec: null,
      width: null,
      height: null,
      fps: null,
    };
  }
}

// ── Metadata detalhada ─────────────────────────────────────────────────────────

export async function extractDetailedMetadata(filePath: string): Promise<FfprobeResult> {
  const ffprobePath = getFfprobePath();
  try {
    // Passagem 1: vídeo com side_data
    const { stdout: stdout1 } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_streams',
        '-show_format',
        '-show_chapters',
        '-select_streams',
        'v:0',
        filePath,
      ],
      { timeout: 60_000 },
    );
    // Passagem 2: todos os streams
    const { stdout: stdout2 } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_streams',
        '-show_format',
        '-show_chapters',
        filePath,
      ],
      { timeout: 60_000 },
    );

    const full = JSON.parse(stdout2) as FfprobeResult;
    const withSideData = JSON.parse(stdout1) as FfprobeResult;

    if (withSideData.streams?.[0]?.side_data_list && full.streams) {
      const videoIdx = full.streams.findIndex((s) => s.codec_type === 'video');
      if (videoIdx >= 0) {
        full.streams[videoIdx].side_data_list = withSideData.streams[0].side_data_list;
      }
    }

    return full;
  } catch (err) {
    console.warn('extractDetailedMetadata failed (non-fatal):', err);
    return {};
  }
}

// ── Metadata alargada (HDR, interlace, bit depth) ─────────────────────────────

export async function extractExtendedMetadata(filePath: string): Promise<ExtendedStreamMetadata> {
  const ffprobePath = getFfprobePath();
  const basic = await extractBasicMetadata(filePath);
  const detailed = await extractDetailedMetadata(filePath);

  const video = detailed.streams?.find((s) => s.codec_type === 'video');
  const audio = detailed.streams?.find((s) => s.codec_type === 'audio');

  // Bit depth: bits_per_raw_sample ou inferido de pix_fmt
  let bitDepth: number | null = null;
  if (video?.bits_per_raw_sample) {
    const v = parseInt(video.bits_per_raw_sample, 10);
    if (!isNaN(v) && v > 0) bitDepth = v;
  }
  if (!bitDepth && video?.pix_fmt) {
    if (video.pix_fmt.includes('10le') || video.pix_fmt.includes('10be')) bitDepth = 10;
    else if (video.pix_fmt.includes('12le') || video.pix_fmt.includes('12be')) bitDepth = 12;
    else if (video.pix_fmt.includes('yuv420p') || video.pix_fmt.includes('yuvj')) bitDepth = 8;
  }

  // HDR
  let hdrType: ExtendedStreamMetadata['hdrType'] = 'SDR';
  const ct = video?.color_transfer;
  if (
    video?.side_data_list?.some((sd) => JSON.stringify(sd).toLowerCase().includes('dolby vision'))
  ) {
    hdrType = 'DV';
  } else if (ct === 'smpte2084' || ct === 'smpte-2084') {
    hdrType = 'HDR10';
  } else if (ct === 'arib-std-b67') {
    hdrType = 'HLG';
  }

  // Frame count
  let frameCount: number | null = null;
  if (video?.nb_frames) {
    const v = parseInt(video.nb_frames, 10);
    if (!isNaN(v) && v > 0) frameCount = v;
  }

  // Interlace — via frame-level analysis dos primeiros 100 frames (não fatal)
  let isInterlaced: boolean | null = null;
  try {
    const { stdout: framesOut } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_frames',
        '-read_intervals',
        '%+#100',
        '-select_streams',
        'v:0',
        filePath,
      ],
      { timeout: 45_000 },
    );
    const framesData = JSON.parse(framesOut) as { frames?: FfprobeFrame[] };
    if (framesData.frames && framesData.frames.length > 0) {
      const videoFrames = framesData.frames.filter((f) => f.media_type === 'video');
      const interlacedCount = videoFrames.filter((f) => f.interlaced_frame === 1).length;
      isInterlaced = interlacedCount > videoFrames.length * 0.5;
    }
  } catch {
    // Não fatal — ficheiro pequeno pode não ter 100 frames
  }

  return {
    ...basic,
    bitDepth,
    hdrType,
    colorSpace: video?.color_space ?? null,
    colorTransfer: video?.color_transfer ?? null,
    colorPrimaries: video?.color_primaries ?? null,
    isInterlaced,
    frameCount,
    audioChannels: audio?.channels ?? null,
    channelLayout: audio?.channel_layout ?? null,
    audioBitDepth: audio?.bits_per_sample ?? null,
    formatName: detailed.format?.format_name ?? null,
    chapterCount: Array.isArray(detailed.chapters) ? detailed.chapters.length : 0,
    tags: (detailed.format?.tags ?? {}) as Record<string, string>,
  };
}

// ── Thumbnail ──────────────────────────────────────────────────────────────────

const THUMB_TMPDIR = join(tmpdir(), 'nexora-thumbs');

export async function generateThumbnail(
  videoPath: string,
  assetId: string,
  suffix: 'orig' | 'out',
  durationSecs: number | null,
): Promise<string | null> {
  const ffmpegPath = getFfmpegPath();
  try {
    await mkdir(THUMB_TMPDIR, { recursive: true });
    const thumbPath = join(THUMB_TMPDIR, `${assetId}-${suffix}.jpg`);
    const duration = durationSecs ?? 10;
    const offset = Math.max(1, Math.min(duration * 0.1, duration / 2));

    await execFileAsync(
      ffmpegPath,
      [
        '-ss',
        String(offset),
        '-i',
        videoPath,
        '-vframes',
        '1',
        '-vf',
        'scale=320:-1',
        '-q:v',
        '3',
        '-y',
        thumbPath,
      ],
      { timeout: 30_000 },
    );
    return thumbPath;
  } catch (err) {
    console.warn(`generateThumbnail(${suffix}) failed (non-fatal):`, err);
    return null;
  }
}
