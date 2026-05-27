use crate::state::{AppState, WatchCmd};
use chrono::Utc;
use notify::event::ModifyKind;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Instant;
use tauri::{Emitter, State};
use uuid::Uuid;

const VIDEO_EXTS: &[&str] = &[
    "mp4", "mov", "mxf", "avi", "mkv", "webm", "ts", "m2ts", "m4v",
];

/// Ficheiro pendente de ingestão — aguarda estabilidade de tamanho por 3 s.
struct PendingFile {
    size: u64,
    stable_since: Instant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchFolder {
    pub id: String,
    pub path: String,
    pub enabled: bool,
    pub created_at: String,
}

/// Inicia o thread do watcher e devolve o Sender para enviar comandos.
/// Carrega automaticamente as pastas activas da base de dados.
pub fn start(app: tauri::AppHandle, db_path: std::path::PathBuf) -> mpsc::Sender<WatchCmd> {
    let (cmd_tx, cmd_rx) = mpsc::channel::<WatchCmd>();

    std::thread::spawn(move || {
        let (ev_tx, ev_rx) = mpsc::channel::<notify::Result<Event>>();

        let mut watcher = match RecommendedWatcher::new(
            move |res| {
                let _ = ev_tx.send(res);
            },
            Config::default(),
        ) {
            Ok(w) => w,
            Err(e) => {
                log::error!("watch_folders: falha ao criar watcher: {}", e);
                return;
            }
        };

        // id -> path das pastas actualmente vigiadas
        let mut watched: HashMap<String, String> = HashMap::new();

        // Carregar pastas persistidas da DB
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            if let Ok(mut stmt) =
                conn.prepare("SELECT id, path FROM watch_folders WHERE enabled = 1")
            {
                let rows: Vec<(String, String)> = stmt
                    .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
                    .map(|iter| iter.filter_map(|r| r.ok()).collect())
                    .unwrap_or_default();
                for (id, path) in rows {
                    if watcher
                        .watch(Path::new(&path), RecursiveMode::NonRecursive)
                        .is_ok()
                    {
                        watched.insert(id, path);
                    }
                }
            }
        }

        log::info!(
            "watch_folders: thread iniciado, {} pastas activas",
            watched.len()
        );

        // Ficheiros aguardando estabilização de tamanho (path -> PendingFile)
        let mut pending: HashMap<PathBuf, PendingFile> = HashMap::new();
        // Ficheiros já emitidos nesta sessão — evita emissão duplicada
        let mut ingested: HashSet<PathBuf> = HashSet::new();

        let mut shutdown = false;
        loop {
            // Processar comandos sem bloquear
            while let Ok(cmd) = cmd_rx.try_recv() {
                match cmd {
                    WatchCmd::Add { id, path } => {
                        if watcher
                            .watch(Path::new(&path), RecursiveMode::NonRecursive)
                            .is_ok()
                        {
                            watched.insert(id, path);
                        }
                    }
                    WatchCmd::Remove { id } => {
                        if let Some(folder_path) = watched.remove(&id) {
                            let _ = watcher.unwatch(Path::new(&folder_path));
                            // Limpar entradas pending e ingested sob esta pasta
                            pending.retain(|p, _| !p.starts_with(&folder_path));
                            ingested.retain(|p| !p.starts_with(&folder_path));
                        }
                    }
                    WatchCmd::SetEnabled { id, enabled } => {
                        if let Some(path) = watched.get(&id).cloned() {
                            if enabled {
                                let _ =
                                    watcher.watch(Path::new(&path), RecursiveMode::NonRecursive);
                            } else {
                                let _ = watcher.unwatch(Path::new(&path));
                            }
                        }
                    }
                    WatchCmd::Shutdown => {
                        shutdown = true;
                        break;
                    }
                }
            }
            if shutdown {
                break;
            }

            // Processar eventos de ficheiro sem bloquear
            while let Ok(Ok(event)) = ev_rx.try_recv() {
                let is_create = matches!(event.kind, EventKind::Create(_));
                let is_data_modify = matches!(event.kind, EventKind::Modify(ModifyKind::Data(_)));

                if is_create || is_data_modify {
                    for file_path in &event.paths {
                        let is_video = file_path
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(|e| VIDEO_EXTS.contains(&e.to_lowercase().as_str()))
                            .unwrap_or(false);

                        if !is_video {
                            continue;
                        }

                        // Ficheiro já ingerido — não reentrar na fila
                        if ingested.contains(file_path) {
                            continue;
                        }

                        let size = std::fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);

                        if size == 0 {
                            // Ficheiro ainda vazio — ignorar por enquanto
                            continue;
                        }

                        if let Some(entry) = pending.get_mut(file_path) {
                            if entry.size != size {
                                // Tamanho mudou — reiniciar contagem de estabilidade
                                entry.size = size;
                                entry.stable_since = Instant::now();
                            }
                            // Se tamanho igual, stable_since mantém-se — já está a contar
                        } else {
                            pending.insert(
                                file_path.clone(),
                                PendingFile {
                                    size,
                                    stable_since: Instant::now(),
                                },
                            );
                        }
                    }
                } else if matches!(event.kind, EventKind::Remove(_)) {
                    for file_path in &event.paths {
                        pending.remove(file_path);
                        ingested.remove(file_path);
                    }
                }
            }

            // Verificar ficheiros pendentes: estáveis ≥ 3 s e ainda não ingeridos
            let now = Instant::now();
            let ready: Vec<PathBuf> = pending
                .iter()
                .filter(|(path, entry)| {
                    now.duration_since(entry.stable_since).as_secs() >= 3
                        && !ingested.contains(*path)
                })
                .map(|(path, _)| path.clone())
                .collect();

            for file_path in ready {
                let wf_id = watched
                    .iter()
                    .find(|(_, p)| file_path.starts_with(p.as_str()))
                    .map(|(id, _)| id.clone())
                    .unwrap_or_default();

                let _ = app.emit(
                    "watch-folder-file-added",
                    serde_json::json!({
                        "path": file_path.to_string_lossy(),
                        "watchFolderId": wf_id
                    }),
                );
                log::info!(
                    "watch_folders: ficheiro estável, a emitir: {}",
                    file_path.display()
                );

                ingested.insert(file_path.clone());
                pending.remove(&file_path);
            }

            std::thread::sleep(std::time::Duration::from_millis(1000));
        }
    });

    cmd_tx
}

