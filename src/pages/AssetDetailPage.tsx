import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  ChevronLeft, Film, Shield, Clock, ExternalLink, 
  Trash2, Play, CheckCircle2, FolderOpen,
  Loader2, MoreVertical
} from 'lucide-react';
<<<<<<< HEAD
=======
import { useTranslation } from 'react-i18next';
>>>>>>> dev

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
  // thumbnail_path não existe no backend — removido (P7)
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
  { key: 'ingest',     short: 'IN' },
  { key: 'qc-pre',     short: 'QC' },
  { key: 'transcode',  short: 'TR' },
  { key: 'audio',      short: 'AU' },
  { key: 'proxy',      short: 'PX' },
  { key: 'thumbnail',  short: 'TH' },
  { key: 'qc-post',    short: 'QP' },
  { key: 'delivery',   short: 'DL' },
];

export default function AssetDetailPage({ assetId, onBack }: AssetDetailPageProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [qcExpanded, setQcExpanded] = useState(true);
<<<<<<< HEAD
=======
  const { t, i18n } = useTranslation();
>>>>>>> dev

  const fetchData = useCallback(async () => {
    try {
      const [assetData, jobsData] = await Promise.all([
        invoke<Asset | null>('get_asset', { id: assetId }), // P6: backend retorna Option<Asset>; P11: param name é 'id'
        invoke<Job[]>('list_jobs', { asset_id: assetId })   // P11: backend espera asset_id não assetId
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

  const handleDelete = async () => {
<<<<<<< HEAD
    if (confirm('Tens a certeza que desejas apagar este asset? Esta acção não pode ser desfeita.')) {
=======
    if (confirm(t('assetDetail.deleteConfirm'))) {
>>>>>>> dev
      try {
        await invoke('delete_asset', { id: assetId }); // P12: backend espera 'id'
        onBack();
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
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

  if (loading || !asset) {
    return (
<<<<<<< HEAD
      <div className="h-full flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Carregando detalhes do asset...
=======
      <div className="h-full flex items-center justify-center text-text-muted">
        <Loader2 className="animate-spin mr-2" /> {t('assetDetail.loading')}
>>>>>>> dev
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* BREADCRUMB */}
      <nav className="flex items-center gap-2 text-sm">
<<<<<<< HEAD
        <button onClick={onBack} className="text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Biblioteca
        </button>
        <span className="text-gray-700">/</span>
        <span className="text-white font-bold">{asset.filename}</span>
=======
        <button onClick={onBack} className="text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> {t('assetDetail.backToLibrary')}
        </button>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-bold">{asset.filename}</span>
>>>>>>> dev
      </nav>

      {/* HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: THUMBNAIL */}
        <div className="lg:col-span-5">
<<<<<<< HEAD
          <div className="aspect-video bg-[#0a0d14] rounded-2xl border border-[#1e2433] flex items-center justify-center overflow-hidden group relative">
            {(asset.metadata?.thumbnail_path) ? (
              <img src={asset.metadata.thumbnail_path as string} alt={asset.filename} className="w-full h-full object-cover" />
            ) : (
              <Film size={64} className="text-gray-800" />
            )}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] font-mono text-gray-400 truncate">{asset.path}</p>
=======
          <div className="aspect-video bg-bg-primary rounded-2xl border border-border flex items-center justify-center overflow-hidden group relative">
            {(asset.metadata?.thumbnail_path) ? (
              <img src={asset.metadata.thumbnail_path as string} alt={asset.filename} className="w-full h-full object-cover" />
            ) : (
              <Film size={64} className="text-text-muted" />
            )}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] font-mono text-text-secondary truncate">{asset.path}</p>
>>>>>>> dev
            </div>
          </div>
        </div>

        {/* RIGHT: METADATA */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
<<<<<<< HEAD
            <h1 className="text-3xl font-black text-white leading-tight">{asset.filename}</h1>
=======
            <h1 className="text-3xl font-black text-text-primary leading-tight">{asset.filename}</h1>
>>>>>>> dev
            <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              {asset.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8">
            <div className="flex flex-col">
<<<<<<< HEAD
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tamanho</span>
              <span className="text-lg font-bold text-white">{formatBytes(asset.size_bytes || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Duração</span>
              <span className="text-lg font-bold text-white">{formatDuration(asset.duration_secs)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Vídeo</span>
              <span className="text-sm font-bold text-gray-300">{asset.video_codec} / {asset.width}x{asset.height} / {asset.fps}fps</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Áudio</span>
              <span className="text-sm font-bold text-gray-300">{asset.audio_codec || 'N/A'} / 48kHz / Stereo</span>
=======
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('assetDetail.size')}</span>
              <span className="text-lg font-bold text-text-primary">{formatBytes(asset.size_bytes || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('assetDetail.duration')}</span>
              <span className="text-lg font-bold text-text-primary">{formatDuration(asset.duration_secs)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('assetDetail.video')}</span>
              <span className="text-sm font-bold text-text-secondary">{asset.video_codec} / {asset.width}x{asset.height} / {asset.fps}fps</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('assetDetail.audio')}</span>
              <span className="text-sm font-bold text-text-secondary">{asset.audio_codec || t('assetDetail.notAvailable')} / 48kHz / Stereo</span>
>>>>>>> dev
            </div>
          </div>

          {jobs.some(j => j.vmaf_score) && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl w-fit">
              <Shield className="text-green-500" size={24} />
              <div>
<<<<<<< HEAD
                <div className="text-[10px] font-black text-green-500 uppercase tracking-widest">Melhor Qualidade (VMAF)</div>
                <div className="text-2xl font-black text-white">{Math.max(...jobs.map(j => j.vmaf_score || 0)).toFixed(1)}</div>
=======
                <div className="text-[10px] font-black text-green-500 uppercase tracking-widest">{t('assetDetail.bestQuality')}</div>
                <div className="text-2xl font-black text-text-primary">{Math.max(...jobs.map(j => j.vmaf_score || 0)).toFixed(1)}</div>
>>>>>>> dev
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QC REPORT */}
<<<<<<< HEAD
      <section className="bg-[#141824] border border-[#1e2433] rounded-2xl overflow-hidden">
        <button 
          onClick={() => setQcExpanded(!qcExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-[#1e2433]/30 transition-colors"
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="text-[#1A6FD4]" size={20} /> Relatório de Qualidade (QC)
=======
      <section className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
        <button 
          onClick={() => setQcExpanded(!qcExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-surface/30 transition-colors"
        >
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Shield className="text-brand" size={20} /> {t('assetDetail.qualityReport')}
>>>>>>> dev
          </h2>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest rounded border border-green-500/30">
              QC PASS
            </span>
            <ChevronLeft className={`transition-transform ${qcExpanded ? '-rotate-90' : ''}`} size={20} />
          </div>
        </button>
        {qcExpanded && (
          <div className="px-6 pb-6 animate-in slide-in-from-top-2">
<<<<<<< HEAD
            <div className="bg-[#0a0d14] rounded-xl border border-[#1e2433] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[10px] font-bold uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Verificação</th>
                    <th className="px-6 py-3">Resultado</th>
                    <th className="px-6 py-3">Valor</th>
                    <th className="px-6 py-3">Limite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2433]">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-300">Codec suportado</td>
                    <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                    <td className="px-6 py-4 text-gray-400">{asset.video_codec}</td>
                    <td className="px-6 py-4 text-gray-600">--</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-300">Resolução mínima</td>
                    <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                    <td className="px-6 py-4 text-gray-400">{asset.width}x{asset.height}</td>
                    <td className="px-6 py-4 text-gray-600">≥ 720p</td>
                  </tr>
                  {jobs[0]?.vmaf_score && (
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-300">VMAF Score</td>
                      <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                      <td className="px-6 py-4 text-gray-400">{jobs[0].vmaf_score.toFixed(1)}</td>
                      <td className="px-6 py-4 text-gray-600">≥ 85</td>
=======
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
                    <td className="px-6 py-4 text-text-secondary">{t('assetDetail.codecSupported')}</td>
                    <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                    <td className="px-6 py-4 text-text-secondary">{asset.video_codec}</td>
                    <td className="px-6 py-4 text-text-muted">--</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-text-secondary">{t('assetDetail.minResolution')}</td>
                    <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                    <td className="px-6 py-4 text-text-secondary">{asset.width}x{asset.height}</td>
                    <td className="px-6 py-4 text-text-muted">≥ 720p</td>
                  </tr>
                  {jobs[0]?.vmaf_score && (
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-text-secondary">{t('assetDetail.vmafScore')}</td>
                      <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                      <td className="px-6 py-4 text-text-secondary">{jobs[0].vmaf_score.toFixed(1)}</td>
                      <td className="px-6 py-4 text-text-muted">≥ 85</td>
>>>>>>> dev
                    </tr>
                  )}
                  {jobs[0]?.lufs && (
                    <tr className="hover:bg-white/5 transition-colors">
<<<<<<< HEAD
                      <td className="px-6 py-4 text-gray-300">Níveis de áudio</td>
                      <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                      <td className="px-6 py-4 text-gray-400">{jobs[0].lufs.toFixed(1)} LUFS</td>
                      <td className="px-6 py-4 text-gray-600">-23 ±1</td>
=======
                      <td className="px-6 py-4 text-text-secondary">{t('assetDetail.audioLevels')}</td>
                      <td className="px-6 py-4 text-green-500 font-bold">✓</td>
                      <td className="px-6 py-4 text-text-secondary">{jobs[0].lufs.toFixed(1)} LUFS</td>
                      <td className="px-6 py-4 text-text-muted">-23 ±1</td>
>>>>>>> dev
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
<<<<<<< HEAD
            <p className="mt-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-right">
              Aprovado automaticamente em {new Date(asset.created_at).toLocaleDateString('pt-PT')}
=======
            <p className="mt-4 text-[10px] text-text-muted font-bold uppercase tracking-widest text-right">
              {t('assetDetail.approvedAt', { date: new Date(asset.created_at).toLocaleDateString(i18n.language) })}
>>>>>>> dev
            </p>
          </div>
        )}
      </section>

      {/* PROCESSING HISTORY */}
      <section className="space-y-6">
<<<<<<< HEAD
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="text-[#1A6FD4]" size={20} /> Histórico de Jobs
          <span className="bg-[#1e2433] px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 ml-2">{jobs.length}</span>
        </h2>

        <div className="relative pl-8 space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#1e2433]">
          {jobs.length === 0 ? (
            <div className="text-gray-500 text-sm italic">Nenhum job processado para este asset.</div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="relative bg-[#141824] border border-[#1e2433] rounded-2xl p-6 hover:border-[#1A6FD4]/50 transition-all group">
                {/* TIMELINE DOT */}
                <div className="absolute left-[-32px] top-8 w-4 h-4 rounded-full bg-[#141824] border-2 border-[#1e2433] group-hover:border-[#1A6FD4] transition-colors z-10"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">ID: {job.id.slice(0, 8)}</span>
=======
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Clock className="text-brand" size={20} /> {t('assetDetail.jobHistory')}
          <span className="bg-surface px-2 py-0.5 rounded text-[10px] font-bold text-text-muted ml-2">{jobs.length}</span>
        </h2>

        <div className="relative pl-8 space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface">
          {jobs.length === 0 ? (
            <div className="text-text-muted text-sm italic">{t('assetDetail.noJobs')}</div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="relative bg-bg-secondary border border-border rounded-2xl p-6 hover:border-brand/50 transition-all group">
                {/* TIMELINE DOT */}
                <div className="absolute left-[-32px] top-8 w-4 h-4 rounded-full bg-bg-secondary border-2 border-border group-hover:border-brand transition-colors z-10"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-text-muted uppercase">ID: {job.id.slice(0, 8)}</span>
>>>>>>> dev
                    <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded border border-purple-500/20">
                      {job.profile}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${job.status === 'done' ? 'text-green-500' : 'text-gray-500'}`}>
                      {job.status}
                    </span>
                  </div>
<<<<<<< HEAD
                  <button className="text-gray-500 hover:text-white"><MoreVertical size={18} /></button>
=======
                  <button className="text-text-muted hover:text-text-primary"><MoreVertical size={18} /></button>
>>>>>>> dev
                </div>

                {/* MINI PIPELINE */}
                <div className="flex items-center justify-between mb-6 px-2 opacity-60">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isDone = job.status === 'done';
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-700 text-gray-700'
                          }`}>
                            {isDone ? <CheckCircle2 size={10} /> : <span className="text-[8px] font-bold">{step.short}</span>}
                          </div>
                        </div>
                        {idx < PIPELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-px mx-[-2px] ${isDone ? 'bg-green-500' : 'bg-gray-800'}`}></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
<<<<<<< HEAD
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Iniciado</div>
                    <div className="text-xs text-white font-bold">{new Date(job.created_at).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Duração</div>
                    <div className="text-xs text-white font-bold">2m 04s</div>
=======
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('assetDetail.started')}</div>
                    <div className="text-xs text-text-primary font-bold">{new Date(job.created_at).toLocaleDateString(i18n.language)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('assetDetail.jobDuration')}</div>
                    <div className="text-xs text-text-primary font-bold">2m 04s</div>
>>>>>>> dev
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">VMAF</div>
                    <div className="text-xs text-green-500 font-bold">{job.vmaf_score?.toFixed(1) || '--'}</div>
                  </div>
                  <div>
<<<<<<< HEAD
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">LUFS</div>
                    <div className="text-xs text-white font-bold">{job.lufs?.toFixed(1) || '--'}</div>
=======
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">LUFS</div>
                    <div className="text-xs text-text-primary font-bold">{job.lufs?.toFixed(1) || '--'}</div>
>>>>>>> dev
                  </div>
                </div>

                {job.output_path && (
<<<<<<< HEAD
                  <div className="mt-6 pt-4 border-t border-[#1e2433] flex justify-end">
                    <button className="flex items-center gap-2 text-[10px] font-black text-[#1A6FD4] uppercase tracking-widest hover:underline">
                      <ExternalLink size={14} /> Abrir Ficheiro Processado
=======
                  <div className="mt-6 pt-4 border-t border-border flex justify-end">
                    <button className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest hover:underline">
                      <ExternalLink size={14} /> {t('assetDetail.openProcessedFile')}
>>>>>>> dev
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* STICKY ACTION BAR */}
<<<<<<< HEAD
      <div className="fixed bottom-6 left-[252px] right-8 bg-[#141824]/80 backdrop-blur-xl border border-[#1e2433] p-4 rounded-2xl shadow-2xl flex items-center justify-between z-40">
        <div className="flex gap-4">
          <button
            onClick={() => handleReprocess(jobs[0]?.profile || 'broadcast-hd')}
            className="flex items-center gap-2 px-6 py-2 bg-[#1A6FD4] hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
          >
            <Play size={18} /> Processar Novamente
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-[#1e2433] hover:bg-[#2a3143] text-gray-300 rounded-xl font-bold transition-all">
            <FolderOpen size={18} /> Abrir no Explorador
=======
      <div className="fixed bottom-6 left-[252px] right-8 bg-bg-secondary/80 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-2xl flex items-center justify-between z-40">
        <div className="flex gap-4">
          <button
            onClick={() => handleReprocess(jobs[0]?.profile || 'broadcast-hd')}
            className="flex items-center gap-2 px-6 py-2 bg-brand hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
          >
            <Play size={18} /> {t('assetDetail.reprocess')}
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-xl font-bold transition-all">
            <FolderOpen size={18} /> {t('assetDetail.openInExplorer')}
>>>>>>> dev
          </button>
        </div>
        <button 
          onClick={handleDelete}
          className="flex items-center gap-2 px-6 py-2 text-red-500 hover:bg-red-500/10 rounded-xl font-bold transition-all"
        >
<<<<<<< HEAD
          <Trash2 size={18} /> Apagar Asset
=======
          <Trash2 size={18} /> {t('assetDetail.deleteAsset')}
>>>>>>> dev
        </button>
      </div>
    </div>
  );
}
