import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  asset_id: string;
  profile: string;
  filename: string | null;
  status: string;
  step: string | null;
  progress: number;
}

interface PipelineSummaryProps {
  jobs: Job[];
  onSelectAsset?: (id: string) => void;
}

const STEPS = [
  { key: 'ingest' },
  { key: 'qc-pre' },
  { key: 'transcode' },
  { key: 'audio' },
  { key: 'proxy' },
  { key: 'thumbnail' },
  { key: 'qc-post' },
  { key: 'delivery' },
];

function getStepIndex(stepKey: string | null): number {
  if (!stepKey) return -1;
  return STEPS.findIndex((s) => s.key === stepKey);
}

function getPhaseStatus(jobs: Job[], stepIdx: number) {
  // Contar jobs que:
  // - completaram esta fase (step > stepIdx ou status done)
  // - estão nesta fase (step === stepIdx e status processing)
  // - falharam nesta fase (status error e step === stepIdx)
  // - estão em quarentena nesta fase (status qc_quarantined e stepIdx === 1)
  let completed = 0;
  let active = 0;
  let failed = 0;
  let quarantined = 0;

  for (const job of jobs) {
    const jobStepIdx = getStepIndex(job.step);

    if (job.status === 'done') {
      completed++;
      continue;
    }

    if (job.status === 'qc_quarantined' && stepIdx === 1) {
      quarantined++;
      continue;
    }

    if (job.status === 'qc_quarantined') {
      // Antes do QC Pré, ainda não chegou
      continue;
    }

    if (job.status === 'error' && jobStepIdx === stepIdx) {
      failed++;
      continue;
    }

    if (job.status === 'error' && jobStepIdx > stepIdx) {
      // Falhou depois desta fase, portanto esta foi completada
      completed++;
      continue;
    }

    if (job.status === 'processing' && jobStepIdx === stepIdx) {
      active++;
      continue;
    }

    if (job.status === 'processing' && jobStepIdx > stepIdx) {
      completed++;
      continue;
    }

    if (['queued', 'cancelled', 'qc_rejected'].includes(job.status)) {
      // Ainda não processou ou não chegou
      if (stepIdx === 0 && job.status === 'queued') {
        // Considerar queued como "pendente no ingest"
      }
      continue;
    }
  }

  return { completed, active, failed, quarantined };
}

function getJobsForPhaseStatus(
  jobs: Job[],
  stepIdx: number,
  filter: 'done' | 'error' | 'active' | 'quarantine',
): Job[] {
  return jobs.filter((job) => {
    const jobStepIdx = getStepIndex(job.step);
    if (filter === 'done') {
      return (
        job.status === 'done' ||
        (job.status === 'error' && jobStepIdx > stepIdx) ||
        (job.status === 'processing' && jobStepIdx > stepIdx)
      );
    }
    if (filter === 'error') return job.status === 'error' && jobStepIdx === stepIdx;
    if (filter === 'active') return job.status === 'processing' && jobStepIdx === stepIdx;
    if (filter === 'quarantine') return job.status === 'qc_quarantined' && stepIdx === 1;
    return false;
  });
}

