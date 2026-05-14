use crate::state::AppState;
use chrono::Utc;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Job {
    pub id: String,
    pub asset_id: String,
    pub profile: String,
    pub status: String,
    pub priority: i64,
    pub progress: f64,
    pub step: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub error: Option<String>,
    pub output_path: Option<String>,
    pub vmaf_score: Option<f64>,
    pub lufs: Option<f64>,
}

fn row_to_job(row: &Row) -> rusqlite::Result<Job> {
    Ok(Job {
        id: row.get(0)?,
        asset_id: row.get(1)?,
        profile: row.get(2)?,
        status: row.get(3)?,
        priority: row.get(4)?,
        progress: row.get(5)?,
        step: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        started_at: row.get(9)?,
        finished_at: row.get(10)?,
        error: row.get(11)?,
        output_path: row.get(12)?,
        vmaf_score: row.get(13)?,
        lufs: row.get(14)?,
    })
}

const COLS: &str = "id, asset_id, profile, status, priority, progress, step,
                    created_at, updated_at, started_at, finished_at,
                    error, output_path, vmaf_score, lufs";

fn collect_jobs(
    db: &rusqlite::Connection,
    sql: &str,
    param: Option<&str>,
) -> Result<Vec<Job>, String> {
    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let iter = match param {
        Some(p) => stmt.query_map([p], row_to_job),
        None => stmt.query_map([], row_to_job),
    }
    .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<Vec<_>> = iter.collect();
    collected.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn submit_job(
    asset_id: String,
    profile: String,
    priority: Option<i64>,
    state: State<AppState>,
) -> Result<Job, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let priority = priority.unwrap_or(0);

    db.execute(
        "INSERT INTO jobs (id, asset_id, profile, status, priority, progress, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'queued', ?4, 0.0, ?5, ?5)",
        rusqlite::params![id, asset_id, profile, priority, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Job {
        id,
        asset_id,
        profile,
        status: "queued".to_string(),
        priority,
        progress: 0.0,
        step: None,
        created_at: now.clone(),
        updated_at: now,
        started_at: None,
        finished_at: None,
        error: None,
        output_path: None,
        vmaf_score: None,
        lufs: None,
    })
}

#[tauri::command]
pub fn cancel_job(id: String, state: State<AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let rows = db
        .execute(
            "UPDATE jobs SET status = 'cancelled', updated_at = ?1
             WHERE id = ?2 AND status IN ('queued', 'processing')",
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;
    Ok(rows > 0)
}

#[tauri::command]
pub fn get_job_status(id: String, state: State<AppState>) -> Result<Option<Job>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut jobs = collect_jobs(
        &db,
        &format!("SELECT {COLS} FROM jobs WHERE id = ?1"),
        Some(&id),
    )?;
    Ok(jobs.pop())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueStats {
    pub queued: i64,
    pub processing: i64,
    pub done_today: i64,
    pub error_today: i64,
<<<<<<< HEAD
=======
    pub quarantined: i64,
    pub rejected_today: i64,
>>>>>>> dev
}

#[tauri::command]
pub fn get_queue_stats(state: State<AppState>) -> Result<QueueStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let queued: i64 = db
        .query_row("SELECT COUNT(*) FROM jobs WHERE status='queued'", [], |r| r.get(0))
        .unwrap_or(0);
    let processing: i64 = db
        .query_row("SELECT COUNT(*) FROM jobs WHERE status='processing'", [], |r| r.get(0))
        .unwrap_or(0);
    let done_today: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status='done' AND date(finished_at)=date('now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let error_today: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status='error' AND date(updated_at)=date('now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
<<<<<<< HEAD
    Ok(QueueStats { queued, processing, done_today, error_today })
=======
    let quarantined: i64 = db
        .query_row("SELECT COUNT(*) FROM jobs WHERE status='qc_quarantined'", [], |r| r.get(0))
        .unwrap_or(0);
    let rejected_today: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status='qc_rejected' AND date(updated_at)=date('now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Ok(QueueStats { queued, processing, done_today, error_today, quarantined, rejected_today })
>>>>>>> dev
}

#[tauri::command]
pub fn retry_job(id: String, state: State<AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let rows = db
        .execute(
            "UPDATE jobs SET status='queued', progress=0.0, step=NULL, error=NULL,
             started_at=NULL, finished_at=NULL, updated_at=?1
<<<<<<< HEAD
             WHERE id=?2 AND status IN ('error','cancelled')",
=======
             WHERE id=?2 AND status IN ('error','cancelled','qc_rejected')",
>>>>>>> dev
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;
    Ok(rows > 0)
}

<<<<<<< HEAD
=======
#[tauri::command]
pub fn approve_job(id: String, state: State<AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let rows = db
        .execute(
            "UPDATE jobs SET status='queued', progress=0.0, step=NULL, error=NULL,
             started_at=NULL, finished_at=NULL, updated_at=?1
             WHERE id=?2 AND status='qc_quarantined'",
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;
    Ok(rows > 0)
}

#[tauri::command]
pub fn reject_job(id: String, reason: Option<String>, state: State<AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let error_msg = reason.unwrap_or_else(|| "Rejeitado manualmente".to_string());
    let rows = db
        .execute(
            "UPDATE jobs SET status='qc_rejected', error=?1, updated_at=?2
             WHERE id=?3 AND status='qc_quarantined'",
            rusqlite::params![error_msg, now, id],
        )
        .map_err(|e| e.to_string())?;
    Ok(rows > 0)
}

>>>>>>> dev
#[tauri::command]
pub fn list_jobs(asset_id: Option<String>, state: State<AppState>) -> Result<Vec<Job>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    match asset_id.as_deref() {
        Some(aid) => collect_jobs(
            &db,
            &format!("SELECT {COLS} FROM jobs WHERE asset_id = ?1 ORDER BY created_at DESC"),
            Some(aid),
        ),
        None => collect_jobs(
            &db,
            &format!("SELECT {COLS} FROM jobs ORDER BY priority DESC, created_at ASC"),
            None,
        ),
    }
}
