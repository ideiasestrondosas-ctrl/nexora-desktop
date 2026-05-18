// Registo de actividade do utilizador — persiste no log Tauri e num store in-memory
import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

export type ActivityType = 'click' | 'execute' | 'attempt' | 'navigate';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  type: ActivityType;
  label: string;
  details?: string;
}

interface ActivityLogStore {
  entries: ActivityEntry[];
  addEntry: (entry: ActivityEntry) => void;
}

const MAX_ENTRIES = 500;

export const useActivityLogStore = create<ActivityLogStore>((set) => ({
  entries: [],
  addEntry: (entry) =>
    set((state) => ({
      // Manter máximo de 500 entradas — FIFO
      entries: [entry, ...state.entries].slice(0, MAX_ENTRIES),
    })),
}));

export function logActivity(label: string, type: ActivityType, details?: string): void {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const id = crypto.randomUUID();
  const detailsStr = details ? ` | ${details}` : '';
  const message = `[ACTIVITY] [${timestamp}] ${type} | ${label}${detailsStr}`;

  useActivityLogStore.getState().addEntry({ id, timestamp, type, label, details });

  // Persistir via comando Tauri existente — silencioso se falhar
  invoke('write_log', { level: 'INFO', source: 'activity', message }).catch(() => {
    console.warn(message);
  });
}