function PhaseDots({
  stepIdx,
  active,
  completed,
  failed,
  quarantined,
  totalJobs,
}: {
  stepIdx: number;
  active: number;
  completed: number;
  failed: number;
  quarantined: number;
  totalJobs: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((_, idx) => {
        let status: 'pending' | 'done' | 'active' | 'error' | 'quarantine' = 'pending';

        if (idx === stepIdx && active > 0) status = 'active';
        else if (idx === stepIdx && quarantined > 0) status = 'quarantine';
        else if (idx === stepIdx && failed > 0) status = 'error';
        else if (idx < stepIdx || completed > 0) status = 'done';

        // Se não há jobs, tudo pendente
        if (totalJobs === 0) status = 'pending';

        const colorClass = {
          pending: 'bg-surface',
          done: 'bg-green-500',
          active: 'bg-brand animate-pulse',
          error: 'bg-red-500',
          quarantine: 'bg-yellow-500',
        }[status];

        return (
          <div key={idx} className="flex items-center">
            <div className={cn('w-2.5 h-2.5 rounded-full transition-colors', colorClass)} />
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-3 h-0.5',
                  idx < stepIdx || (completed > 0 && status !== 'pending')
                    ? 'bg-green-500/50'
                    : 'bg-surface',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PipelineSummary({ jobs, onSelectAsset }: PipelineSummaryProps) {
  const { t } = useTranslation();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  function toggleExpand(stepKey: string, filter: string) {
    const key = `${stepKey}:${filter}`;
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  const totalJobs = jobs.length;
  const globalQueued = jobs.filter((j) => j.status === 'queued').length;
  const globalProcessing = jobs.filter((j) => j.status === 'processing').length;
  const globalDone = jobs.filter((j) => j.status === 'done').length;

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">
          {t('queue.pipelineSummary')}
        </h3>
        <span className="text-[10px] text-text-muted font-mono">
          {t('queue.totalJobs', { count: totalJobs })}
        </span>
      </div>

      {/* ESTADOS GLOBAIS */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary border border-border rounded-lg">
          <Clock size={12} className="text-text-muted" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            {t('queue.queued')}
          </span>
          <span className="text-xs font-black text-text-primary">{globalQueued}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 border border-brand/20 rounded-lg">
          <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
            {t('queue.processing')}
          </span>
          <span className="text-xs font-black text-text-primary">{globalProcessing}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 size={12} className="text-green-500" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">
            {t('queue.completed')}
          </span>
          <span className="text-xs font-black text-text-primary">{globalDone}</span>
        </div>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const { completed, active, failed, quarantined } = getPhaseStatus(jobs, idx);
          const hasAny = completed > 0 || active > 0 || failed > 0 || quarantined > 0;
          const filterForStep = expandedKey?.startsWith(`${step.key}:`)
            ? (expandedKey.split(':')[1] as 'done' | 'error' | 'active' | 'quarantine')
            : null;
          const expandedJobs = filterForStep ? getJobsForPhaseStatus(jobs, idx, filterForStep) : [];

          return (
            <div key={step.key}>
              <div
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl border transition-colors',
                  filterForStep ? 'rounded-b-none' : '',
                  active > 0
                    ? 'border-brand/30 bg-brand/5'
                    : quarantined > 0
                      ? 'border-yellow-500/30 bg-yellow-500/5'
                      : failed > 0
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-border bg-bg-primary',
                )}
              >
                {/* Número da fase */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                    active > 0
                      ? 'bg-brand text-white'
                      : quarantined > 0
                        ? 'bg-yellow-500 text-black'
                        : failed > 0
                          ? 'bg-red-500 text-white'
                          : completed > 0
                            ? 'bg-green-500 text-white'
                            : 'bg-surface text-text-muted',
                  )}
                >
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary">
                      {t(`pipeline.${step.key}`)}
                    </span>
                    <span className="text-[10px] text-text-muted truncate">
                      {t(`pipeline.${step.key}Desc`)}
                    </span>
                  </div>

                  {/* Indicador visual de 8 bolinhas */}
                  <div className="mt-2">
                    <PhaseDots
                      stepIdx={idx}
                      active={active}
                      completed={completed}
                      failed={failed}
                      quarantined={quarantined}
                      totalJobs={totalJobs}
                    />
                  </div>
                </div>

                {/* Contagens */}
                <div className="flex items-center gap-3 shrink-0 text-[10px] font-bold">
                  {completed > 0 && (
                    <button
                      onClick={() => toggleExpand(step.key, 'done')}
                      title={t('queue.pipeline.expandTooltip')}
                      className="flex items-center gap-1 text-green-500 hover:opacity-70 transition-opacity"
                    >
                      <CheckCircle2 size={12} /> {completed}
                    </button>
                  )}
                  {active > 0 && (
                    <button
                      onClick={() => toggleExpand(step.key, 'active')}
                      title={t('queue.pipeline.expandTooltip')}
                      className="flex items-center gap-1 text-brand hover:opacity-70 transition-opacity"
                    >
                      <Clock size={12} className="animate-pulse" /> {active}
                    </button>
                  )}
                  {quarantined > 0 && (
                    <button
                      onClick={() => toggleExpand(step.key, 'quarantine')}
                      title={t('queue.pipeline.expandTooltip')}
                      className="flex items-center gap-1 text-yellow-500 hover:opacity-70 transition-opacity"
                    >
                      <ShieldAlert size={12} /> {quarantined}
                    </button>
                  )}
                  {failed > 0 && (
                    <button
                      onClick={() => toggleExpand(step.key, 'error')}
                      title={t('queue.pipeline.expandTooltip')}
                      className="flex items-center gap-1 text-red-500 hover:opacity-70 transition-opacity"
                    >
                      <AlertCircle size={12} /> {failed}
                    </button>
                  )}
                  {!hasAny && <span className="text-gray-600">—</span>}
                </div>
              </div>

              {/* Painel expansível com jobs da fase */}
              {filterForStep && (
                <div className="border border-t-0 border-border rounded-b-xl bg-bg-primary overflow-hidden">
                  {expandedJobs.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-text-muted">
                      {t('queue.pipeline.noFilesForStatus')}
                    </div>
                  ) : (
                    expandedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 px-4 py-2 text-xs border-b border-border last:border-0 hover:bg-surface/30 transition-colors"
                      >
                        {filterForStep === 'done' && (
                          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                        )}
                        {filterForStep === 'error' && (
                          <AlertCircle size={12} className="text-red-500 shrink-0" />
                        )}
                        {filterForStep === 'active' && (
                          <Clock size={12} className="text-brand shrink-0 animate-pulse" />
                        )}
                        {filterForStep === 'quarantine' && (
                          <ShieldAlert size={12} className="text-yellow-500 shrink-0" />
                        )}
                        <span
                          className="flex-1 truncate font-mono text-text-primary"
                          title={job.filename ?? job.id}
                        >
                          {job.filename ?? job.id.slice(0, 8)}
                        </span>
                        <span className="text-text-muted shrink-0 text-[10px]">{job.profile}</span>
                        {onSelectAsset && (
                          <button
                            onClick={() => onSelectAsset(job.asset_id)}
                            className="text-brand hover:text-white hover:bg-brand rounded px-1.5 py-0.5 transition-colors shrink-0 text-[11px] font-bold"
                            title={t('queue.viewAsset')}
                          >
                            →
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
