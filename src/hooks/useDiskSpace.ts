import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DiskStats {
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
}

export interface DiskSpaceInfo {
  usedPercent: number;
  freeGb: number;
  totalGb: number;
  isLoading: boolean;
}

export function useDiskSpace(pollIntervalMs = 10000): DiskSpaceInfo {
  const [stats, setStats] = useState<DiskStats>({ diskFreeBytes: null, diskTotalBytes: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDisk = async () => {
      try {
        const data = await invoke<DiskStats>('get_stats');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch disk stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisk();
    const interval = setInterval(fetchDisk, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  const freeGb = stats.diskFreeBytes != null ? stats.diskFreeBytes / (1024 ** 3) : 0;
  const totalGb = stats.diskTotalBytes != null ? stats.diskTotalBytes / (1024 ** 3) : 0;
  const usedPercent = totalGb > 0 ? ((totalGb - freeGb) / totalGb) * 100 : 0;

  return {
    usedPercent,
    freeGb,
    totalGb,
    isLoading,
  };
}
