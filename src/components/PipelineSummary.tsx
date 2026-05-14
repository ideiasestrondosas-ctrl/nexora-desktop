import { CheckCircle2, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  status: string;
  step: string | null;
  progress: number;
}

interface PipelineSummaryProps {
  jobs: Job[];
}

const STEPS = [
  { key: 'ingest',     label: 'Ingest',    desc: 'Asset inserido na BD com metadados' },
  { key: 'qc-pre',     label: 'QC Pré',    desc: 'Ficheiro validado (tamanho, duração, codec)' },
  { key: 'transcode',  label: 'Transcode', desc: 'Broadcast-hd concluído com FFmpeg bundled' },
  { key: 'audio',      label: 'Áudio',     desc: 'Normalização R128 com LUFS -21.99' },
  { key: 'proxy',      label: 'Proxy',     desc: 'Gerado em 960x540' },
  { key: 'thumbnail',  label: 'Thumbnail', desc: 'Frame aos 5s em 640px' },
  { key: 'qc-post',    label: 'QC Pós',    desc: 'SHA-256 do output verificado + VMAF' },
  { key: 'delivery',   label: 'Delivery',  desc: 'Ficheiros movidos para pasta de saída' },
];

function getStepIndex(stepKey: string | null): number {
  if (!stepKey) return -1;
  return STEPS.findIndex(s => s.key === stepKey);
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

function PhaseDots({ stepIdx, active, completed, failed, quarantined, totalJobs }: {
  stepIdx: number; active: number; completed: number; failed: number; quarantined: number; totalJobs: number;
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
          pending: 'bg-[#1e2433]',
          done: 'bg-green-500',
          active: 'bg-[#1A6FD4] animate-pulse',
          error: 'bg-red-500',
          quarantine: 'bg-yellow-500',
        }[status];

        return (
          <div key={idx} className="flex items-center">
            <div className={cn('w-2.5 h-2.5 rounded-full transition-colors', colorClass)} />
            {idx < STEPS.length - 1 && (
              <div className={cn('w-3 h-0.5', idx < stepIdx || (completed > 0 && status !== 'pending') ? 'bg-green-500/50' : 'bg-[#1e2433]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PipelineSummary({ jobs }: PipelineSummaryProps) {
  const totalJobs = jobs.length;
  const globalQueued = jobs.filter(j => j.status === 'queued').length;
  const globalProcessing = jobs.filter(j => j.status === 'processing').length;
  const globalDone = jobs.filter(j => j.status === 'done').length;

  return (
    <div className="bg-[#141824] border border-[#1e2433] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Resumo do Pipeline</h3>
        <span className="text-[10px] text-gray-600 font-mono">{totalJobs} jobs no total</span>
      </div>

      {/* ESTADOS GLOBAIS */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0d14] border border-[#1e2433] rounded-lg">
          <Clock size={12} className="text-gray-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Em fila</span>
          <span className="text-xs font-black text-white">{globalQueued}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A6FD4]/10 border border-[#1A6FD4]/20 rounded-lg">
          <div className="w-2 h-2 bg-[#1A6FD4] rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-[#1A6FD4] uppercase tracking-wider">A processar</span>
          <span className="text-xs font-black text-white">{globalProcessing}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 size={12} className="text-green-500" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Concluídos</span>
          <span className="text-xs font-black text-white">{globalDone}</span>
        </div>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const { completed, active, failed, quarantined } = getPhaseStatus(jobs, idx);
          const hasAny = completed > 0 || active > 0 || failed > 0 || quarantined > 0;

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-4 p-3 rounded-xl border transition-colors',
                active > 0 ? 'border-[#1A6FD4]/30 bg-[#1A6FD4]/5' :
                quarantined > 0 ? 'border-yellow-500/30 bg-yellow-500/5' :
                failed > 0 ? 'border-red-500/30 bg-red-500/5' :
                'border-[#1e2433] bg-[#0a0d14]'
              )}
            >
              {/* Número da fase */}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                active > 0 ? 'bg-[#1A6FD4] text-white' :
                quarantined > 0 ? 'bg-yellow-500 text-black' :
                failed > 0 ? 'bg-red-500 text-white' :
                completed > 0 ? 'bg-green-500 text-white' :
                'bg-[#1e2433] text-gray-500'
              )}>
                {idx + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{step.label}</span>
                  <span className="text-[10px] text-gray-500 truncate">{step.desc}</span>
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
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 size={12} /> {completed}
                  </span>
                )}
                {active > 0 && (
                  <span className="flex items-center gap-1 text-[#1A6FD4]">
                    <Clock size={12} className="animate-pulse" /> {active}
                  </span>
                )}
                {quarantined > 0 && (
                  <span className="flex items-center gap-1 text-yellow-500">
                    <ShieldAlert size={12} /> {quarantined}
                  </span>
                )}
                {failed > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle size={12} /> {failed}
                  </span>
                )}
                {!hasAny && (
                  <span className="text-gray-600">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
