use anyhow::Result;
use rusqlite::Connection;

const SCHEMA: &str = include_str!("schema.sql");

pub fn run(conn: &Connection) -> Result<()> {
    conn.execute_batch(SCHEMA)?;
    migrate_jobs_status_check(conn)?;
    migrate_assets_v2(conn)?;
    migrate_cloud_v1(conn)?;
    migrate_watch_folders_v1(conn)?;
    migrate_telemetry_v1(conn)?;
    migrate_phase_durations_v1(conn)?;
    Ok(())
}

/// Migração v2: adiciona colunas de thumbnail e output ao assets
fn migrate_assets_v2(conn: &Connection) -> Result<()> {
    let existing_cols = get_column_names(conn, "assets")?;
    for col in [
        "thumbnail_path",
        "thumbnail_output_path",
        "output_metadata",
        "output_path",
    ] {
        if !existing_cols.contains(&col.to_string()) {
            conn.execute_batch(&format!("ALTER TABLE assets ADD COLUMN {} TEXT;", col))?;
        }
    }
    Ok(())
}

fn get_column_names(conn: &Connection, table: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let names: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(names)
}

fn migrate_cloud_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS cloud_profiles (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            provider    TEXT NOT NULL
                            CHECK(provider IN ('ftp','sftp','smb','s3','gdrive','icloud')),
            config      TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS job_cloud_destinations (
            job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            profile_id  TEXT NOT NULL REFERENCES cloud_profiles(id) ON DELETE CASCADE,
            status      TEXT NOT NULL DEFAULT 'pending'
                            CHECK(status IN ('pending','uploading','uploaded','failed')),
            error_msg   TEXT,
            uploaded_at TEXT,
            PRIMARY KEY (job_id, profile_id)
        );
        "#,
    )?;

    let existing_cols = get_column_names(conn, "assets")?;
    for col in ["cloud_source_profile", "cloud_source_path"] {
        if !existing_cols.contains(&col.to_string()) {
            conn.execute_batch(&format!("ALTER TABLE assets ADD COLUMN {} TEXT;", col))?;
        }
    }
    Ok(())
}

/// Migração: adiciona suporte para estados 'qc_quarantined' e 'qc_rejected'
/// Como SQLite não permite ALTER TABLE ADD CHECK, recriamos a tabela.
fn migrate_jobs_status_check(conn: &Connection) -> Result<()> {
    // Verificar se a tabela jobs já tem o CHECK constraint (heurística: tentar inserir valor inválido)
    let has_check: bool = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='jobs'",
            [],
            |row| {
                let sql: String = row.get(0)?;
                Ok(sql.contains("qc_quarantined"))
            },
        )
        .unwrap_or(false);

    if has_check {
        return Ok(());
    }

    // Recriar tabela jobs com o schema completo
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS jobs_new (
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
            CHECK (status IN ('queued', 'processing', 'done', 'error', 'cancelled', 'qc_quarantined', 'qc_rejected')),
            FOREIGN KEY (asset_id) REFERENCES assets(id)
        );

        INSERT INTO jobs_new SELECT * FROM jobs;
        DROP TABLE jobs;
        ALTER TABLE jobs_new RENAME TO jobs;

        CREATE INDEX IF NOT EXISTS idx_jobs_asset_id ON jobs(asset_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_status   ON jobs(status);
        "#,
    )?;
    Ok(())
}

fn migrate_watch_folders_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS watch_folders (
            id         TEXT PRIMARY KEY,
            path       TEXT NOT NULL UNIQUE,
            enabled    INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

fn migrate_telemetry_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS telemetry_events (
            id           TEXT PRIMARY KEY,
            event_type   TEXT NOT NULL,
            payload_json TEXT,
            created_at   TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

fn migrate_phase_durations_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS phase_durations (
            id          INTEGER PRIMARY KEY,
            phase       TEXT    NOT NULL,
            width       INTEGER NOT NULL,
            height      INTEGER NOT NULL,
            asset_duration_secs REAL,
            elapsed_ms  INTEGER NOT NULL,
            created_at  TEXT    DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_phase_durations_lookup
            ON phase_durations (phase, width, height);",
    )?;
    Ok(())
}
