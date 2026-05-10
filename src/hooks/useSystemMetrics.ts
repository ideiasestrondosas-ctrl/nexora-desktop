import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export interface SystemMetrics {
  cpuPercent: number;
  memUsedBytes: number;
  memTotalBytes: number;
  netRxBps: number;
  netTxBps: number;
}

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    const promise = listen<SystemMetrics>('system-metrics', (event) => {
      setMetrics(event.payload);
    });
    return () => {
      promise.then((fn) => fn());
    };
  }, []);

  return metrics;
}
