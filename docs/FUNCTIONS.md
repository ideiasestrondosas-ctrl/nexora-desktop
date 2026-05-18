# Nexora Desktop — Functions Reference

> Technical reference for developers, power users, and integrators. Covers all Tauri IPC commands, sidecar workers, database schema, React hooks, and events.

---

## Table of Contents

1. [Tauri IPC Commands](#1-tauri-ipc-commands)
2. [Sidecar Workers](#2-sidecar-workers)
3. [Database Schema](#3-database-schema)
4. [React Hooks](#4-react-hooks)
5. [Zustand Stores](#5-zustand-stores)
6. [Tauri Events](#6-tauri-events)
7. [FFmpeg Parameters](#7-ffmpeg-parameters)
8. [Type Definitions](#8-type-definitions)

---

## 1. Tauri IPC Commands

All commands are registered in `src-tauri/src/lib.rs` and invoked via `@tauri-apps/api/core`.

### 1.1 Asset Commands (`src-tauri/src/commands/assets.rs`)

#### `ingest_asset`

```rust
fn ingest_asset(path: String) -> Result<Asset, String>
```

Ingests a media file: extracts metadata via ffprobe, computes SHA-256, stores in DB.

**Parameters:**

- `path` — absolute file path

**Returns:** `Asset` object or error string.

**Events emitted:** `log-entry`

---

#### `list_assets`

```rust
fn list_assets() -> Result<Vec<Asset>, String>
```

Returns all non-deleted assets.

**Returns:** Array of `Asset` objects.

---

#### `get_asset`

```rust
fn get_asset(id: String) -> Result<Asset, String>
```

Returns a single asset by ID.

**Parameters:**

- `id` — asset UUID

---

#### `delete_asset`

```rust
fn delete_asset(id: String) -> Result<(), String>
```

Soft-deletes an asset (sets status to `deleted`).

---

### 1.2 Job Commands (`src-tauri/src/commands/jobs.rs`)

#### `submit_job`

```rust
fn submit_job(asset_id: String, profile: String) -> Result<Job, String>
```

Creates a new job and adds it to the queue.

**Parameters:**

- `asset_id` — asset UUID
- `profile` — profile ID string (e.g., "broadcast-hd")

**Returns:** `Job` object.

---

#### `cancel_job`

```rust
fn cancel_job(id: String) -> Result<(), String>
```

Cancels a queued or processing job.

---

#### `get_job_status`

```rust
fn get_job_status(id: String) -> Result<Job, String>
```

Returns current status of a job.

---

#### `list_jobs`

```rust
fn list_jobs() -> Result<Vec<Job>, String>
```

Returns all jobs.

---

#### `get_queue_stats`

```rust
fn get_queue_stats() -> Result<QueueStats, String>
```

Returns aggregate queue statistics.

**Returns:**

```typescript
interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  done: number;
  error: number;
  cancelled: number;
  qc_quarantined: number;
  today: number;
  errors_today: number;
}
```

---

#### `retry_job`

```rust
fn retry_job(id: String) -> Result<Job, String>
```

Re-creates a failed job from the original asset.

---

#### `approve_job`

```rust
fn approve_job(id: String) -> Result<(), String>
```

Approves a quarantined job, moving it back to `queued`.

---

#### `reject_job`

```rust
fn reject_job(id: String) -> Result<(), String>
```

Rejects a quarantined job, setting status to `qc_rejected`.

---

### 1.3 Profile Commands (`src-tauri/src/commands/profiles.rs`)

#### `list_profiles`

```rust
fn list_profiles() -> Result<Vec<Profile>, String>
```

Returns all profiles (system + custom).

---

#### `create_profile`

```rust
fn create_profile(profile: ProfileInput) -> Result<Profile, String>
```

Creates a custom profile.

---

#### `update_profile`

```rust
fn update_profile(id: String, profile: ProfileInput) -> Result<Profile, String>
```

Updates a custom profile. System profiles are immutable.

---

#### `delete_profile`

```rust
fn delete_profile(id: String) -> Result<(), String>
```

Deletes a custom profile.

---

### 1.4 System Commands (`src-tauri/src/commands/system.rs`)

#### `get_installed_info`

```rust
fn get_installed_info() -> Result<InstalledInfo, String>
```

Returns comprehensive system and application info.

**Returns:**

```typescript
interface InstalledInfo {
  appVersion: string;
  ffmpegVersion: string | null;
  nodeVersion: string | null;
  gpu: {
    vendor: string;
    encoder: string;
    available: boolean;
  };
  dbPath: string;
}
```

---

#### `detect_gpu`

```rust
fn detect_gpu() -> Result<GPUInfo, String>
```

Detects GPU vendor and available encoder.

**Detection order:**

1. NVIDIA (nvidia-smi) → NVENC
2. AMD (AMF DLL check) → AMF
3. Intel (QSV DLL check) → QSV
4. None → CPU fallback (libx264)

**Returns:**

```typescript
interface GPUInfo {
  vendor: string; // "NVIDIA" | "AMD" | "Intel" | "None"
  encoder: string; // "NVENC" | "AMF" | "QSV" | "libx264"
  available: boolean;
}
```

---

#### `get_disk_space`

```rust
fn get_disk_space(path: String) -> Result<DiskSpace, String>
```

Returns disk usage for a given path.

**Returns:**

```typescript
interface DiskSpace {
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  used_percent: number;
}
```

---

#### `get_app_version`

```rust
fn get_app_version() -> Result<String, String>
```

Returns the application version string.

---

#### `get_changelog`

```rust
fn get_changelog() -> Result<String, String>
```

Returns the contents of `CHANGELOG.md`.

---

#### `get_stats`

```rust
fn get_stats() -> Result<AppStats, String>
```

Returns database statistics.

**Returns:**

```typescript
interface AppStats {
  db_size_bytes: number;
  asset_count: number;
  job_count: number;
  log_count: number;
}
```

---

#### `get_system_info`

```rust
fn get_system_info() -> Result<SystemInfo, String>
```

Returns detailed OS and hardware information.

**Returns:**

```typescript
interface SystemInfo {
  os: string;
  os_version: string;
  arch: string;
  cpu_model: string;
  cpu_cores: number;
  cpu_threads: number;
  ram_total_bytes: number;
  ram_used_bytes: number;
  disk_type: string;
  disk_total_bytes: number;
  disk_free_bytes: number;
  gpu_vendor: string;
  gpu_encoder: string;
  gpu_available: boolean;
  network_interfaces: string[];
  wifi_ssid: string | null;
}
```

---

#### `get_ffmpeg_info`

```rust
fn get_ffmpeg_info() -> Result<FFmpegInfo, String>
```

Returns FFmpeg and libvmaf version info.

---

#### `get_db_info`

```rust
fn get_db_info() -> Result<DBInfo, String>
```

Returns database path and size.

---

#### `open_data_dir`

```rust
fn open_data_dir() -> Result<(), String>
```

Opens the app's data directory in the OS file manager.

---

#### `exit_app`

```rust
fn exit_app() -> Result<(), String>
```

Gracefully exits the application.

---

#### `factory_reset`

```rust
fn factory_reset() -> Result<(), String>
```

Wipes all data, kills sidecar, clears DB, restarts app.

**WARNING:** Irreversible. Deletes assets, jobs, profiles, logs, settings.

---

### 1.5 Log Commands (`src-tauri/src/commands/logs.rs`)

#### `list_logs`

```rust
fn list_logs(filter: LogFilter) -> Result<Vec<LogEntry>, String>
```

Returns filtered logs.

**Parameters:**

```typescript
interface LogFilter {
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  source?: string;
  search?: string;
  since_hours?: number;
  limit?: number;
}
```

---

#### `clear_logs`

```rust
fn clear_logs() -> Result<(), String>
```

Deletes all log entries.

---

#### `reset_database`

```rust
fn reset_database() -> Result<(), String>
```

Clears data tables (assets, jobs, audit_log) keeping settings and profiles.

---

#### `get_log_stats`

```rust
fn get_log_stats() -> Result<LogStats, String>
```

Returns log count by level.

---

#### `write_log`

```rust
fn write_log(level: String, source: String, message: String) -> Result<(), String>
```

Writes a log entry manually.

---

#### `export_logs`

```rust
fn export_logs(path: String) -> Result<(), String>
```

Exports all logs to a text file.

---

### 1.6 Settings Commands (`src-tauri/src/commands/settings.rs`)

#### `get_settings`

```rust
fn get_settings() -> Result<Settings, String>
```

Returns all settings as key-value pairs.

---

#### `update_settings`

```rust
fn update_settings(settings: Settings) -> Result<(), String>
```

Updates settings.

---

### 1.7 Metrics Commands (`src-tauri/src/commands/metrics.rs`)

#### `get_system_metrics`

```rust
fn get_system_metrics() -> Result<SystemMetrics, String>
```

Returns a one-shot snapshot of CPU and RAM usage.

**Returns:**

```typescript
interface SystemMetrics {
  cpu_percent: number;
  ram_used_bytes: number;
  ram_total_bytes: number;
  network_rx_bps: number;
  network_tx_bps: number;
}
```

---

## 2. Sidecar Workers

The Node.js sidecar (`sidecar/`) runs as a separate process per job. It reads a JSON job definition from stdin and emits JSON-line events to stdout.

### 2.1 Orchestrator (`sidecar/orchestrator/NexoraDesktopOrchestrator.ts`)

Central orchestrator that runs the 8-stage pipeline sequentially.

**Progress weights:**
| Stage | Weight |
|-------|--------|
| Ingest | 5% |
| QC-Pre | 5% |
| Transcode | 50% |
| Audio | 15% |
| Proxy | 10% |
| Thumbnail | 3% |
| QC-Post | 7% |
| Delivery | 5% |

**Event types emitted:**

- `job:started`
- `job:progress` — `{ step, percent, message }`
- `job:completed`
- `job:failed` — `{ step, error }`
- `job:quarantined` — `{ step, reason }`
- `job:status` — `{ status }`
- `asset:updated` — `{ asset }`
- `notification` — `{ title, message, level }`
- `log` — `{ level, source, message }`

---

### 2.2 Ingest Worker (`sidecar/workers/ingest-worker.ts`)

**Input:** `IngestWorkerInput` — `{ filePath }`

**Output:** `IngestWorkerOutput` — `{ sha256, metadata, duration, width, height, fps, videoCodec, audioCodec }`

**Process:**

1. Compute SHA-256 hash of the file
2. Run `ffprobe -v quiet -print_format json -show_streams -show_format`
3. Parse JSON output for metadata
4. Emit `asset:updated` event

---

### 2.3 QC-Pre Worker (`sidecar/workers/qc-pre-worker.ts`)

**Input:** `QCPreWorkerInput` — `{ asset, profile }`

**Output:** `QCPreWorkerOutput` — `{ passed, quarantined, reason, checks }`

**Checks:**
| Check | Condition | Action |
|-------|-----------|--------|
| File size | > 100 GB | Error (job fails) |
| File size | > 50 GB | Quarantine |
| Duration | < 0.5s | Error |
| Video stream | Missing | Error |
| Codec | HEVC / ProRes / DNxHD / AV1 | Quarantine |

**Quarantine reason examples:**

- `"File exceeds 50 GB (82.3 GB)"`
- `"Unsupported codec: hevc"`
- `"No video stream detected"`

---

### 2.4 Transcode Worker (`sidecar/workers/transcode-worker.ts`)

**Input:** `TranscodeWorkerInput` — `{ inputPath, outputPath, profile, gpuInfo }`

**Output:** `TranscodeWorkerOutput` — `{ outputPath, duration }`

**GPU selection:**
| Vendor | Encoder | FFmpeg codec |
|--------|---------|-------------|
| NVIDIA | NVENC | `h264_nvenc` |
| AMD | AMF | `h264_amf` |
| Intel | QSV | `h264_qsv` |
| None | CPU | `libx264` |

**FFmpeg arguments (broadcast standard):**

```
-c:v {encoder} -preset {preset} -profile:v {profile} -level {level}
-b:v {bitrate} -r {fps}
-g {fps*2} -keyint_min {fps*2} -sc_threshold 0
-flags +cgop -bf 0
-pix_fmt yuv420p
-movflags +faststart
-c:a copy
-y {outputPath}
```

**Progress parsing:**

- Reads FFmpeg stderr
- Extracts `time=HH:MM:SS.ms` and `fps=X.Y`
- Calculates percent based on output duration / input duration

---

### 2.5 Audio Worker (`sidecar/workers/audio-worker.ts`)

**Input:** `AudioWorkerInput` — `{ inputPath, outputPath, profile }`

**Output:** `AudioWorkerOutput` — `{ outputPath, measuredLufs, appliedGain }`

**2-pass EBU R128 process:**

**Pass 1 — Analysis:**

```
ffmpeg -i {input} -af ebur128=peak=true -f null -
```

Extracts: `I` (integrated LUFS), `Peak` (dBTP)

**Pass 2 — Normalization:**

```
ffmpeg -i {input}
  -af "ebur128=target={targetLufs}:peak={truePeak}:layout= stereo"
  -c:v copy
  {output}
```

**Verification:**

- Re-analyse output LUFS
- Must be within ±1.5 LUFS of target
- If not, retry with adjusted gain

---

### 2.6 Proxy Worker (`sidecar/workers/proxy-worker.ts`)

**Input:** `ProxyWorkerInput` — `{ inputPath, outputPath }`

**Output:** `ProxyWorkerOutput` — `{ outputPath }`

**Settings:**

- Resolution: 960×540
- Preset: `veryfast`
- Bitrate: 800 kbps
- Non-critical: failure does not fail the job

---

### 2.7 Thumbnail Worker (`sidecar/workers/thumbnail-worker.ts`)

**Input:** `ThumbnailWorkerInput` — `{ inputPath, outputPath, duration }`

**Output:** `ThumbnailWorkerOutput` — `{ outputPath }`

**Settings:**

- Seek time: `min(5s, duration / 2)`
- Scale: 640px width (maintaining aspect ratio)
- Format: JPEG
- Non-critical: failure does not fail the job

---

### 2.8 QC-Post Worker (`sidecar/workers/qc-post-worker.ts`)

**Input:** `QCPostWorkerInput` — `{ originalPath, outputPath, profile }`

**Output:** `QCPostWorkerOutput` — `{ vmafScore, sha256, passed }`

**Checks:**

1. Compute SHA-256 of output file
2. Run VMAF via FFmpeg libvmaf filter:
   ```
   ffmpeg -i {output} -i {original}
     -lavfi "libvmaf='model=version=vmaf_v0.6.1:log_path={log}:log_fmt=json'"
     -f null -
   ```
3. Parse VMAF score from JSON log
4. Compare against profile threshold

**Non-critical:** Low VMAF does not fail the job; it's reported only.

---

### 2.9 Delivery Worker (`sidecar/workers/delivery-worker.ts`)

**Input:** `DeliveryWorkerInput` — `{ inputPath, outputDir, filename }`

**Output:** `DeliveryWorkerOutput` — `{ outputPath }`

**Process:**

1. Ensure output directory exists
2. Copy file to output directory
3. If filename exists, append timestamp suffix
4. Emit `job:completed`

---

## 3. Database Schema

SQLite database with WAL mode, foreign keys, busy timeout.

### 3.1 Tables

#### `assets`

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'error', 'deleted')),
  size_bytes INTEGER,
  duration_secs REAL,
  video_codec TEXT,
  audio_codec TEXT,
  width INTEGER,
  height INTEGER,
  fps REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT -- JSON
);
```

#### `jobs`

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  profile TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'done', 'error', 'cancelled', 'qc_quarantined', 'qc_rejected')),
  priority INTEGER DEFAULT 0,
  progress REAL DEFAULT 0,
  step TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  error TEXT,
  output_path TEXT,
  vmaf_score REAL,
  lufs REAL
);
```

#### `settings`

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

#### `audit_log`

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT REFERENCES jobs(id),
  event TEXT NOT NULL,
  data TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `logs`

```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  source TEXT NOT NULL,
  message TEXT NOT NULL
);
```

#### `profiles`

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  container TEXT NOT NULL,
  video_codec TEXT NOT NULL,
  resolution TEXT NOT NULL,
  fps TEXT NOT NULL,
  bitrate_kbps INTEGER NOT NULL,
  vmaf_threshold INTEGER,
  is_system BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Indexes

```sql
CREATE INDEX idx_jobs_asset_id ON jobs(asset_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_audit_job_id ON audit_log(job_id);
CREATE INDEX idx_logs_ts ON logs(ts);
CREATE INDEX idx_logs_level ON logs(level);
```

### 3.3 Default Settings

| Key                     | Default Value    | Description                 |
| ----------------------- | ---------------- | --------------------------- |
| `output_dir`            | `""`             | Output directory path       |
| `max_concurrent_jobs`   | `"2"`            | Max parallel jobs           |
| `gpu_acceleration`      | `"true"`         | Enable GPU encoding         |
| `notifications_enabled` | `"true"`         | System notifications        |
| `theme`                 | `"system"`       | UI theme                    |
| `language`              | `"en"`           | UI language                 |
| `default_profile`       | `"broadcast-hd"` | Default transcoding profile |
| `vmaf_threshold`        | `"85"`           | Minimum VMAF score          |
| `target_lufs`           | `"-23"`          | Audio loudness target       |
| `true_peak`             | `"-1.0"`         | True peak limit (dBTP)      |

---

## 4. React Hooks

### 4.1 `useSystemMetrics`

```typescript
function useSystemMetrics(): SystemMetrics | null;
```

Listens to the `system-metrics` Tauri event (emitted every 2s from Rust).

**Returns:**

```typescript
interface SystemMetrics {
  cpuPercent: number;
  memUsedBytes: number;
  memTotalBytes: number;
  networkRxBps: number;
  networkTxBps: number;
}
```

---

### 4.2 `useGPU`

```typescript
function useGPU(): { gpu: GPUInfo | null; loading: boolean };
```

Invokes `detect_gpu` on mount.

**Returns:** `GPUInfo` object (see §1.4).

---

### 4.3 `useLogs`

```typescript
function useLogs(filter?: LogFilter): {
  logs: LogEntry[];
  stats: LogStats;
  loading: boolean;
  refresh: () => void;
};
```

Fetches logs from DB with optional filtering, listens to `log-entry` events.

---

### 4.4 `useTauriCommand`

```typescript
function useTauriCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): { data: T | null; loading: boolean; error: string | null; invoke: () => void };
```

Generic hook wrapping `invoke<T>()` with loading/error states. Safe fallback when Tauri API is unavailable.

---

### 4.5 `useNotification`

```typescript
function useNotification(): {
  notify: (title: string, message: string) => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
};
```

Wraps Tauri notification plugin. Respects `notificationsEnabled` setting.

---

### 4.6 `useJobStatus`

```typescript
function useJobStatus(): { jobs: Job[]; loading: boolean };
```

Polls `list_jobs` every 1s and updates Zustand store.

---

### 4.7 `useDiskSpace`

```typescript
function useDiskSpace(): {
  usedPercent: number;
  freeGb: number;
  totalGb: number;
};
```

Polls `get_stats` every 10s to calculate disk usage.

---

## 5. Zustand Stores

### 5.1 Settings Store (`src/store/settings.ts`)

```typescript
interface SettingsState {
  outputDir: string;
  maxConcurrentJobs: number;
  gpuAcceleration: boolean;
  notificationsEnabled: boolean;
  theme: 'system' | 'light' | 'dark';
  language: string;
  defaultProfile: string;
  vmafThreshold: number;
  targetLufs: number;
  truePeak: number;

  setOutputDir: (dir: string) => void;
  setMaxConcurrentJobs: (n: number) => void;
  setGpuAcceleration: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  setLanguage: (lang: string) => void;
  setDefaultProfile: (profile: string) => void;
  setVmafThreshold: (threshold: number) => void;
  setTargetLufs: (lufs: number) => void;
  setTruePeak: (peak: number) => void;
}
```

**Persistence:** All settings are persisted to `localStorage`.

---

### 5.2 Assets Store (`src/store/assets.ts`)

```typescript
interface AssetsState {
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
}
```

---

### 5.3 Jobs Store (`src/store/jobs.ts`)

```typescript
interface JobsState {
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
}
```

---

## 6. Tauri Events

Events are emitted from Rust and listened to in the React frontend via `@tauri-apps/api/event`.

### 6.1 `system-metrics`

**Emitter:** Rust background thread (every 2s)

**Payload:** `SystemMetrics` (see §4.1)

**Consumers:** `useSystemMetrics` hook, TopBar gauges

---

### 6.2 `log-entry`

**Emitter:** Rust logger, sidecar stdout

**Payload:** `LogEntry`

```typescript
interface LogEntry {
  id: number;
  ts: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  source: string;
  message: string;
}
```

**Consumers:** LogsPage, useLogs hook, toast notifications (for errors)

---

### 6.3 `job-progress`

**Emitter:** Sidecar stdout

**Payload:**

```typescript
interface JobProgressEvent {
  jobId: string;
  step: string;
  percent: number;
  message: string;
}
```

**Consumers:** QueuePage, jobs store

---

### 6.4 `job-completed`

**Emitter:** Sidecar stdout

**Payload:** `{ jobId: string }`

**Consumers:** QueuePage, DashboardPage, notification system

---

### 6.5 `job-failed`

**Emitter:** Sidecar stdout

**Payload:** `{ jobId: string; error: string }`

**Consumers:** QueuePage, notification system, logs

---

### 6.6 `job-quarantined`

**Emitter:** Sidecar stdout

**Payload:** `{ jobId: string; reason: string }`

**Consumers:** QueuePage, notification system

---

## 7. FFmpeg Parameters

### 7.1 Broadcast-Standard Parameters

Applied to all transcodes:

| Parameter              | Value               | Purpose                               |
| ---------------------- | ------------------- | ------------------------------------- |
| `-g {fps*2}`           | GOP = 2× frame rate | Keyframe interval                     |
| `-keyint_min {fps*2}`  | Minimum GOP         | Consistent keyframes                  |
| `-sc_threshold 0`      | Disable scene cut   | Prevents variable GOP                 |
| `-flags +cgop`         | Closed GOP          | Ensures self-contained segments       |
| `-bf 0`                | No B-frames         | Reduces latency, improves seekability |
| `-pix_fmt yuv420p`     | 4:2:0 chroma        | Maximum compatibility                 |
| `-movflags +faststart` | Web optimisation    | Allows progressive download           |

### 7.2 GPU Encoder Parameters

#### NVIDIA NVENC (`h264_nvenc`)

```
-preset p4 -profile:v high -level 4.1
-rc vbr -cq 23
```

#### AMD AMF (`h264_amf`)

```
-quality quality -profile high -level 4.1
-rc vbr_lat -qp_p 23 -qp_i 23
```

#### Intel QSV (`h264_qsv`)

```
-preset medium -profile high -level 4.1
-global_quality 23
```

#### CPU libx264 (fallback)

```
-preset medium -profile high -level 4.1
-crf 23
```

### 7.3 EBU R128 Audio Parameters

**Analysis:**

```
-af ebur128=peak=true
```

**Normalization:**

```
-af "ebur128=target={lufs}:peak={dbTP}:layout=stereo"
```

### 7.4 VMAF Parameters

```
-lavfi "libvmaf='model=version=vmaf_v0.6.1:log_path={log}:log_fmt=json'"
```

---

## 8. Type Definitions

### 8.1 Core Types

```typescript
// Asset
interface Asset {
  id: string;
  path: string;
  filename: string;
  status: 'pending' | 'processing' | 'done' | 'error' | 'deleted';
  size_bytes: number | null;
  duration_secs: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

// Job
interface Job {
  id: string;
  asset_id: string;
  profile: string;
  status:
    | 'queued'
    | 'processing'
    | 'done'
    | 'error'
    | 'cancelled'
    | 'qc_quarantined'
    | 'qc_rejected';
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

// Profile
interface Profile {
  id: string;
  name: string;
  description: string;
  container: 'mp4' | 'mkv' | 'mov';
  video_codec: 'h264' | 'hevc' | 'av1';
  resolution: string;
  fps: string;
  bitrate_kbps: number;
  vmaf_threshold: number | null;
  is_system: boolean;
  video_settings: {
    preset: string;
    profile: string;
    level: string;
  };
  audio_settings: {
    codec: string;
    bitrate_kbps: number;
    sample_rate: number;
    target_lufs: number;
    true_peak_db: number;
  };
}
```

---

_Last updated: 2026-05-15 for Nexora Desktop v0.17.0_
