import fs from 'node:fs';
import path from 'node:path';

export class QaLogger {
  constructor(runDir) {
    this.runDir = runDir;
    this.logsDir = path.join(runDir, 'logs');
    fs.mkdirSync(this.logsDir, { recursive: true });
    this.humanLog = path.join(this.logsDir, 'test-run.log');
    this.debugLog = path.join(this.logsDir, 'debug.log');
  }

  line(message) {
    const text = String(message);
    console.log(text);
    fs.appendFileSync(this.humanLog, `${new Date().toISOString()} ${text}\n`, 'utf8');
  }

  debug(message, data = undefined) {
    const payload = data === undefined ? '' : ` ${JSON.stringify(data, null, 2)}`;
    fs.appendFileSync(this.debugLog, `${new Date().toISOString()} ${message}${payload}\n`, 'utf8');
  }

  step(index, total, message) {
    this.line(`[${index}/${total}] ${message}`);
  }

  result(name, status, durationMs, evidence = '') {
    const suffix = evidence ? ` | Evidencia: ${evidence}` : '';
    this.line(`[${status.toUpperCase()}] ${name} (${durationMs}ms)${suffix}`);
  }
}
