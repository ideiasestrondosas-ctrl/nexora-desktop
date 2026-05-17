import { create } from 'zustand';

export interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
  priority: number;
  progress: number;
  step: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  output_path: string | null;
  vmaf_score: number | null;
  lufs: number | null;
}

interface JobsState {
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  addJob: (job: Job) => void;
  removeJobsByAsset: (assetId: string) => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...updates } : j)),
    })),
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  removeJobsByAsset: (assetId) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.asset_id !== assetId),
    })),
}));
