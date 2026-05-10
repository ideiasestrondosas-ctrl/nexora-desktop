import { openDb } from './db';
import { NexoraSimpleQueue } from './queue/NexoraSimpleQueue';
import { emit } from './events';
import { nxInfo, nxError } from './logger';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

const dbPath = process.env['NEXORA_DB_PATH'];
if (!dbPath) {
  process.stderr.write('FATAL: NEXORA_DB_PATH não definido\n');
  process.exit(1);
}

// Directório de saída: NEXORA_OUTPUT_DIR ou pasta temp por defeito
const outputDir = process.env['NEXORA_OUTPUT_DIR'] ?? join(tmpdir(), 'nexora-output');
mkdirSync(outputDir, { recursive: true });

try {
  openDb(dbPath);
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`FATAL: não foi possível abrir a base de dados: ${message}\n`);
  process.exit(1);
}

const queue = new NexoraSimpleQueue(outputDir);

// Sinais de terminação limpa
process.on('SIGTERM', () => {
  nxInfo('sidecar', 'Sidecar a terminar (SIGTERM)');
  queue.stop();
  process.exit(0);
});
process.on('SIGINT', () => {
  nxInfo('sidecar', 'Sidecar a terminar (SIGINT)');
  queue.stop();
  process.exit(0);
});

// Erros não capturados — emitir evento antes de terminar
process.on('uncaughtException', (err) => {
  nxError('sidecar', `Excepção não capturada: ${err.message}`);
  emit({ type: 'job:failed', error: err.message });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  nxError('sidecar', `Promise rejeitada: ${message}`);
  emit({ type: 'job:failed', error: message });
  process.exit(1);
});

nxInfo('sidecar', `Sidecar Node.js iniciado — DB: ${dbPath}`);
queue.start();
