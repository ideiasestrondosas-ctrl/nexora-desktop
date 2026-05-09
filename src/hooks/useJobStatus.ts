import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useJobsStore, Job } from '@/store/jobs';

export function useJobStatus(intervalMs: number = 1000) {
  const { setJobs } = useJobsStore();

  useEffect(() => {
    
    // We poll even if there are no active jobs to keep the list updated, 
    // but we could optimize this if needed.
    const poll = async () => {
      try {
        const updatedJobs = await invoke<Job[]>('list_jobs');
        setJobs(updatedJobs);
      } catch (err) {
        console.error('Failed to poll jobs:', err);
      }
    };

    const interval = setInterval(poll, intervalMs);
    poll(); // Initial poll

    return () => clearInterval(interval);
  }, [setJobs, intervalMs]);
}
