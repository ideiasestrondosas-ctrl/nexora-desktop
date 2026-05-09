import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback } from 'react';

export function useTauriCommand<T, P = any>(command: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (params?: P) => {
    setLoading(true);
    setError(null);
    try {
      // Safety check for Tauri environment
      if (typeof invoke !== 'function') {
        throw new Error('Tauri API (invoke) não encontrado.');
      }
      const result = await invoke<T>(command, params as any);
      setData(result);
      return result;
    } catch (err: any) {
      const msg = err?.toString() || 'Unknown error';
      setError(msg);
      // We don't throw here to prevent component crashes, 
      // instead we let the component handle the 'error' state
      console.error(`Erro no comando Tauri [${command}]:`, msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [command]);

  return { data, loading, error, execute };
}
