import { emit } from './events';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export function nxLog(level: LogLevel, source: string, message: string): void {
  emit({ type: 'log', level, source, message } as Parameters<typeof emit>[0]);
}

export function nxInfo(source: string, message: string): void {
  nxLog('INFO', source, message);
}

export function nxWarn(source: string, message: string): void {
  nxLog('WARN', source, message);
}

export function nxError(source: string, message: string): void {
  nxLog('ERROR', source, message);
}
