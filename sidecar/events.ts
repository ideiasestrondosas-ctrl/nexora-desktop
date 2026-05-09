export type SidecarEventType =
  | 'ready'
  | 'job:started'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'asset:updated'
  | 'notification';

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
  timestamp: string;
}

export function emit(event: Omit<SidecarEvent, 'timestamp'>): void {
  const full: SidecarEvent = { ...event, timestamp: new Date().toISOString() };
  process.stdout.write(JSON.stringify(full) + '\n');
}
