/**
 * MediaInfoPanel — painel de informação detalhada ao estilo MediaInfo (open-source).
 *
 * Renderiza os metadados detalhados extraídos pelo ffprobe em secções colapsáveis:
 * General, Video, Audio, Subtitles, Tags, HDR.
 *
 * Os dados vêm do campo `metadata` da tabela assets (JSON serializado pelo ingest-worker).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Info, Monitor, Volume2, Tag, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MediaInfoStream {
  // Identificação
  index?: number;
  codec_name?: string;
  codec_long_name?: string;
  codec_type?: 'video' | 'audio' | 'subtitle' | 'data';
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
  bits_per_raw_sample?: number | string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  nb_frames?: number | string;
  has_b_frames?: number;
  refs?: number;
  bit_rate?: number | string;

  // Áudio
  sample_fmt?: string;
  sample_rate?: number | string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;

  // Tags e metadados
  tags?: Record<string, string>;

  // HDR side data
  side_data_list?: Array<{
    side_data_type?: string;
    red_x?: string;
    red_y?: string;
    green_x?: string;
    green_y?: string;
    blue_x?: string;
    blue_y?: string;
    white_point_x?: string;
    white_point_y?: string;
    min_luminance?: string;
    max_luminance?: string;
    max_content?: number;
    max_average?: number;
  }>;
}

export interface MediaInfoFormat {
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

export interface DetailedMediaInfo {
  streams?: MediaInfoStream[];
  format?: MediaInfoFormat;
  // Compatibilidade com metadados básicos existentes
  duration?: number;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  fps?: number;
  sha256?: string;
}

type MediaInfoTab = 'general' | 'video' | 'audio' | 'tags' | 'sha256';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | string | undefined): string {
  if (!bytes) return '—';
  const n = Number(bytes);
  if (isNaN(n) || n === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDuration(secs: number | string | undefined): string {
  if (!secs) return '—';
  const s = Number(secs);
  if (isNaN(s)) return String(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(3);
  return [h.toString().padStart(2, '0'), m.toString().padStart(2, '0'), sec.padStart(6, '0')].join(
    ':',
  );
}

function formatFrameRate(fr: string | undefined): string {
  if (!fr) return '—';
  if (fr.includes('/')) {
    const [n, d] = fr.split('/').map(Number);
    if (d && d > 0) {
      const fps = n / d;
      // Arredondar a 3 casas apenas se necessário
      return `${parseFloat(fps.toFixed(3))} fps`;
    }
  }
  return `${fr} fps`;
}

function formatBitrate(bps: number | string | undefined): string {
  if (!bps) return '—';
  const n = Number(bps);
  if (isNaN(n) || n === 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} Mbps`;
  return `${(n / 1000).toFixed(0)} kbps`;
}

function formatScanType(fieldOrder: string | undefined): string {
  if (!fieldOrder) return '—';
  if (fieldOrder === 'progressive') return 'Progressive';
  if (fieldOrder.includes('tt') || fieldOrder.includes('bb')) return `Interlaced (${fieldOrder})`;
  return fieldOrder;
}

function formatChannels(channels: number | undefined, layout: string | undefined): string {
  if (!channels) return '—';
  const layoutStr = layout ? ` (${layout})` : '';
  return `${channels} ch${layoutStr}`;
}

function formatColorSpace(
  space: string | undefined,
  transfer: string | undefined,
  primaries: string | undefined,
): string {
  const parts = [space, transfer, primaries].filter(Boolean);
  if (parts.length === 0) return '—';
  return parts.join(' / ');
}

function parseFraction(f: string | undefined): string {
  if (!f) return '—';
  if (f.includes('/')) {
    const [n, d] = f.split('/').map(Number);
    if (d && d > 0) return (n / d).toFixed(4);
  }
  return f;
}

// ── Row component ─────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  value: string | number | undefined;
  mono?: boolean;
  highlight?: boolean;
  tooltip?: string;
}

function Row({ label, value, mono = false, highlight = false, tooltip }: RowProps) {
  if (value === undefined || value === null || value === '' || value === '—') return null;
  const displayVal = String(value);
  if (displayVal === '—' || displayVal === '') return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-hover/50 transition-colors group">
      <span className="text-xs text-text-muted flex items-center gap-1.5" title={tooltip}>
        {label}
        {tooltip && (
          <Info size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
      <span
        className={cn(
          'text-xs font-bold text-right max-w-[60%] truncate',
          mono ? 'font-mono text-text-secondary' : 'text-text-primary',
          highlight && 'text-brand',
        )}
      >
        {displayVal}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface MediaInfoPanelProps {
  /** Dados do campo metadata (pode ser o JSON completo do ffprobe ou básico) */
  metadata: DetailedMediaInfo | Record<string, unknown> | null | undefined;
  /** Modo compacto — menos secções, texto menor */
  compact?: boolean;
  className?: string;
}

