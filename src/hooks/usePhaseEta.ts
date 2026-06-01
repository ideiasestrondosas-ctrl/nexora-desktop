import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useJobsStore } from '@/store/jobs';

export interface PhaseEtaItem {
  phase: string;
  estimated_ms: number | null;
}

export interface EtaResult {
  hasData: boolean;
  currentPhaseEtaMs: number | null;
  remainingPhases: PhaseEtaItem[];
  totalRemainingMs: number | null;
}

const EMPTY: EtaResult = {
  hasData: false,
  currentPhaseEtaMs: null,
  remainingPhases: [],
  totalRemainingMs: null,
};

interface PhaseEtaResponse {
  has_data: boolean;
  current_phase: string;
  current_phase_eta_ms: number | null;
  remaining_phases: PhaseEtaItem[];
  total_remaining_ms: number | null;
}

export function usePhaseEta(jobId: string | null, isProcessing: boolean): EtaResult {
  const [eta, setEta] = useState<EtaResult>(EMPTY);
  const job = useJobsStore((s) => s.jobs.find((j) => j.id === jobId));
  const lastStep = useRef<string | null>(null);

  useEffect(() => {
    if (!jobId || !isProcessing || !job) {
      setEta(EMPTY);
      lastStep.current = null;
      return;
    }

    const step = job.step ?? null;
    if (step === lastStep.current) return;
    lastStep.current = step;

    invoke<PhaseEtaResponse | null>('get_phase_eta', { jobId })
      .then((res) => {
        if (!res) {
          setEta(EMPTY);
          return;
        }
        setEta({
          hasData: res.has_data,
          currentPhaseEtaMs: res.current_phase_eta_ms,
          remainingPhases: res.remaining_phases,
          totalRemainingMs: res.total_remaining_ms,
        });
      })
      .catch(() => setEta(EMPTY));
  }, [jobId, isProcessing, job, job?.step]);

  return isProcessing ? eta : EMPTY;
}
