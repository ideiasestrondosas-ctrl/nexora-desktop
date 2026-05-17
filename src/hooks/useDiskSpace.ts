import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

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

export function useDiskSpace(): DiskSpaceInfo {
  const [stats, setStats] = useState<DiskStats>({ diskFreeBytes: null, diskTotalBytes: null });
  const [isLoading, setIsLoading] = useState(true);

  // Carga inicial via comando (imediata)
  useEffect(() => {
    invoke<{ diskFreeBytes: number | null; diskTotalBytes: number | null }>('get_stats')
      .then((s) => setStats({ diskFreeBytes: s.diskFreeBytes, diskTotalBytes: s.diskTotalBytes }))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Actualizações via evento emitido pelo Rust a cada 10 s
  useEffect(() => {
    const unlisten = listen<DiskStats>('disk-space', (e) => {
      setStats(e.payload);
      setIsLoading(false);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const freeGb = stats.diskFreeBytes != null ? stats.diskFreeBytes / 1024 ** 3 : 0;
  const totalGb = stats.diskTotalBytes != null ? stats.diskTotalBytes / 1024 ** 3 : 0;
  const usedPercent = totalGb > 0 ? ((totalGb - freeGb) / totalGb) * 100 : 0;

  return { usedPercent, freeGb, totalGb, isLoading };
}
