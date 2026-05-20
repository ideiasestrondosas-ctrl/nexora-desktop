import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '@/store/settings';

type EventLevel = 'basic' | 'normal' | 'debug';

function getEventLevel(event: string): EventLevel {
  if (event.startsWith('error:')) return 'basic';
  if (
    event.startsWith('job:started') ||
    event.startsWith('job:completed') ||
    event.startsWith('job:failed')
  )
    return 'basic';
  if (event === 'asset:deleted' || event === 'reset:factory') return 'basic';
  if (event.startsWith('nav:') || event.startsWith('settings:') || event.startsWith('queue:'))
    return 'normal';
  return 'debug';
}

const VERBOSITY_RANK: Record<EventLevel, number> = { basic: 0, normal: 1, debug: 2 };

function shouldLog(eventLevel: EventLevel, configured: EventLevel): boolean {
  return VERBOSITY_RANK[eventLevel] <= VERBOSITY_RANK[configured];
}

export function useActionLog() {
  const verbosity = useSettingsStore((s) => s.logVerbosity);

  const logAction = useCallback(
    (event: string, details?: Record<string, unknown>) => {
      const level = getEventLevel(event);
      if (!shouldLog(level, verbosity)) return;
      invoke('log_user_action', {
        level: level.toUpperCase(),
        event,
        details: details ? JSON.stringify(details) : null,
      }).catch(console.error);
    },
    [verbosity],
  );

  return { logAction };
}
