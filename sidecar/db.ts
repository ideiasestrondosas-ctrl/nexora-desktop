import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';

let _db: DB | null = null;

export function openDb(dbPath: string): DB {
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');
  return _db;
}

export function getDb(): DB {
  if (!_db) throw new Error('Base de dados não inicializada');
  return _db;
}

// ── Tipos ──────────────────────────────────────────────────────────

export interface JobRow {
  id: string;
  asset_id: string;
  profile: string;
  status: string;
  priority: number;
  progress: number;
  step: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  output_path: string | null;
  vmaf_score: number | null;
  lufs: number | null;
}

export interface AssetRow {
  id: string;
  path: string;
  filename: string;
  status: string;
  size_bytes: number | null;
  duration_secs: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

// ── Helpers: Jobs ──────────────────────────────────────────────────

export function getQueuedJobs(limit: number): JobRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM jobs WHERE status = 'queued'
       ORDER BY priority DESC, created_at ASC LIMIT ?`
    )
    .all(limit) as JobRow[];
}

export function getRunningJobCount(): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM jobs WHERE status = 'processing'`)
    .get() as { n: number };
  return row.n;
}

export function markJobRunning(jobId: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE jobs SET status = 'processing', started_at = ?, updated_at = ? WHERE id = ?`
    )
    .run(now, now, jobId);
}

export function updateJobProgress(jobId: string, progress: number, step: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE jobs SET progress = ?, step = ?, updated_at = ? WHERE id = ?`)
    .run(progress, step, now, jobId);
}

export function markJobDone(
  jobId: string,
  outputPath: string | null,
  vmafScore: number | null,
  lufs: number | null
): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE jobs SET status = 'done', progress = 1.0, finished_at = ?, updated_at = ?,
       output_path = ?, vmaf_score = ?, lufs = ? WHERE id = ?`
    )
    .run(now, now, outputPath, vmafScore, lufs, jobId);
}

export function markJobFailed(jobId: string, error: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE jobs SET status = 'error', finished_at = ?, updated_at = ?, error = ? WHERE id = ?`
    )
    .run(now, now, error.slice(0, 2000), jobId);
}

// ── Helpers: Assets ────────────────────────────────────────────────

export function getAsset(assetId: string): AssetRow | null {
  return getDb()
    .prepare(`SELECT * FROM assets WHERE id = ?`)
    .get(assetId) as AssetRow | null;
}

export function updateAssetStatus(assetId: string, status: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE assets SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, now, assetId);
}

export function updateAssetFields(
  assetId: string,
  fields: {
    duration_secs?: number | null;
    video_codec?: string | null;
    audio_codec?: string | null;
    width?: number | null;
    height?: number | null;
    fps?: number | null;
    metadata?: string | null;
    status?: string;
  }
): void {
  const now = new Date().toISOString();
  const entries = Object.entries(fields).filter(([k]) => k !== 'updated_at');
  if (entries.length === 0) return;
  const sets = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  getDb()
    .prepare(`UPDATE assets SET ${sets}, updated_at = ? WHERE id = ?`)
    .run(...values, now, assetId);
}

// ── Helpers: Settings ──────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare(`SELECT value FROM settings WHERE key = ?`)
    .get(key) as { value: string } | null;
  return row?.value ?? null;
}

// ── Helpers: Audit ─────────────────────────────────────────────────

export function writeAuditLog(
  jobId: string | null,
  event: string,
  data: unknown
): void {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, job_id, event, data, created_at) VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, jobId, event, JSON.stringify(data), now);
}
