use log::{Level, Log, Metadata, Record};
use rusqlite::params;
use serde::Serialize;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex, OnceLock,
};
use tauri::Emitter;

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub id: String,
    pub ts: String,
    pub level: String,
    pub source: String,
    pub message: String,
}

pub struct NexoraLogger;

static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
static LOGGER_DB: OnceLock<Mutex<rusqlite::Connection>> = OnceLock::new();
static LOG_COUNT: AtomicU64 = AtomicU64::new(0);

pub static LOGGER: NexoraLogger = NexoraLogger;

pub fn init(handle: tauri::AppHandle, db_path: &std::path::Path) {
    if let Ok(conn) = rusqlite::Connection::open(db_path) {
        let _ = conn.execute_batch("PRAGMA journal_mode=WAL;");
        LOGGER_DB.set(Mutex::new(conn)).ok();
    }
    APP_HANDLE.set(handle).ok();
    // NexoraLogger é o único logger global — captura info, warn, error do crate Rust
    // tauri-plugin-log foi removido para evitar conflito (só um logger global é permitido)
    log::set_logger(&LOGGER).ok();
    log::set_max_level(log::LevelFilter::Debug);
}

pub fn write(level: &str, source: &str, message: &str) {
    let id = uuid::Uuid::new_v4().to_string();
    let ts = chrono::Utc::now().to_rfc3339();
    let entry = LogEntry {
        id: id.clone(),
        ts: ts.clone(),
        level: level.to_string(),
        source: source.to_string(),
        message: message.to_string(),
    };

    if let Some(db) = LOGGER_DB.get() {
        if let Ok(conn) = db.lock() {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO logs (id, ts, level, source, message) VALUES (?1,?2,?3,?4,?5)",
                params![id, ts, level, source, message],
            );
            // Rotação: mantém apenas as últimas 2000 entradas (a cada 100 escritas)
            let n = LOG_COUNT.fetch_add(1, Ordering::Relaxed);
            if n % 100 == 0 {
                let _ = conn.execute(
                    "DELETE FROM logs WHERE id NOT IN \
                     (SELECT id FROM logs ORDER BY ts DESC LIMIT 2000)",
                    [],
                );
            }
        }
    }

    if let Some(handle) = APP_HANDLE.get() {
        let _ = handle.emit("log-entry", &entry);
    }
}

impl Log for NexoraLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= Level::Debug
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }
        eprintln!("[{}] {} — {}", record.level(), record.target(), record.args());
        write(
            &record.level().to_string(),
            &format!("rust:{}", record.target()),
            &record.args().to_string(),
        );
    }

    fn flush(&self) {}
}
