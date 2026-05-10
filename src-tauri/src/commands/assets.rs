use crate::state::AppState;
use chrono::Utc;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub status: String,
    pub size_bytes: Option<i64>,
    pub duration_secs: Option<f64>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub fps: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
    pub metadata: Option<serde_json::Value>,
}

fn row_to_asset(row: &Row) -> rusqlite::Result<Asset> {
    let metadata_str: Option<String> = row.get(13)?;
    Ok(Asset {
        id: row.get(0)?,
        path: row.get(1)?,
        filename: row.get(2)?,
        status: row.get(3)?,
        size_bytes: row.get(4)?,
        duration_secs: row.get(5)?,
        video_codec: row.get(6)?,
        audio_codec: row.get(7)?,
        width: row.get(8)?,
        height: row.get(9)?,
        fps: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        metadata: metadata_str.and_then(|s| serde_json::from_str(&s).ok()),
    })
}

const COLS: &str = "id, path, filename, status, size_bytes, duration_secs,
                    video_codec, audio_codec, width, height, fps,
                    created_at, updated_at, metadata";

fn collect_assets(
    db: &rusqlite::Connection,
    sql: &str,
    param: Option<&str>,
) -> Result<Vec<Asset>, String> {
    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let iter = match param {
        Some(p) => stmt.query_map([p], row_to_asset),
        None => stmt.query_map([], row_to_asset),
    }
    .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<Vec<_>> = iter.collect();
    collected.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ingest_asset(path: String, state: State<AppState>) -> Result<Asset, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let filename = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    let size_bytes = std::fs::metadata(&path).ok().map(|m| m.len() as i64);

    db.execute(
        "INSERT INTO assets (id, path, filename, status, size_bytes, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?5)",
        rusqlite::params![id, path, filename, size_bytes, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Asset {
        id,
        path,
        filename,
        status: "pending".to_string(),
        size_bytes,
        duration_secs: None,
        video_codec: None,
        audio_codec: None,
        width: None,
        height: None,
        fps: None,
        created_at: now.clone(),
        updated_at: now,
        metadata: None,
    })
}

#[tauri::command]
pub fn list_assets(status: Option<String>, state: State<AppState>) -> Result<Vec<Asset>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    match status.as_deref() {
        Some(s) => collect_assets(
            &db,
            &format!("SELECT {COLS} FROM assets WHERE status = ?1 ORDER BY created_at DESC"),
            Some(s),
        ),
        None => collect_assets(
            &db,
            &format!(
                "SELECT {COLS} FROM assets WHERE status != 'deleted' ORDER BY created_at DESC"
            ),
            None,
        ),
    }
}

#[tauri::command]
pub fn delete_asset(id: String, state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let affected = db
        .execute(
            "UPDATE assets SET status = 'deleted', updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err(format!("Asset '{}' não encontrado", id));
    }
    Ok(())
}

#[tauri::command]
pub fn get_asset(id: String, state: State<AppState>) -> Result<Option<Asset>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(&format!("SELECT {COLS} FROM assets WHERE id = ?1"))
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([&id], row_to_asset)
        .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<Vec<_>> = iter.collect();
    let mut rows = collected.map_err(|e| e.to_string())?;
    Ok(rows.pop())
}
