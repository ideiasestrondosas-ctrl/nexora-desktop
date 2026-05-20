use crate::state::AppState;
use std::collections::HashMap;
use tauri::{Emitter, State};

fn default_output_dir() -> String {
    // Tenta usar a pasta de Vídeos do utilizador; fallback para temp
    #[cfg(target_os = "windows")]
    let base = std::env::var("USERPROFILE").unwrap_or_default();
    #[cfg(not(target_os = "windows"))]
    let base = std::env::var("HOME").unwrap_or_default();

    if !base.is_empty() {
        #[cfg(target_os = "macos")]
        let videos = "Movies";
        #[cfg(not(target_os = "macos"))]
        let videos = "Videos";

        let candidate = std::path::PathBuf::from(&base)
            .join(videos)
            .join("Nexora Output");
        return candidate.to_string_lossy().into_owned();
    }
    std::env::temp_dir()
        .join("nexora-output")
        .to_string_lossy()
        .into_owned()
}

fn default_settings() -> HashMap<String, String> {
    let mut map = HashMap::new();
    map.insert("max_concurrent_jobs".to_string(), "2".to_string());
    map.insert("output_dir".to_string(), default_output_dir());
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
    // Migrar output_dir de paths temporários para o padrão correcto
    let new_default = default_output_dir();
    db.execute(
        "UPDATE settings SET value = ?1 WHERE key = 'output_dir'
         AND (value = '' OR value LIKE '%AppData%Temp%' OR value LIKE '%AppData%Local%Temp%'
              OR value LIKE '%tmp%nexora%' OR value LIKE '%temp%nexora%')",
        rusqlite::params![new_default],
    )?;
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
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    let collected: rusqlite::Result<HashMap<_, _>> = iter.collect();
    collected.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(
    app: tauri::AppHandle,
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
    let _ = app.emit("settings:changed", serde_json::json!({ "key": key, "value": value }));
    Ok(true)
}
