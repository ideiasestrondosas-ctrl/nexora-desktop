export type SidecarEventType =
  | 'ready'
  | 'job:started'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'job:quarantined'
  | 'job:status'
  | 'asset:updated'
  | 'notification'
  | 'log';

export interface SidecarEvent {
  type: SidecarEventType;
  jobId?: string;
  assetId?: string;
  step?: string;
  progress?: number;
  error?: string;
  title?: string;
  body?: string;
  data?: unknown;
<<<<<<< HEAD
=======
  status?: string;
>>>>>>> dev
  // Para eventos 'log'
  level?: string;
  source?: string;
  message?: string;
  timestamp: string;
}

export function emit(event: Omit<SidecarEvent, 'timestamp'>): void {
  const full: SidecarEvent = { ...event, timestamp: new Date().toISOString() };
  process.stdout.write(JSON.stringify(full) + '\n');
}