#[tauri::command]
pub fn list_watch_folders(state: State<AppState>) -> Result<Vec<WatchFolder>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, path, enabled, created_at FROM watch_folders ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows: Vec<WatchFolder> = stmt
        .query_map([], |row| {
            Ok(WatchFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                enabled: row.get::<_, i64>(2)? != 0,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn add_watch_folder(path: String, state: State<AppState>) -> Result<WatchFolder, String> {
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "INSERT INTO watch_folders (id, path, enabled, created_at) VALUES (?1, ?2, 1, ?3)",
            params![id, path, created_at],
        )
        .map_err(|e| e.to_string())?;
    }
    // Enviar comando ao watcher thread
    if let Ok(tx) = state.watcher_tx.lock() {
        if let Some(sender) = tx.as_ref() {
            let _ = sender.send(WatchCmd::Add {
                id: id.clone(),
                path: path.clone(),
            });
        }
    }
    Ok(WatchFolder {
        id,
        path,
        enabled: true,
        created_at,
    })
}

#[tauri::command]
pub fn remove_watch_folder(id: String, state: State<AppState>) -> Result<(), String> {
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute("DELETE FROM watch_folders WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
    }
    if let Ok(tx) = state.watcher_tx.lock() {
        if let Some(sender) = tx.as_ref() {
            let _ = sender.send(WatchCmd::Remove { id });
        }
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_watch_folder(
    id: String,
    enabled: bool,
    state: State<AppState>,
) -> Result<(), String> {
    let enabled_int: i64 = if enabled { 1 } else { 0 };
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE watch_folders SET enabled = ?1 WHERE id = ?2",
            params![enabled_int, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Ok(tx) = state.watcher_tx.lock() {
        if let Some(sender) = tx.as_ref() {
            let _ = sender.send(WatchCmd::SetEnabled { id, enabled });
        }
    }
    Ok(())
}
