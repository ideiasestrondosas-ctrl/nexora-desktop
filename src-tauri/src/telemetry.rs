use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryEvent {
    pub id: String,
    pub event_type: String,
    pub payload_json: Option<String>,
    pub created_at: String,
}

/// Regista um evento de telemetria apenas se telemetria estiver activada.
pub fn record(state: &AppState, event_type: &str, payload: Option<serde_json::Value>) {
    let enabled = state
        .db
        .lock()
        .ok()
        .and_then(|db| {
            db.query_row(
                "SELECT value FROM settings WHERE key = 'telemetry_enabled'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok()
        })
        .map(|v| v == "true")
        .unwrap_or(false);

    if !enabled {
        return;
    }

    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let payload_str = payload.map(|p| p.to_string());

    if let Ok(db) = state.db.lock() {
        let _ = db.execute(
            "INSERT INTO telemetry_events (id, event_type, payload_json, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, event_type, payload_str, created_at],
        );
    }
}

#[tauri::command]
pub fn get_telemetry_events(state: State<AppState>) -> Result<Vec<TelemetryEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, event_type, payload_json, created_at FROM telemetry_events ORDER BY created_at DESC LIMIT 200",
        )
        .map_err(|e| e.to_string())?;
    let rows: Vec<TelemetryEvent> = stmt
        .query_map([], |row| {
            Ok(TelemetryEvent {
                id: row.get(0)?,
                event_type: row.get(1)?,
                payload_json: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn clear_telemetry_events(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute_batch("DELETE FROM telemetry_events")
        .map_err(|e| e.to_string())?;
    Ok(())
}
