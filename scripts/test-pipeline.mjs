import Database from 'better-sqlite3';
import { statSync, mkdirSync } from 'fs';
import { basename } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

const dbPath = process.env.APPDATA + '\\com.nexora.desktop\\nexora.db';
const filePath = 'C:\\Dev\\Video_Testes\\big_buck_bunny_1080p_h264.mov';
const outputDir = join(tmpdir(), 'nexora-test-output');

mkdirSync(outputDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

const assetId = randomUUID();
const jobId = randomUUID();
const now = new Date().toISOString();
const stat = statSync(filePath);

db.prepare(
  "INSERT INTO assets (id, path, filename, status, size_bytes, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)",
).run(assetId, filePath, basename(filePath), stat.size, now, now);

db.prepare(
  "INSERT INTO jobs (id, asset_id, profile, status, priority, progress, created_at, updated_at) VALUES (?, ?, 'broadcast-hd', 'queued', 0, 0.0, ?, ?)",
).run(jobId, assetId, now, now);

db.close();

console.log(`Asset: ${assetId}`);
console.log(`Job:   ${jobId}`);
console.log(`Output: ${outputDir}`);
console.log('');
console.log('A lançar sidecar...');

const child = spawn('node', ['sidecar/dist/nexora-sidecar.cjs'], {
  env: {
    ...process.env,
    NEXORA_DB_PATH: dbPath,
    NEXORA_OUTPUT_DIR: outputDir,
  },
  stdio: ['ignore', 'pipe', 'inherit'],
  cwd: 'C:\\Dev\\nexora-desktop',
});

child.stdout.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((l) => l.trim());
  for (const line of lines) {
    try {
      const ev = JSON.parse(line);
      const ts = new Date().toLocaleTimeString();
      console.log(
        `[${ts}] ${ev.type}`,
        ev.jobId ? `job=${ev.jobId.slice(0, 8)}` : '',
        ev.progress ? `${(ev.progress * 100).toFixed(1)}%` : '',
        ev.error || ev.message || ev.step || '',
      );
    } catch {
      console.log(line);
    }
  }
});

// Monitorizar job na DB
const dbMonitor = new Database(dbPath, { readonly: true });
const checkJob = setInterval(() => {
  try {
    const job = dbMonitor
      .prepare('SELECT status, progress, step, error FROM jobs WHERE id = ?')
      .get(jobId);
    if (!job) return;
    const pct = (job.progress * 100).toFixed(1);
    console.log(
      `[DB] status=${job.status} progress=${pct}% step=${job.step || '-'} error=${job.error || '-'}`,
    );
    if (job.status === 'done' || job.status === 'error') {
      console.log('\n=== RESULTADO FINAL ===');
      console.log('Status:', job.status);
      if (job.error) console.log('Erro:', job.error);
      clearInterval(checkJob);
      setTimeout(() => {
        child.kill();
        process.exit(0);
      }, 2000);
    }
  } catch {}
}, 3000);

child.on('exit', (code) => {
  console.log(`Sidecar terminou: exit=${code}`);
  clearInterval(checkJob);
});

// Timeout de segurança: 45 minutos
setTimeout(() => {
  console.log('TIMEOUT — a terminar');
  child.kill();
  process.exit(1);
}, 2_700_000);
