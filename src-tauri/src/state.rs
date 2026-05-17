use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub sidecar_pid: Mutex<Option<u32>>,
    /// Mapa job_id → PID do processo Node.js activo (para kill ao cancelar)
    pub active_pids: Mutex<HashMap<String, u32>>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            db: Mutex::new(db),
            sidecar_pid: Mutex::new(None),
            active_pids: Mutex::new(HashMap::new()),
        }
    }
}
