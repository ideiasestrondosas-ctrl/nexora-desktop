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
    pub filename: Option<String>,
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
        filename: row.get(15).ok(),
    })
}

const COLS: &str = "j.id, j.asset_id, j.profile, j.status, j.priority, j.progress, j.step,
                    j.created_at, j.updated_at, j.started_at, j.finished_at,
                    j.error, j.output_path, j.vmaf_score, j.lufs, a.filename";

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
    cloud_profile_ids: Option<Vec<String>>,
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

    let cloud_dest_count = if let Some(ref ids) = cloud_profile_ids {
        for profile_id in ids {
            db.execute(
                "INSERT OR IGNORE INTO job_cloud_destinations (job_id, profile_id, status) VALUES (?1,?2,'pending')",
                rusqlite::params![id, profile_id],
            )
            .map_err(|e| e.to_string())?;
        }
        ids.len()
    } else {
        0
    };

    crate::logger::write(
        "INFO",
        "jobs",
        &format!(
            "Job {} submetido — asset: {}, perfil: {}, destinos_cloud: {}",
            id, asset_id, profile, cloud_dest_count
        ),
    );

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
        filename: None,
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

    if rows > 0 {
        crate::logger::write(
            "INFO",
            "jobs",
            &format!("Job {} cancelado pelo utilizador", id),
        );

        // Matar o processo Node.js se estiver activo
        if let Ok(mut pids) = state.active_pids.lock() {
            if let Some(pid) = pids.remove(&id) {
                kill_process(pid);
            }
        }
    }
    Ok(rows > 0)
}

fn kill_process(pid: u32) {
    #[cfg(target_os = "windows")]
    {
        // No Windows usar taskkill /F /T para matar o processo e os filhos (FFmpeg)
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        // Unix: SIGTERM ao grupo de processos
        unsafe {
            libc::kill(-(pid as i32), libc::SIGTERM);
        }
    }
}

#[tauri::command]
pub fn get_job_status(id: String, state: State<AppState>) -> Result<Option<Job>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut jobs = collect_jobs(
        &db,
        &format!(
            "SELECT {COLS} FROM jobs j LEFT JOIN assets a ON j.asset_id = a.id WHERE j.id = ?1"
        ),
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
    pub quarantined: i64,
    pub rejected_today: i64,
}

#[tauri::command]
pub fn get_queue_stats(state: State<AppState>) -> Result<QueueStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let queued: i64 = db
        .query_row("SELECT COUNT(*) FROM jobs WHERE status='queued'", [], |r| {
            r.get(0)
        })
        .unwrap_or(0);
    let processing: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status='processing'",
            [],
            |r| r.get(0),
        )
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
    let quarantined: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status='qc_quarantined'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let rejected_today: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM jobs WHERE status='qc_rejected' AND date(updated_at)=date('now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Ok(QueueStats {
        queued,
        processing,
        done_today,
        error_today,
        quarantined,
        rejected_today,
    })
}

#[tauri::command]
pub fn retry_job(id: String, state: State<AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let rows = db
        .execute(
            "UPDATE jobs SET status='queued', progress=0.0, step=NULL, error=NULL,
             started_at=NULL, finished_at=NULL, updated_at=?1
             WHERE id=?2 AND status IN ('error','cancelled','qc_rejected')",
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;
    if rows > 0 {
        crate::logger::write(
            "INFO",
            "jobs",
            &format!("Job {} reprocessado pelo utilizador", id),
        );
    }
    Ok(rows > 0)
}

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
    if rows > 0 {
        crate::logger::write(
            "INFO",
            "jobs",
            &format!("Job {} aprovado pelo utilizador (quarentena)", id),
        );
    }
    Ok(rows > 0)
}

#[tauri::command]
pub fn reject_job(
    id: String,
    reason: Option<String>,
    state: State<AppState>,
) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let error_msg = reason
        .clone()
        .unwrap_or_else(|| "Rejeitado manualmente".to_string());
    let rows = db
        .execute(
            "UPDATE jobs SET status='qc_rejected', error=?1, updated_at=?2
             WHERE id=?3 AND status='qc_quarantined'",
            rusqlite::params![error_msg, now, id],
        )
        .map_err(|e| e.to_string())?;
    if rows > 0 {
        crate::logger::write(
            "INFO",
            "jobs",
            &format!(
                "Job {} rejeitado pelo utilizador: {}",
                id,
                reason.as_deref().unwrap_or("sem razão")
            ),
        );
    }
    Ok(rows > 0)
}

