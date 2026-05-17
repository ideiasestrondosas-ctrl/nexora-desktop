import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
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
  filename: string;
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

export default function QueuePage() {
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
  const fetchData = useCallback(async () => {
    try {
      const [jobsData, statsData] = await Promise.all([
        invoke<Job[]>('list_jobs'),
        invoke<QueueStats>('get_queue_stats'),
      ]);
      setJobs(jobsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCancel = async (jobId: string) => {
    try {
      await invoke('cancel_job', { id: jobId });
      fetchData();
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await invoke('retry_job', { id: jobId });
      fetchData();
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

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

  const StepIcon = ({
    stepIdx,
    currentStepIdx,
    jobStatus,
  }: {
    stepIdx: number;
    currentStepIdx: number;
    jobStatus: string;
  }) => {
    if (stepIdx < currentStepIdx) {
      return <CheckCircle2 size={16} className="text-green-500" />;
    }
    if (stepIdx === currentStepIdx && jobStatus === 'processing') {
      return <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />;
    }
    if (jobStatus === 'qc_quarantined' && stepIdx === 1) {
      return <ShieldAlert size={16} className="text-yellow-500" />;
    }
    if (jobStatus === 'error' && stepIdx === currentStepIdx) {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    return (
      <span className="text-[9px] font-bold text-text-muted">
        {t(`pipeline.${PIPELINE_STEPS[stepIdx].key}`).slice(0, 2).toUpperCase()}
      </span>
    );
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
                      <h3 className="text-lg font-bold text-text-primary leading-tight mb-1">
                        {job.filename}
                      </h3>
                      <span className="px-2 py-0.5 bg-surface text-[10px] font-bold uppercase text-purple-400 rounded">
                        {job.profile}
                      </span>
                    </div>
                  </div>

                  {/* PIPELINE VISUALIZER */}
                  <div className="mb-8 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[700px] px-2">
                      {PIPELINE_STEPS.map((step, idx) => (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center gap-2 relative z-10 group/step">
                            <div
                              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                                idx < currentStepIdx
                                  ? 'bg-green-500 border-green-500'
                                  : idx === currentStepIdx
                                    ? 'border-brand'
                                    : 'border-border'
                              }`}
                            >
                              <StepIcon
                                stepIdx={idx}
                                currentStepIdx={currentStepIdx}
                                jobStatus={job.status}
                              />
                            </div>
                            <span
                              className={`text-[9px] font-bold uppercase ${
                                idx === currentStepIdx ? 'text-brand' : 'text-text-muted'
                              }`}
                            >
                              {t(`pipeline.${step.key}`)}
                            </span>
                            {/* Tooltip com descrição da fase */}
                            <div className="absolute bottom-full mb-2 hidden group-hover/step:block w-48 bg-bg-primary border border-border rounded-lg p-2 text-[10px] text-text-secondary z-20">
                              <p className="font-bold text-text-primary mb-0.5">
                                {t(`pipeline.${step.key}`)}
                              </p>
                              <p>{t(`pipeline.${step.key}Desc`)}</p>
                            </div>
                          </div>
                          {idx < PIPELINE_STEPS.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-[-2px] mb-6 transition-all ${
                                idx < currentStepIdx ? 'bg-green-500' : 'bg-surface'
                              }`}
                            ></div>
                          )}
                        </React.Fragment>
                      ))}
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
                    <td className="px-6 py-4 font-bold text-text-primary">{job.filename}</td>
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
                        className="font-bold text-text-primary truncate max-w-[200px]"
                        title={job.filename}
                      >
                        {job.filename}
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
                        {job.output_path && (
                          <button
                            onClick={() => openPath(job.output_path!).catch(() => {})}
                            title={t('queue.openProcessedFile') + ': ' + job.output_path}
                            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRetry(job.id)}
                          title={t('queue.retry')}
                          className="p-1.5 text-brand hover:text-white hover:bg-brand rounded transition-colors"
                        >
                          <Repeat size={14} />
                        </button>
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
