use crate::state::AppState;
use std::collections::HashMap;
use tauri::State;

fn default_settings() -> HashMap<String, String> {
    let mut map = HashMap::new();
    map.insert("max_concurrent_jobs".to_string(), "2".to_string());
    map.insert(
        "output_dir".to_string(),
        std::env::temp_dir().join("nexora-output").to_string_lossy().into_owned(),
    );
    map.insert("watch_dir".to_string(), "".to_string());
    map.insert("auto_ingest".to_string(), "false".to_string());
    map.insert("notifications_enabled".to_string(), "true".to_string());
    map.insert("theme".to_string(), "system".to_string());
    map
}

fn ensure_defaults(db: &rusqlite::Connection) -> rusqlite::Result<()> {
    for (key, value) in default_settings() {
        db.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<HashMap<String, String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    ensure_defaults(&db).map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<HashMap<_, _>> = iter.collect();
    collected.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(
    key: String,
    value: String,
    state: State<AppState>,
) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}
