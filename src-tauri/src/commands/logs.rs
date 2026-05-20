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
    db.execute("DELETE FROM audit_log", [])
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM jobs", [])
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM assets", [])
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM logs", [])
        .map_err(|e| e.to_string())?;

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

use tauri::Manager;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogStorageInfo {
    pub log_dir: String,
    pub total_size_bytes: u64,
    pub file_count: u32,
    pub oldest_file_date: Option<String>,
}

#[tauri::command]
pub async fn get_log_storage_info(app: tauri::AppHandle) -> Result<LogStorageInfo, String> {
    let log_dir = crate::file_logger::get_log_dir(&app)
        .ok_or_else(|| "Não foi possível obter o directório de logs".to_string())?;

    let log_dir_str = log_dir.to_string_lossy().into_owned();

    if !log_dir.exists() {
        return Ok(LogStorageInfo {
            log_dir: log_dir_str,
            total_size_bytes: 0,
            file_count: 0,
            oldest_file_date: None,
        });
    }

    let entries = std::fs::read_dir(&log_dir).map_err(|e| e.to_string())?;

    let mut total_size_bytes = 0u64;
    let mut file_count = 0u32;
    let mut oldest: Option<String> = None;

    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if !name.starts_with("nexora-") {
            continue;
        }
        let date_str = if name.ends_with(".log.zip") {
            &name[7..name.len() - 8]
        } else if name.ends_with(".log") {
            &name[7..name.len() - 4]
        } else {
            continue;
        };
        file_count += 1;
        total_size_bytes += entry.metadata().map(|m| m.len()).unwrap_or(0);
        match &oldest {
            None => oldest = Some(date_str.to_string()),
            Some(current) if date_str < current.as_str() => {
                oldest = Some(date_str.to_string())
            }
            _ => {}
        }
    }

    Ok(LogStorageInfo {
        log_dir: log_dir_str,
        total_size_bytes,
        file_count,
        oldest_file_date: oldest,
    })
}

#[tauri::command]
pub async fn export_logs_bundle(app: tauri::AppHandle) -> Result<String, String> {
    use std::io::Write as IoWrite;
    use zip::write::SimpleFileOptions;
    use zip::CompressionMethod;

    let log_dir = crate::file_logger::get_log_dir(&app)
        .ok_or_else(|| "Não foi possível obter o directório de logs".to_string())?;

    let ts = chrono::Utc::now().format("%Y%m%d%H%M%S").to_string();
    let bundle_name = format!("nexora-logs-{}.zip", ts);
    let bundle_path = std::env::temp_dir().join(&bundle_name);

    let bundle_file = std::fs::File::create(&bundle_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(bundle_file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    let mut added = 0usize;

    if log_dir.exists() {
        let entries = std::fs::read_dir(&log_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
                continue;
            };
            if !name.starts_with("nexora-") {
                continue;
            }
            if !name.ends_with(".log") && !name.ends_with(".log.zip") {
                continue;
            }
            let content = std::fs::read(&path).map_err(|e| e.to_string())?;
            zip.start_file(name, options).map_err(|e| e.to_string())?;
            zip.write_all(&content).map_err(|e| e.to_string())?;
            added += 1;
        }
    }

    if added == 0 {
        zip.start_file("README.txt", options).map_err(|e| e.to_string())?;
        zip.write_all(b"Nenhum ficheiro de log encontrado.\n")
            .map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;

    Ok(bundle_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn clear_log_files(app: tauri::AppHandle) -> Result<(), String> {
    let log_dir = crate::file_logger::get_log_dir(&app)
        .ok_or_else(|| "Não foi possível obter o directório de logs".to_string())?;

    if log_dir.exists() {
        let entries = std::fs::read_dir(&log_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default()
                .to_string();
            if name.starts_with("nexora-") {
                std::fs::remove_file(&path).ok();
            }
        }
    }

    crate::logger::write("INFO", "sistema", "Ficheiros de log apagados pelo utilizador");
    Ok(())
}

#[tauri::command]
pub async fn upload_logs_to_server(
    app: tauri::AppHandle,
    endpoint: String,
) -> Result<String, String> {
    if endpoint.trim().is_empty() {
        return Err("Endpoint não configurado".to_string());
    }

    let bundle_path = export_logs_bundle(app).await?;

    let file_bytes = std::fs::read(&bundle_path).map_err(|e| e.to_string())?;
    let file_name = std::path::Path::new(&bundle_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("nexora-logs.zip")
        .to_string();

    let part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(file_name)
        .mime_str("application/zip")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new().part("logs", part);

    let client = reqwest::Client::new();
    let response = client
        .post(&endpoint)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Servidor inacessível: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Servidor respondeu com {}", response.status()));
    }

    let body = response
        .text()
        .await
        .unwrap_or_else(|_| "OK".to_string());

    std::fs::remove_file(&bundle_path).ok();

    Ok(body)
}

fn verbosity_rank(v: &str) -> u8 {
    match v.to_uppercase().as_str() {
        "BASIC" => 0,
        "NORMAL" => 1,
        "DEBUG" => 2,
        _ => 1,
    }
}

#[tauri::command]
pub fn log_user_action(
    level: String,
    event: String,
    details: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let configured_verbosity = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.query_row(
            "SELECT value FROM settings WHERE key='log_verbosity'",
            [],
            |r| r.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "normal".to_string())
    };

    if verbosity_rank(&level) > verbosity_rank(&configured_verbosity) {
        return Ok(());
    }

    let message = match details {
        Some(d) => format!("{} {}", event, d),
        None => event,
    };

    let log_level = format!("ACTION:{}", level.to_uppercase());
    crate::logger::write(&log_level, "ui", &message);

    Ok(())
}
