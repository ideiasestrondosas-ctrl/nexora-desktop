import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Repeat,
  Film,
  Cpu,
  ShieldAlert,
  ShieldX,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import PipelineSummary from '@/components/PipelineSummary';

interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status:
    | 'queued'
    | 'processing'
    | 'done'
    | 'error'
    | 'cancelled'
    | 'qc_quarantined'
    | 'qc_rejected';
  progress: number;
  step: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  vmaf_score: number | null;
  lufs: number | null;
  output_path: string | null;
  filename: string | null;
}

interface QueueStats {
  queued: number;
  processing: number;
  doneToday: number;
  errorToday: number;
  quarantined: number;
  rejectedToday: number;
}

const PIPELINE_STEPS = [
  { key: 'ingest' },
  { key: 'qc-pre' },
  { key: 'transcode' },
  { key: 'audio' },
  { key: 'proxy' },
  { key: 'thumbnail' },
  { key: 'qc-post' },
  { key: 'delivery' },
];

const PIPELINE_PHASES = [
  { labelKey: 'queue.phaseAnalyse', steps: ['ingest', 'qc-pre'] },
  { labelKey: 'queue.phaseConvert', steps: ['transcode', 'audio', 'proxy', 'thumbnail'] },
  { labelKey: 'queue.phaseVerify', steps: ['qc-post', 'delivery'] },
];

