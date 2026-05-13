use crate::logger::LogEntry;
use crate::state::AppState;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogStats {
    pub total: i64,
    pub errors: i64,
    pub warnings: i64,
    pub info: i64,
}

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<LogEntry> {
    Ok(LogEntry {
        id: row.get(0)?,
        ts: row.get(1)?,
        level: row.get(2)?,
        source: row.get(3)?,
        message: row.get(4)?,
    })
}

#[tauri::command]
pub fn list_logs(
    state: State<'_, AppState>,
    level: Option<String>,
    search: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<LogEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let cap = limit.unwrap_or(300).min(1000);

    let level_upper = level.map(|l| l.to_uppercase());
    let filter_level = level_upper.as_deref().filter(|l| *l != "ALL");
    let search_pat = search
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| format!("%{}%", s));

    // Nota: cada branch colecta para Vec antes de `stmt` sair do scope
    let entries: Vec<LogEntry> = match (filter_level, search_pat.as_deref()) {
        (Some(l), Some(p)) => {
            let mut stmt = db
                .prepare(
                    "SELECT id,ts,level,source,message FROM logs \
                     WHERE level=?1 AND (message LIKE ?2 OR source LIKE ?2) \
                     ORDER BY ts DESC LIMIT ?3",
                )
                .map_err(|e| e.to_string())?;
            let v: Vec<LogEntry> = stmt
                .query_map(params![l, p, cap], map_row)
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            v
        }
        (Some(l), None) => {
            let mut stmt = db
                .prepare(
                    "SELECT id,ts,level,source,message FROM logs \
                     WHERE level=?1 ORDER BY ts DESC LIMIT ?2",
                )
                .map_err(|e| e.to_string())?;
            let v: Vec<LogEntry> = stmt
                .query_map(params![l, cap], map_row)
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            v
        }
        (None, Some(p)) => {
            let mut stmt = db
                .prepare(
                    "SELECT id,ts,level,source,message FROM logs \
                     WHERE message LIKE ?1 OR source LIKE ?1 \
                     ORDER BY ts DESC LIMIT ?2",
                )
                .map_err(|e| e.to_string())?;
            let v: Vec<LogEntry> = stmt
                .query_map(params![p, cap], map_row)
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            v
        }
        (None, None) => {
            let mut stmt = db
                .prepare(
                    "SELECT id,ts,level,source,message FROM logs \
                     ORDER BY ts DESC LIMIT ?1",
                )
                .map_err(|e| e.to_string())?;
            let v: Vec<LogEntry> = stmt
                .query_map(params![cap], map_row)
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            v
        }
    };

    Ok(entries)
}

#[tauri::command]
pub fn clear_logs(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM logs", [])
        .map_err(|e| e.to_string())?;
    crate::logger::write("INFO", "sistema", "Logs apagados pelo utilizador");
    Ok(())
}

#[tauri::command]
pub fn reset_database(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    // Apagar tabelas de dados mantendo settings e perfis
    db.execute("DELETE FROM audit_log", []).map_err(|e| e.to_string())?;
    db.execute("DELETE FROM jobs", []).map_err(|e| e.to_string())?;
    db.execute("DELETE FROM assets", []).map_err(|e| e.to_string())?;
    db.execute("DELETE FROM logs", []).map_err(|e| e.to_string())?;
    
    crate::logger::write("WARN", "sistema", "Base de dados resetada pelo utilizador");
    Ok(())
}

#[tauri::command]
pub fn get_log_stats(state: State<'_, AppState>) -> Result<LogStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let total: i64 = db
        .query_row("SELECT COUNT(*) FROM logs", [], |r| r.get(0))
        .unwrap_or(0);
    let errors: i64 = db
        .query_row("SELECT COUNT(*) FROM logs WHERE level='ERROR'", [], |r| {
            r.get(0)
        })
        .unwrap_or(0);
    let warnings: i64 = db
        .query_row("SELECT COUNT(*) FROM logs WHERE level='WARN'", [], |r| {
            r.get(0)
        })
        .unwrap_or(0);
    let info: i64 = db
        .query_row("SELECT COUNT(*) FROM logs WHERE level='INFO'", [], |r| {
            r.get(0)
        })
        .unwrap_or(0);
    Ok(LogStats {
        total,
        errors,
        warnings,
        info,
    })
}

#[tauri::command]
pub fn write_log(level: String, source: String, message: String) {
    crate::logger::write(&level.to_uppercase(), &source, &message);
}

#[tauri::command]
pub fn export_logs(path: String, state: State<'_, AppState>) -> Result<(), String> {
    use std::io::Write as IoWrite;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT ts,level,source,message FROM logs ORDER BY ts ASC")
        .map_err(|e| e.to_string())?;

    let lines: Vec<String> = stmt
        .query_map([], |row| {
            let ts: String = row.get(0)?;
            let level: String = row.get(1)?;
            let source: String = row.get(2)?;
            let message: String = row.get(3)?;
            Ok(format!("[{}] [{:<5}] {} — {}", ts, level, source, message))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    for line in &lines {
        writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    }
    Ok(())
}
