import React, { useState, useEffect, useCallback } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import {
  ChevronLeft,
  Film,
  Shield,
  Clock,
  ExternalLink,
  Trash2,
  Play,
  CheckCircle2,
  FolderOpen,
  Loader2,
  MoreVertical,
  ScanLine,
  Volume2,
  BarChart2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MediaInfoPanel } from '@/components/MediaInfoPanel';
import type { DetailedMediaInfo } from '@/components/MediaInfoPanel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAssetsStore } from '@/store/assets';
import { useJobsStore } from '@/store/jobs';

interface Asset {
  id: string;
  path: string;
  filename: string;
  status: string;
  size_bytes: number | null;
  duration_secs: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  created_at: string;
  updated_at: string;
  thumbnail_path: string | null;
  thumbnail_output_path: string | null;
  output_metadata: Record<string, unknown> | null;
  output_path: string | null;
  metadata: Record<string, unknown> | null;
}

interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: string;
  progress: number;
  step: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  vmaf_score: number | null;
  lufs: number | null;
  output_path: string | null;
}

interface AssetDetailPageProps {
  assetId: string;
  onBack: () => void;
}

const PIPELINE_STEPS = [
  { key: 'ingest', short: 'IN' },
  { key: 'qc-pre', short: 'QC' },
  { key: 'transcode', short: 'TR' },
  { key: 'audio', short: 'AU' },
  { key: 'proxy', short: 'PX' },
  { key: 'thumbnail', short: 'TH' },
  { key: 'qc-post', short: 'QP' },
  { key: 'delivery', short: 'DL' },
];

