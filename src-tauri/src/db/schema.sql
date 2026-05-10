CREATE TABLE IF NOT EXISTS assets (
    id            TEXT PRIMARY KEY,
    path          TEXT NOT NULL,
    filename      TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    size_bytes    INTEGER,
    duration_secs REAL,
    video_codec   TEXT,
    audio_codec   TEXT,
    width         INTEGER,
    height        INTEGER,
    fps           REAL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    metadata      TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT PRIMARY KEY,
    asset_id    TEXT NOT NULL,
    profile     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'queued',
    priority    INTEGER NOT NULL DEFAULT 0,
    progress    REAL NOT NULL DEFAULT 0.0,
    step        TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    started_at  TEXT,
    finished_at TEXT,
    error       TEXT,
    output_path TEXT,
    vmaf_score  REAL,
    lufs        REAL,
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id         TEXT PRIMARY KEY,
    job_id     TEXT,
    event      TEXT NOT NULL,
    data       TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
    id      TEXT PRIMARY KEY,
    ts      TEXT NOT NULL,
    level   TEXT NOT NULL,
    source  TEXT NOT NULL,
    message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    container      TEXT NOT NULL DEFAULT 'mp4',
    video_codec    TEXT NOT NULL,
    resolution     TEXT NOT NULL,
    fps            INTEGER NOT NULL DEFAULT 25,
    bitrate_kbps   INTEGER,
    vmaf_threshold INTEGER NOT NULL DEFAULT 93,
    is_system      INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_asset_id ON jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status   ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_job_id  ON audit_log(job_id);
CREATE INDEX IF NOT EXISTS idx_logs_ts       ON logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level    ON logs(level);