export function MediaInfoPanel({
  metadata,
  compact: _compact = false,
  className,
}: MediaInfoPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<MediaInfoTab>('general');

  if (!metadata) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center py-12 text-text-muted', className)}
      >
        <ScanLine size={32} className="mb-3 opacity-30" />
        <p className="text-sm font-bold">{t('mediaInfo.noData')}</p>
        <p className="text-xs mt-1">{t('mediaInfo.noDataHint')}</p>
      </div>
    );
  }

  // Tentar interpretar como DetailedMediaInfo (formato novo do ffprobe completo)
  const info = metadata as DetailedMediaInfo;
  const format = info.format;
  const streams = info.streams ?? [];
  const videoStreams = streams.filter((s) => s.codec_type === 'video');
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');
  const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle');

  // Fallback para metadados básicos (formato antigo)
  const hasDetailedData = streams.length > 0 || !!format;
  const basicDuration = info.duration ?? (format?.duration ? Number(format.duration) : undefined);
  const basicVideoCodec = info.videoCodec ?? videoStreams[0]?.codec_name;
  const basicAudioCodec = info.audioCodec ?? audioStreams[0]?.codec_name;
  const basicWidth = info.width ?? videoStreams[0]?.width;
  const basicHeight = info.height ?? videoStreams[0]?.height;
  const basicFps = info.fps;

  // Gerar texto MediaInfo-style para cópia
  const generateTextReport = (): string => {
    const lines: string[] = ['GENERAL', '========'];
    if (format) {
      lines.push(`Format: ${format.format_long_name ?? format.format_name ?? '—'}`);
      lines.push(`File Size: ${formatBytes(format.size)}`);
      lines.push(`Duration: ${formatDuration(format.duration)}`);
      lines.push(`Overall Bitrate: ${formatBitrate(format.bit_rate)}`);
      lines.push(`Streams: ${format.nb_streams ?? '—'}`);
    }
    videoStreams.forEach((v, i) => {
      lines.push('', `VIDEO #${i}`, '========');
      lines.push(`Codec: ${v.codec_long_name ?? v.codec_name ?? '—'}`);
      if (v.profile || v.level) lines.push(`Profile: ${v.profile ?? ''}@L${v.level ?? ''}`);
      lines.push(`Resolution: ${v.width}x${v.height}`);
      lines.push(`Frame Rate: ${formatFrameRate(v.r_frame_rate)}`);
      lines.push(`Bitrate: ${formatBitrate(v.bit_rate)}`);
      lines.push(`Pixel Format: ${v.pix_fmt ?? '—'}`);
      lines.push(`Bit Depth: ${v.bits_per_raw_sample ? `${v.bits_per_raw_sample} bits` : '—'}`);
      lines.push(
        `Color Space: ${formatColorSpace(v.color_space, v.color_transfer, v.color_primaries)}`,
      );
      lines.push(`Scan Type: ${formatScanType(v.field_order)}`);
    });
    audioStreams.forEach((a, i) => {
      lines.push('', `AUDIO #${i}`, '========');
      lines.push(`Codec: ${a.codec_long_name ?? a.codec_name ?? '—'}`);
      lines.push(
        `Sample Rate: ${a.sample_rate ? `${Number(a.sample_rate).toLocaleString()} Hz` : '—'}`,
      );
      lines.push(`Channels: ${formatChannels(a.channels, a.channel_layout)}`);
      lines.push(`Bitrate: ${formatBitrate(a.bit_rate)}`);
      if (a.tags?.language) lines.push(`Language: ${a.tags.language}`);
    });
    // Tags do container
    if (format?.tags && Object.keys(format.tags).length > 0) {
      lines.push('', 'TAGS', '========');
      for (const [k, v] of Object.entries(format.tags)) {
        lines.push(`${k}: ${v}`);
      }
    }
    // SHA-256
    if (info.sha256) {
      lines.push('', 'SHA-256', '========');
      lines.push(info.sha256);
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTextReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">
          {t('mediaInfo.title')}
        </h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted hover:text-brand transition-colors uppercase tracking-widest"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          {copied ? t('mediaInfo.copied') : t('mediaInfo.copyAll')}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-1 overflow-x-auto">
        {(
          [
            {
              id: 'general' as MediaInfoTab,
              labelKey: 'mediaInfo.tabGeneral',
              icon: <Info size={11} />,
              disabled: !hasDetailedData && !basicDuration,
            },
            {
              id: 'video' as MediaInfoTab,
              labelKey: 'mediaInfo.tabVideo',
              icon: <Monitor size={11} />,
              disabled: videoStreams.length === 0 && !basicVideoCodec,
            },
            {
              id: 'audio' as MediaInfoTab,
              labelKey: 'mediaInfo.tabAudio',
              icon: <Volume2 size={11} />,
              disabled:
                audioStreams.length === 0 && subtitleStreams.length === 0 && !basicAudioCodec,
            },
            {
              id: 'tags' as MediaInfoTab,
              labelKey: 'mediaInfo.tabTags',
              icon: <Tag size={11} />,
              disabled: !format?.tags || Object.keys(format.tags).length === 0,
            },
            {
              id: 'sha256' as MediaInfoTab,
              labelKey: 'mediaInfo.tabSha256',
              icon: <ScanLine size={11} />,
              disabled: !info.sha256,
            },
          ] satisfies {
            id: MediaInfoTab;
            labelKey: string;
            icon: React.ReactNode;
            disabled: boolean;
          }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'bg-brand text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover',
              tab.disabled &&
                'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-text-muted',
            )}
          >
            {tab.icon}
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-3">
        {/* ── GENERAL ── */}
        {activeTab === 'general' && (hasDetailedData || basicDuration) && (
          <div className="border border-border rounded-xl overflow-hidden">
            {format ? (
              <div className="divide-y divide-border">
                <Row
                  label={t('mediaInfo.format')}
                  value={format.format_long_name ?? format.format_name}
                />
                <Row label={t('mediaInfo.fileSize')} value={formatBytes(format.size)} />
                <Row label={t('mediaInfo.duration')} value={formatDuration(format.duration)} mono />
                <Row label={t('mediaInfo.overallBitrate')} value={formatBitrate(format.bit_rate)} />
                <Row label={t('mediaInfo.streams')} value={format.nb_streams} />
                {format.tags?.encoder && (
                  <Row label={t('mediaInfo.encoder')} value={format.tags.encoder} mono />
                )}
                {format.tags?.creation_time && (
                  <Row label={t('mediaInfo.creationTime')} value={format.tags.creation_time} mono />
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                <Row
                  label={t('assetDetail.duration')}
                  value={basicDuration ? formatDuration(basicDuration) : undefined}
                  mono
                />
                <Row label={t('assetDetail.video')} value={basicVideoCodec?.toUpperCase()} />
                <Row label={t('assetDetail.audio')} value={basicAudioCodec?.toUpperCase()} />
                {basicWidth && basicHeight && (
                  <Row label={t('mediaInfo.resolution')} value={`${basicWidth}×${basicHeight}`} />
                )}
                {basicFps && <Row label={t('mediaInfo.frameRate')} value={`${basicFps} fps`} />}
              </div>
            )}
          </div>
        )}

        {/* ── VIDEO ── */}
        {activeTab === 'video' && (
          <div className="space-y-3">
            {videoStreams.length > 0 ? (
              videoStreams.map((v, i) => {
                const hdr = v.side_data_list?.find((sd) =>
                  sd.side_data_type?.toLowerCase().includes('mastering'),
                );
                const cll = v.side_data_list?.find((sd) =>
                  sd.side_data_type?.toLowerCase().includes('content_light'),
                );
                return (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-brand/5 border-b border-border">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                        {t('mediaInfo.tabVideo')} #{i}
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      <Row label={t('mediaInfo.codec')} value={v.codec_long_name ?? v.codec_name} />
                      {(v.profile || v.level != null) && (
                        <Row
                          label={t('profiles.h264Profile')}
                          value={[v.profile, v.level != null ? `L${v.level}` : '']
                            .filter(Boolean)
                            .join(' @ ')}
                        />
                      )}
                      <Row
                        label={t('mediaInfo.bitRate')}
                        value={formatBitrate(v.bit_rate)}
                        highlight
                      />
                      <Row
                        label={t('mediaInfo.resolution')}
                        value={v.width && v.height ? `${v.width}×${v.height}` : undefined}
                      />
                      {v.display_aspect_ratio && (
                        <Row label={t('mediaInfo.aspectRatio')} value={v.display_aspect_ratio} />
                      )}
                      <Row
                        label={t('mediaInfo.frameRate')}
                        value={formatFrameRate(v.r_frame_rate)}
                      />
                      {v.avg_frame_rate && v.avg_frame_rate !== v.r_frame_rate && (
                        <Row
                          label={t('mediaInfo.avgFrameRate')}
                          value={formatFrameRate(v.avg_frame_rate)}
                        />
                      )}
                      <Row label={t('mediaInfo.pixelFormat')} value={v.pix_fmt} mono />
                      <Row
                        label={t('mediaInfo.bitDepth')}
                        value={v.bits_per_raw_sample ? `${v.bits_per_raw_sample} bits` : undefined}
                      />
                      <Row
                        label={t('mediaInfo.colorSpace')}
                        value={formatColorSpace(v.color_space, v.color_transfer, v.color_primaries)}
                        mono
                      />
                      {v.color_range && (
                        <Row label={t('mediaInfo.colorRange')} value={v.color_range} mono />
                      )}
                      {v.chroma_location && (
                        <Row label={t('mediaInfo.chromaLocation')} value={v.chroma_location} mono />
                      )}
                      <Row label={t('mediaInfo.scanType')} value={formatScanType(v.field_order)} />
                      {v.has_b_frames != null && (
                        <Row
                          label={t('mediaInfo.bFrames')}
                          value={v.has_b_frames > 0 ? `Yes (${v.has_b_frames})` : 'No'}
                        />
                      )}
                      {v.refs != null && (
                        <Row label={t('mediaInfo.refFrames')} value={String(v.refs)} />
                      )}
                      {v.nb_frames && (
                        <Row label={t('mediaInfo.totalFrames')} value={String(v.nb_frames)} />
                      )}
                      {v.tags?.language && (
                        <Row label={t('mediaInfo.language')} value={v.tags.language} />
                      )}
                      {v.tags?.title && <Row label={t('mediaInfo.title')} value={v.tags.title} />}
                      {(hdr || cll) && (
                        <div className="px-4 py-2.5 bg-orange-500/5 border-t border-orange-500/20">
                          <div className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1.5">
                            {t('mediaInfo.hdr')}
                          </div>
                          {hdr && (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-text-muted">
                                  {t('mediaInfo.masteringDisplay')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 text-[10px] text-text-muted mt-1">
                                <span>
                                  R: {parseFraction(hdr.red_x)}, {parseFraction(hdr.red_y)}
                                </span>
                                <span>
                                  G: {parseFraction(hdr.green_x)}, {parseFraction(hdr.green_y)}
                                </span>
                                <span>
                                  B: {parseFraction(hdr.blue_x)}, {parseFraction(hdr.blue_y)}
                                </span>
                                <span>
                                  W: {parseFraction(hdr.white_point_x)},{' '}
                                  {parseFraction(hdr.white_point_y)}
                                </span>
                              </div>
                              <div className="flex gap-4 mt-1 text-[10px] text-text-muted">
                                <span>Min lum: {parseFraction(hdr.min_luminance)}</span>
                                <span>Max lum: {parseFraction(hdr.max_luminance)}</span>
                              </div>
                            </>
                          )}
                          {cll && (
                            <div className="flex gap-4 mt-1 text-[10px] text-text-muted">
                              <span>MaxCLL: {cll.max_content} cd/m²</span>
                              <span>MaxFALL: {cll.max_average} cd/m²</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="border border-border rounded-xl divide-y divide-border">
                {basicVideoCodec && (
                  <Row label={t('mediaInfo.codec')} value={basicVideoCodec.toUpperCase()} />
                )}
                {basicWidth && basicHeight && (
                  <Row label={t('mediaInfo.resolution')} value={`${basicWidth}×${basicHeight}`} />
                )}
                {basicFps && <Row label={t('mediaInfo.frameRate')} value={`${basicFps} fps`} />}
              </div>
            )}
          </div>
        )}

        {/* ── AUDIO ── */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            {audioStreams.length > 0 ? (
              audioStreams.map((a, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-green-500/5 border-b border-border">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                      {t('mediaInfo.tabAudio')} #{i}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    <Row label={t('mediaInfo.codec')} value={a.codec_long_name ?? a.codec_name} />
                    <Row
                      label={t('mediaInfo.bitRate')}
                      value={formatBitrate(a.bit_rate)}
                      highlight
                    />
                    <Row
                      label={t('mediaInfo.sampleRate')}
                      value={
                        a.sample_rate ? `${Number(a.sample_rate).toLocaleString()} Hz` : undefined
                      }
                    />
                    <Row
                      label={t('mediaInfo.channels')}
                      value={formatChannels(a.channels, a.channel_layout)}
                    />
                    <Row label={t('mediaInfo.sampleFormat')} value={a.sample_fmt} mono />
                    {a.bits_per_sample != null && a.bits_per_sample > 0 && (
                      <Row label={t('mediaInfo.bitDepth')} value={`${a.bits_per_sample} bits`} />
                    )}
                    {a.tags?.language && (
                      <Row label={t('mediaInfo.language')} value={a.tags.language} />
                    )}
                    {a.tags?.title && <Row label={t('mediaInfo.title')} value={a.tags.title} />}
                  </div>
                </div>
              ))
            ) : basicAudioCodec ? (
              <div className="border border-border rounded-xl divide-y divide-border">
                <Row label={t('mediaInfo.codec')} value={basicAudioCodec.toUpperCase()} />
              </div>
            ) : null}
            {subtitleStreams.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-yellow-500/5 border-b border-border">
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">
                    {t('mediaInfo.subtitles')}
                  </span>
                </div>
                {subtitleStreams.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0"
                  >
                    <span className="text-xs text-text-muted">#{i}</span>
                    <span className="text-xs font-bold text-text-primary">
                      {s.codec_name?.toUpperCase() ?? '—'}{' '}
                      {s.tags?.language ? `— ${s.tags.language}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAGS ── */}
        {activeTab === 'tags' && format?.tags && Object.keys(format.tags).length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {Object.entries(format.tags).map(([key, val]) => (
                <Row key={key} label={key} value={val} mono />
              ))}
            </div>
          </div>
        )}

        {/* ── SHA-256 ── */}
        {activeTab === 'sha256' && info.sha256 && (
          <div className="px-4 py-3 bg-bg-primary border border-border rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0 mt-0.5">
                SHA-256
              </span>
              <span className="text-[10px] font-mono text-text-secondary break-all text-right">
                {info.sha256}
              </span>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!hasDetailedData && !basicDuration && (
          <div className={cn('flex flex-col items-center justify-center py-8 text-text-muted')}>
            <ScanLine size={24} className="mb-2 opacity-30" />
            <p className="text-xs">{t('mediaInfo.basicOnly')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