export default function QueuePage({
  onSelectAsset,
}: {
  onSelectAsset?: (assetId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    queued: 0,
    processing: 0,
    doneToday: 0,
    errorToday: 0,
    quarantined: 0,
    rejectedToday: 0,
  });
  const [availableProfiles, setAvailableProfiles] = useState<
    { id: string; name: string; label_friendly: string | null }[]
  >([]);
  const [reprocessPopover, setReprocessPopover] = useState<string | null>(null); // job.id
  const fetchData = useCallback(async () => {
    try {
      const [jobsData, statsData, profilesData] = await Promise.all([
        invoke<Job[]>('list_jobs'),
        invoke<QueueStats>('get_queue_stats'),
        invoke<{ id: string; name: string; label_friendly: string | null }[]>('list_profiles'),
      ]);
      setJobs(jobsData);
      setStats(statsData);
      setAvailableProfiles(profilesData);
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const unlisten = listen('sidecar:event', () => {
      fetchData();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchData]);

  const handleCancel = async (jobId: string) => {
    try {
      const ok = await invoke<boolean>('cancel_job', { id: jobId });
      if (!ok) {
        toast.warning(t('queue.cannotCancelState'));
      }
      fetchData();
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      const ok = await invoke<boolean>('retry_job', { id: jobId });
      if (!ok) {
        toast.warning(t('queue.cannotRetryState'));
      } else {
        toast.success(t('queue.retryQueued'));
      }
      fetchData();
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  const handleReprocessWithProfile = async (assetId: string, profile: string) => {
    logActivity('Reprocessar com perfil', 'execute', `asset_id=${assetId} profile=${profile}`);
    try {
      await invoke('submit_job', { asset_id: assetId, profile, priority: 0 });
      toast.success(t('queue.retryQueued'));
      fetchData();
    } catch (error) {
      console.error('Failed to reprocess:', error);
      toast.error(t('common.error', 'Ocorreu um erro'));
    }
    setReprocessPopover(null);
  };

  useEffect(() => {
    if (!reprocessPopover) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-reprocess-popover]')) setReprocessPopover(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [reprocessPopover]);

  const handleApprove = async (jobId: string) => {
    try {
      await invoke('approve_job', { id: jobId });
      fetchData();
    } catch (error) {
      console.error('Failed to approve job:', error);
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      await invoke('reject_job', { id: jobId, reason: t('queue.rejectedManual') });
      fetchData();
    } catch (error) {
      console.error('Failed to reject job:', error);
    }
  };

  const processingJobs = jobs.filter((j) => j.status === 'processing');
  const queuedJobs = jobs.filter((j) => j.status === 'queued');
  const quarantinedJobs = jobs.filter((j) => j.status === 'qc_quarantined');
  const finishedJobs = jobs.filter((j) =>
    ['done', 'error', 'cancelled', 'qc_rejected'].includes(j.status),
  );

  const getStepIndex = (stepKey: string | null) => {
    if (!stepKey) return -1;
    return PIPELINE_STEPS.findIndex((s) => s.key === stepKey);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  };

  const getVmafColor = (score: number | null) => {
    if (score === null) return 'text-text-muted';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* RESUMO DO PIPELINE */}
      <PipelineSummary jobs={jobs} />

      {/* Quarentena badge se houver */}
      {stats.quarantined > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs font-bold text-yellow-500 flex items-center gap-2">
            <ShieldAlert size={12} /> {t('queue.quarantine')}: {stats.quarantined}
          </div>
          {stats.errorToday > 0 && (
            <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-500 flex items-center gap-2">
              {t('queue.errorsToday')}: {stats.errorToday}
            </div>
          )}
        </div>
      )}

      {/* APROVAÇÕES — QUARENTENA */}
      {quarantinedJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-500 flex items-center gap-2">
            <ShieldAlert size={16} /> {t('queue.pendingApprovals')}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {quarantinedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-bg-secondary border border-yellow-500/30 rounded-xl p-6 relative"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary leading-tight mb-1">
                      {job.filename}
                    </h3>
                    <span className="px-2 py-0.5 bg-surface text-[10px] font-bold uppercase text-purple-400 rounded">
                      {job.profile}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary mb-4">{t('queue.quarantineMsg')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(job.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg text-sm font-bold transition-colors"
                  >
                    <ThumbsUp size={14} /> {t('queue.approve')}
                  </button>
                  <button
                    onClick={() => handleReject(job.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition-colors"
                  >
                    <ThumbsDown size={14} /> {t('queue.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* A PROCESSAR */}
      {processingJobs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
              {t('queue.processingTitle')}
            </h2>
            <span className="text-xs text-text-muted">
              {t('queue.slotsUsed', { used: stats.processing, total: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {processingJobs.map((job) => {
              const currentStepIdx = getStepIndex(job.step);
              return (
                <div
                  key={job.id}
                  className="bg-bg-secondary border-l-4 border-brand border-y border-r border-border rounded-xl p-6 relative group"
                >
                  <button
                    onClick={() => handleCancel(job.id)}
                    className="absolute top-4 right-4 p-2 text-text-muted hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-bg-primary rounded-lg flex items-center justify-center">
                      <Film className="text-text-muted" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-text-primary leading-tight">
                          {job.filename}
                        </h3>
                        {onSelectAsset && (
                          <button
                            onClick={() => onSelectAsset(job.asset_id)}
                            title={t('queue.viewAsset')}
                            className="text-text-muted hover:text-brand transition-colors shrink-0"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-surface text-[10px] font-bold uppercase text-purple-400 rounded">
                        {job.profile}
                      </span>
                    </div>
                  </div>

                  {/* PIPELINE VISUALIZER — 3 FASES */}
                  <div className="mb-8">
                    <div className="flex items-stretch gap-2">
                      {PIPELINE_PHASES.map((phase, phaseIdx) => {
                        const stepIndices = phase.steps.map((s) =>
                          PIPELINE_STEPS.findIndex((ps) => ps.key === s),
                        );
                        const phaseMin = Math.min(...stepIndices);
                        const phaseMax = Math.max(...stepIndices);
                        const isDone = currentStepIdx > phaseMax;
                        const isActive = currentStepIdx >= phaseMin && currentStepIdx <= phaseMax;
                        return (
                          <React.Fragment key={phase.labelKey}>
                            <div
                              className={`flex-1 rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                                isDone
                                  ? 'border-green-500/40 bg-green-500/5'
                                  : isActive
                                    ? 'border-brand/60 bg-brand/5'
                                    : 'border-border bg-bg-primary'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                    isDone ? 'bg-green-500' : isActive ? 'bg-brand' : 'bg-surface'
                                  }`}
                                >
                                  {isDone ? (
                                    <CheckCircle2 size={10} className="text-white" />
                                  ) : isActive ? (
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                  ) : null}
                                </div>
                                <span
                                  className={`text-[10px] font-black uppercase tracking-widest ${
                                    isDone
                                      ? 'text-green-500'
                                      : isActive
                                        ? 'text-brand'
                                        : 'text-text-muted'
                                  }`}
                                >
                                  {t(phase.labelKey)}
                                </span>
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {phase.steps.map((stepKey) => {
                                  const idx = PIPELINE_STEPS.findIndex((s) => s.key === stepKey);
                                  const stepDone = idx < currentStepIdx;
                                  const stepActive = idx === currentStepIdx;
                                  return (
                                    <span
                                      key={stepKey}
                                      title={`${t(`pipeline.${stepKey}`)}: ${t(`pipeline.${stepKey}Desc`)}`}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        stepDone
                                          ? 'bg-green-500/20 text-green-500'
                                          : stepActive
                                            ? 'bg-brand/20 text-brand'
                                            : 'bg-surface text-text-muted'
                                      }`}
                                    >
                                      {t(`pipeline.${stepKey}`)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            {phaseIdx < PIPELINE_PHASES.length - 1 && (
                              <div className="flex items-center">
                                <div
                                  className={`w-6 h-0.5 ${
                                    currentStepIdx > phaseMax ? 'bg-green-500' : 'bg-surface'
                                  }`}
                                />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-text-secondary">
                        {t('queue.step', { step: job.step || t('queue.wait') })}
                      </span>
                      <span className="text-xl font-black text-text-primary">
                        {(job.progress * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-bg-primary rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-brand transition-all duration-500 ease-out"
                        style={{ width: `${job.progress * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-6 text-[11px] font-bold text-text-muted uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <Clock size={14} /> {t('queue.startedAt')} {formatTime(job.started_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={14} /> {t('queue.gpuNvenc')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* EM FILA */}
      {queuedJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            {t('queue.queuedTitle')}{' '}
            <span className="bg-surface px-2 py-0.5 rounded text-[10px]">{queuedJobs.length}</span>
          </h2>
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-primary text-[10px] font-bold uppercase text-text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 w-16">{t('queue.position')}</th>
                  <th className="px-6 py-3">{t('queue.filename')}</th>
                  <th className="px-6 py-3">{t('queue.profile')}</th>
                  <th className="px-6 py-3">{t('queue.addedAt')}</th>
                  <th className="px-6 py-3">{t('queue.state')}</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queuedJobs.map((job, idx) => (
                  <tr key={job.id} className="hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-text-muted">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-text-primary">
                      <button
                        onClick={() => onSelectAsset?.(job.asset_id)}
                        title={t('queue.viewAsset')}
                        className="text-left hover:text-brand transition-colors"
                      >
                        {job.filename}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-surface text-[10px] font-bold uppercase text-blue-400 rounded">
                        {job.profile}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{formatTime(job.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-text-muted font-bold uppercase text-[10px]">
                        <Clock size={14} /> {t('queue.wait')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleCancel(job.id)}
                        title={t('queue.cancel')}
                        className="text-text-muted hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CONCLUÍDOS E HISTÓRICO */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
            {t('queue.completedAndHistory')}
          </h2>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          {finishedJobs.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              <Clock size={32} className="mx-auto mb-4 opacity-20" />
              <p>{t('dashboard.noJobs')}</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-primary text-[10px] font-bold uppercase text-text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3">{t('queue.filename')}</th>
                  <th className="px-6 py-3">{t('queue.profile')}</th>
                  <th className="px-6 py-3">{t('queue.vmaf')}</th>
                  <th className="px-6 py-3">{t('queue.state')}</th>
                  <th className="px-6 py-3">{t('queue.finishedAt')}</th>
                  <th className="px-6 py-3 w-24 text-right">{t('queue.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {finishedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-4">
                      <div
                        className="font-bold text-text-primary truncate max-w-[200px] cursor-pointer hover:text-brand transition-colors"
                        title={job.filename ?? undefined}
                        onClick={() => onSelectAsset?.(job.asset_id)}
                      >
                        {job.filename ?? job.asset_id.slice(0, 8)}
                      </div>
                      {job.output_path && (
                        <div
                          className="text-[10px] text-text-muted truncate max-w-[200px] mt-0.5"
                          title={job.output_path}
                        >
                          → {job.output_path.split(/[/\\]/).pop()}
                        </div>
                      )}
                      {job.error && (
                        <div
                          className="text-[10px] text-red-400 truncate max-w-[200px] mt-0.5"
                          title={job.error}
                        >
                          {job.error}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-surface text-[10px] font-bold uppercase text-text-muted rounded">
                        {job.profile}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-bold ${getVmafColor(job.vmaf_score)}`}>
                        {job.vmaf_score ? job.vmaf_score.toFixed(1) : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {job.status === 'done' ? (
                        <span className="flex items-center gap-1.5 text-green-500 font-bold uppercase text-[10px]">
                          <CheckCircle2 size={14} /> {t('dashboard.completed')}
                        </span>
                      ) : job.status === 'error' ? (
                        <span
                          className="flex items-center gap-1.5 text-red-500 font-bold uppercase text-[10px]"
                          title={job.error ?? undefined}
                        >
                          <AlertCircle size={14} /> {t('dashboard.error')}
                        </span>
                      ) : job.status === 'qc_rejected' ? (
                        <span className="flex items-center gap-1.5 text-orange-500 font-bold uppercase text-[10px]">
                          <ShieldX size={14} /> {t('queue.rejected')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-text-muted font-bold uppercase text-[10px]">
                          <X size={14} /> {t('dashboard.cancelled')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {formatTime(job.finished_at || job.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            logActivity(
                              'Abrir Asset da Fila',
                              'navigate',
                              `asset_id=${job.asset_id}`,
                            );
                            onSelectAsset?.(job.asset_id);
                          }}
                          title={t('queue.viewAsset')}
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <div className="relative" data-reprocess-popover>
                          <button
                            onClick={() => {
                              logActivity('Menu reprocessar fila', 'click', `job_id=${job.id}`);
                              setReprocessPopover(reprocessPopover === job.id ? null : job.id);
                            }}
                            title={t('queue.reprocessOptions', 'Opções de reprocessamento')}
                            className="p-1.5 text-brand hover:text-white hover:bg-brand rounded transition-colors"
                          >
                            <Repeat size={14} />
                          </button>
                          {reprocessPopover === job.id && (
                            <div className="absolute bottom-full right-0 mb-1 bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden z-50 min-w-[200px]">
                              <div className="px-3 py-1.5 border-b border-border">
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                                  {t('queue.reprocessOptions', 'Opções de reprocessamento')}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  handleRetry(job.id);
                                  setReprocessPopover(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-bg-hover transition-colors flex items-center gap-2"
                              >
                                <Repeat size={12} className="text-brand" />
                                <span className="font-bold">
                                  {t('assetDetail.sameProfile', 'Mesmo perfil')} — {job.profile}
                                </span>
                              </button>
                              {availableProfiles
                                .filter((p) => p.name !== job.profile)
                                .map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleReprocessWithProfile(job.asset_id, p.name)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-bg-hover transition-colors"
                                  >
                                    <span className="font-bold text-text-primary">
                                      {p.label_friendly ?? p.name}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
