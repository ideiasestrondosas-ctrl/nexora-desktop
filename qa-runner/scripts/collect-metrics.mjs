import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export class MetricsCollector {
  constructor(runDir) {
    this.runDir = runDir;
    this.rows = [];
    this.startedAt = Date.now();
  }

  sample(label) {
    const total = os.totalmem();
    const free = os.freemem();
    const row = {
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - this.startedAt,
      label,
      load1: os.loadavg()[0],
      memoryTotalBytes: total,
      memoryFreeBytes: free,
      memoryUsedBytes: total - free,
    };
    this.rows.push(row);
    return row;
  }

  writeCsv() {
    const file = path.join(this.runDir, 'metrics.csv');
    const header = 'timestamp,elapsedMs,label,load1,memoryTotalBytes,memoryFreeBytes,memoryUsedBytes\n';
    const body = this.rows
      .map((r) =>
        [
          r.timestamp,
          r.elapsedMs,
          JSON.stringify(r.label),
          r.load1,
          r.memoryTotalBytes,
          r.memoryFreeBytes,
          r.memoryUsedBytes,
        ].join(','),
      )
      .join('\n');
    fs.writeFileSync(file, `${header}${body}${body ? '\n' : ''}`, 'utf8');
    return file;
  }
}

export function summarizeDurations(tests) {
  const durations = tests.map((t) => t.durationMs).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const percentile = (p) => {
    if (durations.length === 0) return 0;
    const index = Math.min(durations.length - 1, Math.floor((p / 100) * durations.length));
    return durations[index];
  };
  const sum = durations.reduce((a, b) => a + b, 0);
  return {
    count: durations.length,
    minMs: durations[0] || 0,
    maxMs: durations[durations.length - 1] || 0,
    avgMs: durations.length ? Math.round(sum / durations.length) : 0,
    p50Ms: percentile(50),
    p90Ms: percentile(90),
    p95Ms: percentile(95),
  };
}