#[tauri::command]
pub fn list_jobs(asset_id: Option<String>, state: State<AppState>) -> Result<Vec<Job>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    match asset_id.as_deref() {
        Some(aid) => collect_jobs(
            &db,
            &format!("SELECT {COLS} FROM jobs j LEFT JOIN assets a ON j.asset_id = a.id \
                      WHERE j.asset_id = ?1 ORDER BY j.created_at DESC"),
            Some(aid),
        ),
        None => collect_jobs(
            &db,
            &format!("SELECT {COLS} FROM jobs j LEFT JOIN assets a ON j.asset_id = a.id \
                      ORDER BY \
                        CASE j.status WHEN 'processing' THEN 0 WHEN 'queued' THEN 1 WHEN 'qc_quarantined' THEN 2 ELSE 3 END ASC, \
                        j.priority DESC, j.updated_at DESC \
                      LIMIT 200"),
            None,
        ),
    }
}

const PHASE_ORDER: &[&str] = &[
    "ingest",
    "qc-pre",
    "transcode",
    "audio",
    "proxy",
    "thumbnail",
    "qc-post",
    "delivery",
];

#[derive(serde::Serialize, Clone)]
pub struct PhaseEtaItem {
    pub phase: String,
    pub estimated_ms: Option<i64>,
}

#[derive(serde::Serialize)]
pub struct PhaseEtaResponse {
    pub has_data: bool,
    pub current_phase: String,
    pub current_phase_eta_ms: Option<i64>,
    pub remaining_phases: Vec<PhaseEtaItem>,
    pub total_remaining_ms: Option<i64>,
}

#[tauri::command]
pub fn get_phase_eta(
    job_id: String,
    state: State<AppState>,
) -> Result<Option<PhaseEtaResponse>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Obter step actual + dimensões do asset
    let row: Option<(String, Option<i64>, Option<i64>, Option<f64>)> = db
        .query_row(
            "SELECT j.step, a.width, a.height, a.duration_secs
             FROM jobs j LEFT JOIN assets a ON j.asset_id = a.id
             WHERE j.id = ?1 AND j.status = 'processing'",
            [&job_id],
            |r| {
                Ok((
                    r.get::<_, String>(0).unwrap_or_default(),
                    r.get::<_, Option<i64>>(1)?,
                    r.get::<_, Option<i64>>(2)?,
                    r.get::<_, Option<f64>>(3)?,
                ))
            },
        )
        .ok();

    let (current_step, width, height, duration_secs) = match row {
        Some(r) => r,
        None => return Ok(None),
    };

    let current_idx = PHASE_ORDER
        .iter()
        .position(|&p| p == current_step.as_str())
        .unwrap_or(0);

    let mut has_data = false;
    let mut items: Vec<PhaseEtaItem> = Vec::new();

    for &phase in &PHASE_ORDER[current_idx..] {
        let avg_ms: Option<i64> = match (width, height) {
            (Some(w), Some(h)) => {
                // Tentar com tolerância de duração (±30%)
                let with_dur = if let Some(dur) = duration_secs {
                    db.query_row(
                        "SELECT CAST(AVG(elapsed_ms) AS INTEGER) FROM phase_durations
                         WHERE phase = ?1 AND width = ?2 AND height = ?3
                           AND ABS(asset_duration_secs - ?4) / (?4 + 0.001) < 0.3",
                        rusqlite::params![phase, w, h, dur],
                        |r| r.get::<_, Option<i64>>(0),
                    )
                    .ok()
                    .flatten()
                } else {
                    None
                };
                // Fallback: só resolução
                with_dur.or_else(|| {
                    db.query_row(
                        "SELECT CAST(AVG(elapsed_ms) AS INTEGER) FROM phase_durations
                         WHERE phase = ?1 AND width = ?2 AND height = ?3",
                        rusqlite::params![phase, w, h],
                        |r| r.get::<_, Option<i64>>(0),
                    )
                    .ok()
                    .flatten()
                })
            }
            _ => None,
        };

        if avg_ms.is_some() {
            has_data = true;
        }
        items.push(PhaseEtaItem {
            phase: phase.to_string(),
            estimated_ms: avg_ms,
        });
    }

    let current_phase_eta_ms = items.first().and_then(|i| i.estimated_ms);
    let remaining_phases = if items.len() > 1 {
        items[1..].to_vec()
    } else {
        vec![]
    };
    let total_remaining_ms: Option<i64> = if has_data {
        let sum: i64 = items.iter().filter_map(|i| i.estimated_ms).sum();
        if sum > 0 {
            Some(sum)
        } else {
            None
        }
    } else {
        None
    };

    Ok(Some(PhaseEtaResponse {
        has_data,
        current_phase: current_step,
        current_phase_eta_ms,
        remaining_phases,
        total_remaining_ms,
    }))
}
