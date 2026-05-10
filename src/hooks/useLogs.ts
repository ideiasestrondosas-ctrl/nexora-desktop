import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export interface LogEntry {
  id: string;
  ts: string;
  level: string;
  source: string;
  message: string;
}

export interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

export function useLogs(level?: string, search?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({ total: 0, errors: 0, warnings: 0, info: 0 });
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, s] = await Promise.all([
        invoke<LogEntry[]>('list_logs', { level: level ?? 'all', search: search ?? '', limit: 300 }),
        invoke<LogStats>('get_log_stats'),
      ]);
      setLogs(entries);
      setStats(s);
    } catch {
      // silent — never crash the log viewer
    } finally {
      setLoading(false);
    }
  }, [level, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Insere novas entradas em tempo real via evento Tauri
  useEffect(() => {
    const promise = listen<LogEntry>('log-entry', (event) => {
      const entry = event.payload;
      const matchesLevel = !level || level === 'all' || entry.level === level.toUpperCase();
      const matchesSearch = !search || entry.message.toLowerCase().includes(search.toLowerCase()) || entry.source.toLowerCase().includes(search.toLowerCase());
      if (matchesLevel && matchesSearch) {
        setLogs((prev) => [entry, ...prev].slice(0, 300));
      }
      setStats((prev) => ({
        total: prev.total + 1,
        errors: prev.errors + (entry.level === 'ERROR' ? 1 : 0),
        warnings: prev.warnings + (entry.level === 'WARN' ? 1 : 0),
        info: prev.info + (entry.level === 'INFO' ? 1 : 0),
      }));
    });
    return () => {
      promise.then((fn) => fn());
    };
  }, [level, search]);

  const clearLogs = useCallback(async () => {
    await invoke('clear_logs');
    setLogs([]);
    setStats({ total: 0, errors: 0, warnings: 0, info: 0 });
  }, []);

  return { logs, stats, loading, refresh: fetchLogs, clearLogs };
}
