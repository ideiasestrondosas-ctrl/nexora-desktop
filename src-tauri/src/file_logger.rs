use chrono::{Local, NaiveDate};
use std::fs::{self, File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use tauri::Manager;

struct FileLoggerState {
    writer: BufWriter<File>,
    current_date: NaiveDate,
    log_dir: PathBuf,
}

static FILE_LOGGER: OnceLock<Mutex<Option<FileLoggerState>>> = OnceLock::new();

pub fn get_log_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path()
        .local_data_dir()
        .ok()
        .map(|p| p.join("Nexora").join("logs"))
}

pub fn init(app: &tauri::AppHandle) {
    let log_dir = match get_log_dir(app) {
        Some(d) => d,
        None => {
            eprintln!("[file_logger] Não foi possível obter o directório de logs");
            FILE_LOGGER.get_or_init(|| Mutex::new(None));
            return;
        }
    };

    if let Err(e) = fs::create_dir_all(&log_dir) {
        eprintln!("[file_logger] Erro ao criar pasta de logs: {}", e);
        FILE_LOGGER.get_or_init(|| Mutex::new(None));
        return;
    }

    let (retention_days, max_size_mb) = read_retention_settings(app);

    rotate_old_logs(&log_dir);
    enforce_retention(&log_dir, retention_days, max_size_mb);

    let today = Local::now().date_naive();
    let log_path = log_dir.join(format!("nexora-{}.log", today.format("%Y-%m-%d")));

    match OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(file) => {
            FILE_LOGGER.get_or_init(|| {
                Mutex::new(Some(FileLoggerState {
                    writer: BufWriter::new(file),
                    current_date: today,
                    log_dir,
                }))
            });
        }
        Err(e) => {
            eprintln!("[file_logger] Erro ao abrir ficheiro de log: {}", e);
            FILE_LOGGER.get_or_init(|| Mutex::new(None));
        }
    }
}

fn read_retention_settings(app: &tauri::AppHandle) -> (u32, u64) {
    let default = (30u32, 200u64);
    let Ok(data_dir) = app.path().app_data_dir() else {
        return default;
    };
    let db_path = data_dir.join("nexora.db");
    let Ok(conn) = rusqlite::Connection::open(&db_path) else {
        return default;
    };
    let days: u32 = conn
        .query_row(
            "SELECT value FROM settings WHERE key='log_retention_days'",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(30);
    let mb: u64 = conn
        .query_row(
            "SELECT value FROM settings WHERE key='log_max_size_mb'",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(200);
    (days, mb)
}

pub fn write(level: &str, source: &str, message: &str) {
    let Some(mutex) = FILE_LOGGER.get() else {
        return;
    };
    let Ok(mut guard) = mutex.lock() else { return };
    let Some(state) = guard.as_mut() else { return };

    let today = Local::now().date_naive();

    // Roll to a new file when the day changes
    if today != state.current_date {
        let log_dir = state.log_dir.clone();
        rotate_old_logs(&log_dir);
        let new_path = log_dir.join(format!("nexora-{}.log", today.format("%Y-%m-%d")));
        if let Ok(file) = OpenOptions::new().create(true).append(true).open(&new_path) {
            state.writer = BufWriter::new(file);
            state.current_date = today;
        }
    }

    let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let line = format!("{} [{}] {} \u{2014} {}\n", ts, level, source, message);

    if let Err(e) = state.writer.write_all(line.as_bytes()) {
        eprintln!("[file_logger] Erro ao escrever: {}", e);
        return;
    }
    let _ = state.writer.flush();
}

pub fn rotate_old_logs(log_dir: &Path) {
    let today = Local::now().date_naive();

    let Ok(entries) = fs::read_dir(log_dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        if !name.starts_with("nexora-") || !name.ends_with(".log") || name.ends_with(".log.zip") {
            continue;
        }

        // Extract YYYY-MM-DD from "nexora-YYYY-MM-DD.log"
        let date_str = &name[7..name.len() - 4];
        let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") else {
            continue;
        };

        if date >= today {
            continue;
        }

        let Some(parent) = path.parent() else {
            continue;
        };
        let zip_path = parent.join(format!("{}.zip", name));
        match compress_to_zip(&path, &zip_path, name) {
            Ok(()) => {
                if let Err(e) = fs::remove_file(&path) {
                    eprintln!("[file_logger] Erro ao apagar .log após compressão: {}", e);
                }
            }
            Err(e) => {
                eprintln!("[file_logger] Compressão falhou para {}: {}", name, e);
            }
        }
    }
}

fn compress_to_zip(log_path: &Path, zip_path: &Path, entry_name: &str) -> Result<(), String> {
    use zip::write::SimpleFileOptions;
    use zip::CompressionMethod;

    let file = fs::File::create(zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    zip.start_file(entry_name, options)
        .map_err(|e| e.to_string())?;
    let content = fs::read(log_path).map_err(|e| e.to_string())?;
    zip.write_all(&content).map_err(|e| e.to_string())?;
    zip.finish().map_err(|e| e.to_string())?;

    Ok(())
}

pub fn enforce_retention(log_dir: &Path, retention_days: u32, max_size_mb: u64) {
    let today = Local::now().date_naive();
    let max_bytes = max_size_mb * 1024 * 1024;

    let Ok(entries) = fs::read_dir(log_dir) else {
        return;
    };

    let mut files: Vec<(NaiveDate, PathBuf, u64)> = entries
        .flatten()
        .filter_map(|e| {
            let path = e.path();
            let name = path.file_name()?.to_str()?.to_string();
            if !name.starts_with("nexora-") {
                return None;
            }
            let date_str = if name.ends_with(".log.zip") {
                &name[7..name.len() - 8]
            } else if name.ends_with(".log") {
                &name[7..name.len() - 4]
            } else {
                return None;
            };
            let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()?;
            let size = e.metadata().ok()?.len();
            Some((date, path, size))
        })
        .collect();

    // Sort oldest first
    files.sort_by_key(|(d, _, _)| *d);

    let mut total_bytes: u64 = files.iter().map(|(_, _, s)| s).sum();

    for (date, path, size) in &files {
        let age = (today - *date).num_days() as u32;
        if age > retention_days {
            if fs::remove_file(path).is_ok() {
                total_bytes = total_bytes.saturating_sub(*size);
            } else {
                eprintln!(
                    "[file_logger] Não foi possível apagar ficheiro antigo: {:?}",
                    path
                );
            }
        }
    }

    // Enforce size limit (oldest first, skip files already removed)
    for (_, path, size) in &files {
        if total_bytes <= max_bytes {
            break;
        }
        if path.exists() && fs::remove_file(path).is_ok() {
            total_bytes = total_bytes.saturating_sub(*size);
        }
    }
}
