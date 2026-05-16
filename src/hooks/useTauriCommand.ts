import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback } from 'react';

export function useTauriCommand<T, P extends Record<string, unknown> = Record<string, unknown>>(
  command: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params?: P) => {
      setLoading(true);
      setError(null);
      try {
        const result = await invoke<T>(command, params);
        setData(result);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error(`Erro no comando Tauri [${command}]:`, msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [command],
  );

  return { data, loading, error, execute };
}
