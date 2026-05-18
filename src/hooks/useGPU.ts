import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface GPUInfo {
  vendor: string;
  encoder: string;
  available: boolean;
}

export function useGPU() {
  const [gpu, setGpu] = useState<GPUInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<GPUInfo>('detect_gpu')
      .then(setGpu)
      .catch((err) => {
        console.error('Failed to detect GPU:', err);
        setGpu(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { gpu, loading };
}
