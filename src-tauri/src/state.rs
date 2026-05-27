use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::{
    atomic::AtomicBool,
    Arc, Mutex,
};

pub enum WatchCmd {
    Add { id: String, path: String },
    Remove { id: String },
    SetEnabled { id: String, enabled: bool },
    Shutdown,
}

pub struct AppState {
    pub db: Mutex<Connection>,
    pub sidecar_pid: Mutex<Option<u32>>,
    pub active_pids: Mutex<HashMap<String, u32>>,
    pub watcher_tx: Mutex<Option<std::sync::mpsc::Sender<WatchCmd>>>,
    pub shutdown: Arc<AtomicBool>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            db: Mutex::new(db),
            sidecar_pid: Mutex::new(None),
            active_pids: Mutex::new(HashMap::new()),
            watcher_tx: Mutex::new(None),
            shutdown: Arc::new(AtomicBool::new(false)),
        }
    }
}
