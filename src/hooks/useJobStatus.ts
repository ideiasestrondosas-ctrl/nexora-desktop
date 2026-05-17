import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useJobsStore, Job } from '@/store/jobs';

interface SidecarEvent {
  type: string;
  jobId?: string;
  progress?: number;
  step?: string;
  error?: string;
  data?: { outputPath?: string; vmafScore?: number; lufs?: number };
}

export function useJobStatus(fallbackIntervalMs: number = 30_000) {
  const { setJobs, updateJob } = useJobsStore();

  // Carga inicial — uma vez ao montar
  useEffect(() => {
    invoke<Job[]>('list_jobs').then(setJobs).catch(console.error);
  }, [setJobs]);

  // Actualizações via eventos do sidecar (sem polling por defeito)
  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      listen<SidecarEvent>('sidecar:event', (e) => {
        const ev = e.payload;
        if (!ev.jobId) return;

        switch (ev.type) {
          case 'job:progress':
            updateJob(ev.jobId, {
              progress: ev.progress ?? 0,
              step: ev.step ?? null,
              status: 'processing',
            });
            break;
          case 'job:completed':
            updateJob(ev.jobId, {
              status: 'done',
              progress: 1,
              output_path: ev.data?.outputPath ?? null,
              vmaf_score: ev.data?.vmafScore ?? null,
              lufs: ev.data?.lufs ?? null,
            });
            break;
          case 'job:failed':
            updateJob(ev.jobId, { status: 'error', error: ev.error ?? null });
            break;
          case 'job:quarantined':
            updateJob(ev.jobId, { status: 'cancelled' });
            break;
          case 'job:started':
            updateJob(ev.jobId, { status: 'processing', progress: 0 });
            break;
        }
      }),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [updateJob]);

  // Fallback — re-sincronização periódica para apanhar mudanças externas
  useEffect(() => {
    const interval = setInterval(() => {
      invoke<Job[]>('list_jobs').then(setJobs).catch(console.error);
    }, fallbackIntervalMs);
    return () => clearInterval(interval);
  }, [setJobs, fallbackIntervalMs]);
}