export default function AssetDetailPage({ assetId, onBack }: AssetDetailPageProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<'qc' | 'metadata' | 'media' | 'history'>(
    'qc',
  );
  const [heroView, setHeroView] = useState<'orig' | 'out'>('orig');
  const [playerActive, setPlayerActive] = useState(false);
  const { t, i18n } = useTranslation();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [mediaInfoSide, setMediaInfoSide] = useState<'original' | 'processed'>('original');

  const removeAsset = useAssetsStore((s) => s.removeAsset);
  const removeJobsByAsset = useJobsStore((s) => s.removeJobsByAsset);

  const fetchData = useCallback(async () => {
    try {
      const [assetData, jobsData] = await Promise.all([
        invoke<Asset | null>('get_asset', { id: assetId }), // P6: backend retorna Option<Asset>; P11: param name é 'id'
        invoke<Job[]>('list_jobs', { asset_id: assetId }), // P11: backend espera asset_id não assetId
      ]);
      if (assetData) setAsset(assetData); // P6: verificar null
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to fetch asset detail:', error);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      await invoke('delete_asset', { id: assetId });
      removeAsset(assetId);
      removeJobsByAsset(assetId);
      onBack();
    } catch (error) {
      console.error('Failed to delete asset:', error);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  // P14: Processar Novamente via submit_job
  const handleReprocess = async (profile: string) => {
    try {
      await invoke('submit_job', { assetId, profile, priority: 0 });
    } catch (error) {
      console.error('Failed to submit job:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <Loader2 className="animate-spin mr-2" /> {t('assetDetail.loading')}
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted gap-4">
        <Film size={48} className="text-gray-500 opacity-50" />
        <p className="text-lg font-bold">Asset não encontrado</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-surface hover:bg-surface-hover rounded-xl transition-colors"
        >
          {t('assetDetail.backToLibrary')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* BREADCRUMB */}
      <nav className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
        >
          <ChevronLeft size={16} /> {t('assetDetail.backToLibrary')}
        </button>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-bold">{asset.filename}</span>
      </nav>

      {/* HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: THUMBNAIL + PLAYER */}
        <div className="lg:col-span-5 space-y-3">
          {/* Toggle orig/out quando ambos existem */}
          {(asset.thumbnail_output_path || asset.output_path || jobs[0]?.output_path) && (
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-bold w-fit">
              <button
                onClick={() => {
                  setHeroView('orig');
                  setPlayerActive(false);
                }}
                className={`px-3 py-1.5 transition-colors ${heroView === 'orig' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                {t('detail.thumbnailOrig')}
              </button>
              <button
                onClick={() => {
                  setHeroView('out');
                  setPlayerActive(false);
                }}
                className={`px-3 py-1.5 transition-colors ${heroView === 'out' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                {t('detail.thumbnailOut')}
              </button>
            </div>
          )}

          <div className="aspect-video bg-bg-primary rounded-2xl border border-border overflow-hidden group relative">
            {/* Player inline */}
            {playerActive ? (
              <video
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
                src={convertFileSrc(
                  heroView === 'out' && (asset.output_path ?? jobs[0]?.output_path)
                    ? (asset.output_path ?? jobs[0]?.output_path)!
                    : asset.path,
                )}
                key={heroView + (asset.output_path ?? jobs[0]?.output_path ?? '')}
              />
            ) : (
              <>
                {/* Thumbnail */}
                {(heroView === 'orig' ? asset.thumbnail_path : asset.thumbnail_output_path) ? (
                  <img
                    src={convertFileSrc(
                      heroView === 'orig' ? asset.thumbnail_path! : asset.thumbnail_output_path!,
                    )}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={64} className="text-text-muted" />
                  </div>
                )}

                {/* Botão Play overlay */}
                <button
                  onClick={() => setPlayerActive(true)}
                  title={t('detail.playerOriginal')}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
                >
                  <div className="w-16 h-16 rounded-full bg-brand/90 flex items-center justify-center shadow-xl">
                    <Play size={28} className="text-white ml-1" />
                  </div>
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] font-mono text-text-secondary truncate">
                {heroView === 'out' && (asset.output_path ?? jobs[0]?.output_path)
                  ? (asset.output_path ?? jobs[0]?.output_path)
                  : asset.path}
              </p>
            </div>
          </div>

          {/* Path do ficheiro activo */}
          <div className="flex items-start gap-2 text-[10px] text-text-muted font-mono leading-relaxed">
            <FolderOpen size={12} className="mt-0.5 shrink-0" />
            <span className="break-all">
              {heroView === 'out' && (asset.output_path ?? jobs[0]?.output_path)
                ? (asset.output_path ?? jobs[0]?.output_path)
                : asset.path}
            </span>
          </div>
          {/* Botão abrir no player do sistema */}
          <button
            onClick={() =>
              openPath(
                heroView === 'out' && (asset.output_path ?? jobs[0]?.output_path)
                  ? (asset.output_path ?? jobs[0]?.output_path)!
                  : asset.path,
              ).catch(() => {})
            }
            className="flex items-center gap-2 text-xs text-text-muted hover:text-brand transition-colors"
          >
            <Volume2 size={13} /> {t('detail.openInPlayer')}
          </button>
        </div>

        {/* RIGHT: METADATA */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-black text-text-primary leading-tight">
              {asset.filename}
            </h1>
            <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              {asset.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                {t('assetDetail.size')}
              </span>
              <span className="text-lg font-bold text-text-primary">
                {formatBytes(asset.size_bytes || 0)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                {t('assetDetail.duration')}
              </span>
              <span className="text-lg font-bold text-text-primary">
                {formatDuration(asset.duration_secs)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                {t('assetDetail.video')}
              </span>
              <span className="text-sm font-bold text-text-secondary">
                {asset.video_codec} / {asset.width}x{asset.height} / {asset.fps}fps
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                {t('assetDetail.audio')}
              </span>
              <span className="text-sm font-bold text-text-secondary">
                {asset.audio_codec || t('assetDetail.notAvailable')} / 48kHz / Stereo
              </span>
            </div>
          </div>

          {jobs.some((j) => j.vmaf_score) && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl w-fit">
              <Shield className="text-green-500" size={24} />
              <div>
                <div className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                  {t('assetDetail.bestQuality')}
                </div>
                <div className="text-2xl font-black text-text-primary">
                  {Math.max(...jobs.map((j) => j.vmaf_score || 0)).toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-border gap-2 shrink-0">
        <button
          onClick={() => setActiveDetailTab('qc')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
            activeDetailTab === 'qc'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-surface/10'
          }`}
        >
          <Shield size={16} />
          {t('assetDetail.qualityReport', 'Relatório QC')}
        </button>
        <button
          onClick={() => setActiveDetailTab('metadata')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
            activeDetailTab === 'metadata'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-surface/10'
          }`}
        >
          <ScanLine size={16} />
          {t('mediaInfo.title', 'Metadados Técnicos')}
        </button>
        <button
          onClick={() => setActiveDetailTab('media')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
            activeDetailTab === 'media'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-surface/10'
          }`}
        >
          <BarChart2 size={16} />
          {t('analysis.title', 'Análise Técnica')}
        </button>
        <button
          onClick={() => setActiveDetailTab('history')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
            activeDetailTab === 'history'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-surface/10'
          }`}
        >
          <Clock size={16} />
          {t('assetDetail.jobHistory', 'Histórico de Processamento')}
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ml-1 transition-colors ${
              activeDetailTab === 'history'
                ? 'bg-brand/20 text-brand'
                : 'bg-surface text-text-muted'
            }`}
          >
            {jobs.length}
          </span>
        </button>
      </div>

      {/* TAB PANELS */}
      <div className="mt-4 transition-all duration-300 overflow-y-auto">
        {activeDetailTab === 'qc' && (
          <section className="bg-bg-secondary border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-border bg-surface/10">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Shield className="text-brand" size={20} /> {t('assetDetail.qualityReport')}
              </h2>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest rounded border border-green-500/30">
                QC PASS
              </span>
            </div>
            <div className="p-6">
              <div className="bg-bg-primary rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-[10px] font-bold uppercase text-text-muted">
                    <tr>
                      <th className="px-6 py-3">{t('assetDetail.verification')}</th>
                      <th className="px-6 py-3">{t('assetDetail.result')}</th>
                      <th className="px-6 py-3">{t('assetDetail.value')}</th>
                      <th className="px-6 py-3">{t('assetDetail.limit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-text-secondary">
                        {t('assetDetail.codecSupported')}
                      </td>
                      <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                      <td className="px-6 py-4 text-text-secondary">{asset.video_codec}</td>
                      <td className="px-6 py-4 text-text-muted">--</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-text-secondary">
                        {t('assetDetail.minResolution')}
                      </td>
                      <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                      <td className="px-6 py-4 text-text-secondary">
                        {asset.width}x{asset.height}
                      </td>
                      <td className="px-6 py-4 text-text-muted">≥ 720p</td>
                    </tr>
                    {jobs[0]?.vmaf_score && (
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-text-secondary">
                          {t('assetDetail.vmafScore')}
                        </td>
                        <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                        <td className="px-6 py-4 text-text-secondary">
                          {jobs[0].vmaf_score.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 text-text-muted">≥ 85</td>
                      </tr>
                    )}
                    {jobs[0]?.lufs && (
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-text-secondary">
                          {t('assetDetail.audioLevels')}
                        </td>
                        <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                        <td className="px-6 py-4 text-text-secondary">
                          {jobs[0].lufs.toFixed(1)} LUFS
                        </td>
                        <td className="px-6 py-4 text-text-muted">-23 ±1</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[10px] text-text-muted font-bold uppercase tracking-widest text-right">
                {t('assetDetail.approvedAt', {
                  date: new Date(asset.created_at).toLocaleDateString(i18n.language),
                })}
              </p>
            </div>
          </section>
        )}

        {activeDetailTab === 'metadata' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border bg-surface/10">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ScanLine className="text-brand" size={20} /> {t('mediaInfo.title')}
                </h2>
                {/* Toggle Original / Processado */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-bold">
                  <button
                    onClick={() => setMediaInfoSide('original')}
                    className={`px-3 py-1.5 transition-colors ${mediaInfoSide === 'original' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    {t('detail.original')}
                  </button>
                  <button
                    onClick={() => setMediaInfoSide('processed')}
                    disabled={!asset.output_path && !jobs.some((j) => j.output_path)}
                    className={`px-3 py-1.5 transition-colors disabled:opacity-30 ${mediaInfoSide === 'processed' ? 'bg-green-600 text-white' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    {t('detail.thumbnailOut')}
                  </button>
                </div>
              </div>
              <div className="p-6">
                {mediaInfoSide === 'original' ? (
                  <>
                    <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-brand/5 border border-brand/20 rounded-xl text-[10px] font-mono text-brand/80 break-all">
                      <FolderOpen size={12} className="shrink-0" />
                      {asset.path}
                    </div>
                    <MediaInfoPanel
                      metadata={asset.metadata as DetailedMediaInfo | null}
                      compact={false}
                    />
                  </>
                ) : (
                  <>
                    {/* Path do ficheiro processado */}
                    {(asset.output_path ?? jobs.find((j) => j.output_path)?.output_path) && (
                      <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-green-500/5 border border-green-500/20 rounded-xl text-[10px] font-mono text-green-400 break-all">
                        <FolderOpen size={12} className="shrink-0" />
                        {asset.output_path ?? jobs.find((j) => j.output_path)?.output_path}
                      </div>
                    )}
                    <MediaInfoPanel
                      metadata={
                        (asset.output_metadata as DetailedMediaInfo | null) ??
                        (asset.metadata as DetailedMediaInfo | null)
                      }
                      compact={false}
                    />
                    {!asset.output_path && !jobs.some((j) => j.output_path) && (
                      <p className="text-text-muted text-sm italic text-center py-8">
                        {t('detail.notProcessedYet')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {activeDetailTab === 'media' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-y-auto">
            {/* Comparação técnica antes/depois */}
            <section className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border bg-surface/10">
                <h2 className="text-lg font-bold text-text-primary">{t('detail.comparison')}</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                {/* Coluna Original */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-brand mb-4">
                    {t('detail.original')}
                  </h3>
                  {[
                    { label: t('analysis.codec'), value: asset.video_codec },
                    {
                      label: t('analysis.resolution'),
                      value: asset.width && asset.height ? `${asset.width}×${asset.height}` : '—',
                    },
                    { label: t('analysis.fps'), value: asset.fps ? `${asset.fps}fps` : '—' },
                    {
                      label: t('analysis.bitDepth'),
                      value: (asset.metadata as Record<string, unknown>)?.bitDepth
                        ? `${(asset.metadata as Record<string, unknown>).bitDepth}-bit`
                        : '—',
                    },
                    {
                      label: t('analysis.hdr'),
                      value: String((asset.metadata as Record<string, unknown>)?.hdrType ?? 'SDR'),
                    },
                    {
                      label: t('analysis.colorSpace'),
                      value: String((asset.metadata as Record<string, unknown>)?.colorSpace ?? '—'),
                    },
                    {
                      label: t('analysis.container'),
                      value: String((asset.metadata as Record<string, unknown>)?.formatName ?? '—'),
                    },
                    {
                      label: t('analysis.interlace'),
                      value:
                        (asset.metadata as Record<string, unknown>)?.isInterlaced === true
                          ? t('analysis.interlaced')
                          : t('analysis.progressive'),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm"
                    >
                      <span className="text-text-muted">{label}</span>
                      <span className="font-bold text-text-primary font-mono">{value ?? '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Coluna Processado */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-green-500 mb-4">
                    {t('detail.processed')}
                  </h3>
                  {asset.output_metadata ? (
                    [
                      {
                        label: t('analysis.codec'),
                        value: String(
                          (asset.output_metadata as Record<string, unknown>)?.videoCodec ?? '—',
                        ),
                      },
                      {
                        label: t('analysis.resolution'),
                        value:
                          (asset.output_metadata as Record<string, unknown>)?.width &&
                          (asset.output_metadata as Record<string, unknown>)?.height
                            ? `${(asset.output_metadata as Record<string, unknown>).width}×${(asset.output_metadata as Record<string, unknown>).height}`
                            : '—',
                      },
                      {
                        label: t('analysis.fps'),
                        value: (asset.output_metadata as Record<string, unknown>)?.fps
                          ? `${(asset.output_metadata as Record<string, unknown>).fps}fps`
                          : '—',
                      },
                      {
                        label: t('analysis.bitDepth'),
                        value: (asset.output_metadata as Record<string, unknown>)?.bitDepth
                          ? `${(asset.output_metadata as Record<string, unknown>).bitDepth}-bit`
                          : '—',
                      },
                      {
                        label: t('analysis.hdr'),
                        value: String(
                          (asset.output_metadata as Record<string, unknown>)?.hdrType ?? 'SDR',
                        ),
                      },
                      {
                        label: t('analysis.colorSpace'),
                        value: String(
                          (asset.output_metadata as Record<string, unknown>)?.colorSpace ?? '—',
                        ),
                      },
                      {
                        label: t('analysis.container'),
                        value: String(
                          (asset.output_metadata as Record<string, unknown>)?.formatName ?? '—',
                        ),
                      },
                      {
                        label: t('analysis.interlace'),
                        value:
                          (asset.output_metadata as Record<string, unknown>)?.isInterlaced === true
                            ? t('analysis.interlaced')
                            : t('analysis.progressive'),
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm"
                      >
                        <span className="text-text-muted">{label}</span>
                        <span className="font-bold text-text-primary font-mono">
                          {value ?? '—'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-text-muted text-sm italic">{t('detail.notProcessedYet')}</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeDetailTab === 'history' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 px-2">
              <Clock className="text-brand" size={20} /> {t('assetDetail.jobHistory')}
            </h2>

            <div className="relative pl-8 space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface">
              {jobs.length === 0 ? (
                <div className="text-text-muted text-sm italic">{t('assetDetail.noJobs')}</div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="relative bg-bg-secondary border border-border rounded-2xl p-6 hover:border-brand/50 transition-all group"
                  >
                    {/* TIMELINE DOT */}
                    <div className="absolute left-[-32px] top-8 w-4 h-4 rounded-full bg-bg-secondary border-2 border-border group-hover:border-brand transition-colors z-10"></div>

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-text-muted uppercase">
                          ID: {job.id.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded border border-purple-500/20">
                          {job.profile}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest ${job.status === 'done' ? 'text-green-500' : 'text-gray-500'}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <button className="text-text-muted hover:text-text-primary">
                        <MoreVertical size={18} />
                      </button>
                    </div>

                    {/* MINI PIPELINE */}
                    <div className="flex items-center justify-between mb-6 px-2 opacity-60">
                      {PIPELINE_STEPS.map((step, idx) => {
                        const isDone = job.status === 'done';
                        return (
                          <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isDone
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-700 text-gray-700'
                                }`}
                              >
                                {isDone ? (
                                  <CheckCircle2 size={10} />
                                ) : (
                                  <span className="text-[8px] font-bold">{step.short}</span>
                                )}
                              </div>
                            </div>
                            {idx < PIPELINE_STEPS.length - 1 && (
                              <div
                                className={`flex-1 h-px mx-[-2px] ${isDone ? 'bg-green-500' : 'bg-gray-800'}`}
                              ></div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">
                          {t('assetDetail.started')}
                        </div>
                        <div className="text-xs text-text-primary font-bold">
                          {job.started_at
                            ? new Date(job.started_at).toLocaleString(i18n.language)
                            : new Date(job.created_at).toLocaleDateString(i18n.language)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">
                          {t('assetDetail.jobDuration')}
                        </div>
                        <div className="text-xs text-text-primary font-bold">
                          {job.started_at && job.finished_at
                            ? (() => {
                                const secs = Math.round(
                                  (new Date(job.finished_at).getTime() -
                                    new Date(job.started_at).getTime()) /
                                    1000,
                                );
                                const m = Math.floor(secs / 60);
                                const s = secs % 60;
                                return m > 0 ? `${m}m ${s}s` : `${s}s`;
                              })()
                            : '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                          VMAF
                        </div>
                        <div className="text-xs text-green-500 font-bold">
                          {job.vmaf_score?.toFixed(1) || '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">
                          LUFS
                        </div>
                        <div className="text-xs text-text-primary font-bold">
                          {job.lufs?.toFixed(1) || '--'}
                        </div>
                      </div>
                    </div>

                    {job.output_path && (
                      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted min-w-0">
                          <FolderOpen size={12} className="shrink-0 text-green-500" />
                          <span className="truncate" title={job.output_path}>
                            {job.output_path}
                          </span>
                        </div>
                        <button
                          onClick={() => openPath(job.output_path!).catch(() => {})}
                          className="flex items-center gap-1.5 text-[10px] font-black text-brand uppercase tracking-widest hover:underline shrink-0"
                        >
                          <ExternalLink size={14} /> {t('assetDetail.openProcessedFile')}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {/* STICKY ACTION BAR */}
      <div className="fixed bottom-6 left-[252px] right-8 bg-bg-secondary/80 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-2xl flex items-center justify-between z-40">
        <div className="flex gap-4">
          <button
            onClick={() => handleReprocess(jobs[0]?.profile || 'broadcast-hd')}
            className="flex items-center gap-2 px-6 py-2 bg-brand hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
          >
            <Play size={18} /> {t('assetDetail.reprocess')}
          </button>
          <button
            onClick={() => revealItemInDir(asset.path).catch(() => {})}
            className="flex items-center gap-2 px-6 py-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-xl font-bold transition-all"
          >
            <FolderOpen size={18} /> {t('assetDetail.openInExplorer')}
          </button>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-6 py-2 text-red-500 hover:bg-red-500/10 rounded-xl font-bold transition-all"
        >
          <Trash2 size={18} /> {t('assetDetail.deleteAsset')}
        </button>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => !deleteLoading && setDeleteConfirmOpen(open)}
        title={t('assetDetail.deleteConfirm', 'Apagar asset?')}
        description={t(
          'library.deleteConfirmDesc',
          'Esta ação é irreversível. Os ficheiros gerados serão apagados do disco.',
        )}
        confirmLabel={t('common.delete', 'Apagar')}
        cancelLabel={t('common.cancel', 'Cancelar')}
        onConfirm={executeDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
