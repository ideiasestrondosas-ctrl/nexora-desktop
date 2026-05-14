use anyhow::Result;
use rusqlite::Connection;

const SCHEMA: &str = include_str!("schema.sql");

pub fn run(conn: &Connection) -> Result<()> {
    conn.execute_batch(SCHEMA)?;
    migrate_jobs_status_check(conn)?;
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
