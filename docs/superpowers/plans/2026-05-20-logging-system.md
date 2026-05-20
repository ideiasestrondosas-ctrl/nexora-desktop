# Logging System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dual-channel logging system (SQLite + daily rotating files), configurable verbosity for UI action logging, and a new Settings "Logs" tab with send-to-developer functionality.

**Architecture:** A new `file_logger.rs` module writes all Rust log entries to daily `.log` files (in addition to the existing SQLite channel). A React hook `useActionLog` captures UI actions and sends them via `log_user_action` Tauri command. A new "Logs" settings tab exposes verbosity, retention controls, and send buttons.

**Tech Stack:** Rust (`zip` crate for compression, `reqwest` for upload), React 19 + TypeScript, Zustand, Tauri 2 commands.

**Spec:** `docs/superpowers/specs/2026-05-20-logging-system-design.md`

---

## File Map

| File                                 | Operation | Responsibility                                                                                                                  |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/Cargo.toml`               | Modify    | Add `zip = "2"` and `reqwest = { version = "0.12", features = ["multipart"] }`                                                  |
| `src-tauri/src/file_logger.rs`       | Create    | Daily log file writer, rotation (zip compression), retention enforcement                                                        |
| `src-tauri/src/logger.rs`            | Modify    | Add `crate::file_logger::write()` call at end of `write()`                                                                      |
| `src-tauri/src/lib.rs`               | Modify    | Add `mod file_logger;`, `file_logger::init()` in setup, 5 new commands in handler                                               |
| `src-tauri/src/commands/logs.rs`     | Modify    | Add 5 new commands: `get_log_storage_info`, `export_logs_bundle`, `clear_log_files`, `upload_logs_to_server`, `log_user_action` |
| `src-tauri/src/commands/settings.rs` | Modify    | Add 4 log settings to `default_settings()`                                                                                      |
| `src/store/settings.ts`              | Modify    | Add `logVerbosity`, `logRetentionDays`, `logMaxSizeMb`, `logUploadEndpoint`                                                     |
| `src/hooks/useActionLog.ts`          | Create    | React hook for UI action logging with verbosity filtering                                                                       |
| `src/pages/SettingsPage.tsx`         | Modify    | Add 'logs' tab with verbosity, storage info, retention, send controls                                                           |
| `src/App.tsx`                        | Modify    | Add global Debug click listener using `useActionLog`                                                                            |

---

### Task 1: Add Cargo dependencies

**Files:**

- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add `zip` and `reqwest` to `[dependencies]`**

  In `src-tauri/Cargo.toml`, after the `walkdir = "2"` line, add:

  ```toml
  zip = "2"
  reqwest = { version = "0.12", features = ["multipart"] }
  ```

- [ ] **Step 2: Verify compilation**

  ```powershell
  cd src-tauri && cargo check 2>&1 | tail -5
  ```

  Expected: `Finished` with no errors. (First run may take time to download crates.)

- [ ] **Step 3: Commit**

  ```powershell
  git add src-tauri/Cargo.toml src-tauri/Cargo.lock
  git commit -m "build(deps): add zip and reqwest for logging system"
  ```

---

### Task 2: Create file_logger.rs

**Files:**

- Create: `src-tauri/src/file_logger.rs`

- [ ] **Step 1: Create the file with full implementation**

  Create `src-tauri/src/file_logger.rs`:

  ```rust
  use chrono::{Local, NaiveDate};
  use std::fs::{self, File, OpenOptions};
  use std::io::{BufWriter, Write};
  use std::path::{Path, PathBuf};
  use std::sync::{Mutex, OnceLock};

  struct FileLoggerState {
      writer: BufWriter<File>,
      current_date: NaiveDate,
      log_dir: PathBuf,
  }

  static FILE_LOGGER: OnceLock<Mutex<Option<FileLoggerState>>> = OnceLock::new();

  pub fn get_log_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
      app.path().local_data_dir().ok().map(|p| p.join("logs"))
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

          if !name.starts_with("nexora-") || !name.ends_with(".log") || name.ends_with(".log.zip")
          {
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

          let zip_path = path.parent().unwrap().join(format!("{}.zip", name));
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
      let options =
          SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

      zip.start_file(entry_name, options).map_err(|e| e.to_string())?;
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
                  eprintln!("[file_logger] Não foi possível apagar ficheiro antigo: {:?}", path);
              }
          }
      }

      // Enforce size limit (oldest first, skip files already removed)
      for (_, path, size) in &files {
          if total_bytes <= max_bytes {
              break;
          }
          if path.exists() {
              if fs::remove_file(path).is_ok() {
                  total_bytes = total_bytes.saturating_sub(*size);
              }
          }
      }
  }
  ```

- [ ] **Step 2: Verify the file compiles in isolation**

  Add `mod file_logger;` temporarily to `lib.rs` (Step 3 will do this permanently) and run:

  ```powershell
  cd src-tauri && cargo check 2>&1 | grep -E "error|warning.*file_logger"
  ```

  Expected: no errors (warnings about unused are acceptable before integration).

---

### Task 3: Integrate file_logger into lib.rs and logger.rs

**Files:**

- Modify: `src-tauri/src/lib.rs:3` (add mod declaration)
- Modify: `src-tauri/src/lib.rs:32` (add init call after logger::init)
- Modify: `src-tauri/src/logger.rs:70` (add file_logger::write call)

- [ ] **Step 1: Add `mod file_logger;` to lib.rs**

  In `src-tauri/src/lib.rs`, add after `mod logger;` (line 3):

  ```rust
  mod file_logger;
  ```

  The top of lib.rs should now read:

  ```rust
  mod commands;
  mod db;
  mod file_logger;
  mod logger;
  mod queue;
  mod sidecar;
  mod state;
  mod tray;
  ```

- [ ] **Step 2: Call `file_logger::init()` in setup()**

  In `src-tauri/src/lib.rs`, after the `logger::init(...)` call (line 32), add:

  ```rust
  file_logger::init(app.handle());
  ```

  The block should look like:

  ```rust
  // Logger personalizado: escreve na DB + emite eventos Tauri
  logger::init(app.handle().clone(), &db_path);
  file_logger::init(app.handle());
  log::info!("Nexora Desktop v{} a arrancar", env!("CARGO_PKG_VERSION"));
  ```

- [ ] **Step 3: Add file_logger::write() at end of logger::write()**

  In `src-tauri/src/logger.rs`, at the end of the `pub fn write()` function, after the `handle.emit(...)` block (after line 70, before closing `}`), add:

  ```rust
  crate::file_logger::write(level, source, message);
  ```

  The end of `pub fn write()` should look like:

  ```rust
      if let Some(handle) = APP_HANDLE.get() {
          let _ = handle.emit("log-entry", &entry);
      }

      crate::file_logger::write(level, source, message);
  }
  ```

- [ ] **Step 4: Verify compilation**

  ```powershell
  cd src-tauri && cargo check 2>&1 | tail -5
  ```

  Expected: `Finished` with no errors.

- [ ] **Step 5: Commit**

  ```powershell
  git add src-tauri/src/lib.rs src-tauri/src/logger.rs src-tauri/src/file_logger.rs
  git commit -m "feat(logging): add file_logger — dual-channel write to daily rotating files"
  ```

---

### Task 4: Add 5 new commands to commands/logs.rs

**Files:**

- Modify: `src-tauri/src/commands/logs.rs`

Add the following to the END of `src-tauri/src/commands/logs.rs`.

- [ ] **Step 1: Add imports and LogStorageInfo struct**

  At the TOP of `commands/logs.rs`, add these imports after the existing ones:

  ```rust
  use tauri::Manager;
  ```

  Then add the struct before the new commands:

  ```rust
  #[derive(Debug, serde::Serialize)]
  #[serde(rename_all = "camelCase")]
  pub struct LogStorageInfo {
      pub log_dir: String,
      pub total_size_bytes: u64,
      pub file_count: u32,
      pub oldest_file_date: Option<String>,
  }
  ```

- [ ] **Step 2: Add `get_log_storage_info`**

  ```rust
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
  ```

- [ ] **Step 3: Add `export_logs_bundle`**

  ```rust
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

      let bundle_file =
          std::fs::File::create(&bundle_path).map_err(|e| e.to_string())?;
      let mut zip = zip::ZipWriter::new(bundle_file);
      let options =
          SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

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
          // Add a README so the zip is never empty
          zip.start_file("README.txt", options).map_err(|e| e.to_string())?;
          zip.write_all(b"Nenhum ficheiro de log encontrado.\n")
              .map_err(|e| e.to_string())?;
      }

      zip.finish().map_err(|e| e.to_string())?;

      Ok(bundle_path.to_string_lossy().into_owned())
  }
  ```

- [ ] **Step 4: Add `clear_log_files`**

  ```rust
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
  ```

- [ ] **Step 5: Add `upload_logs_to_server`**

  ```rust
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
  ```

- [ ] **Step 6: Add `log_user_action`**

  ```rust
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
      // Read configured verbosity from settings DB
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
  ```

- [ ] **Step 7: Verify compilation**

  ```powershell
  cd src-tauri && cargo check 2>&1 | tail -5
  ```

  Expected: `Finished` with no errors.

- [ ] **Step 8: Commit**

  ```powershell
  git add src-tauri/src/commands/logs.rs
  git commit -m "feat(logging): add get_log_storage_info, export_logs_bundle, clear_log_files, upload_logs_to_server, log_user_action commands"
  ```

---

### Task 5: Register new commands + add setting defaults

**Files:**

- Modify: `src-tauri/src/lib.rs` (invoke_handler)
- Modify: `src-tauri/src/commands/settings.rs` (default_settings)

- [ ] **Step 1: Register 5 new commands in invoke_handler**

  In `src-tauri/src/lib.rs`, in the `invoke_handler![]` macro, after `commands::logs::export_logs,` add:

  ```rust
  commands::logs::get_log_storage_info,
  commands::logs::export_logs_bundle,
  commands::logs::clear_log_files,
  commands::logs::upload_logs_to_server,
  commands::logs::log_user_action,
  ```

- [ ] **Step 2: Add log setting defaults to `default_settings()`**

  In `src-tauri/src/commands/settings.rs`, inside `fn default_settings()`, after the `"theme"` entry, add:

  ```rust
  map.insert("log_verbosity".to_string(), "normal".to_string());
  map.insert("log_retention_days".to_string(), "30".to_string());
  map.insert("log_max_size_mb".to_string(), "200".to_string());
  map.insert("log_upload_endpoint".to_string(), "".to_string());
  ```

- [ ] **Step 3: Verify compilation**

  ```powershell
  cd src-tauri && cargo check 2>&1 | tail -5
  ```

  Expected: `Finished` with no errors.

- [ ] **Step 4: Commit**

  ```powershell
  git add src-tauri/src/lib.rs src-tauri/src/commands/settings.rs
  git commit -m "feat(logging): register log commands and add settings defaults"
  ```

---

### Task 6: Add log settings to Zustand store

**Files:**

- Modify: `src/store/settings.ts`

- [ ] **Step 1: Add log settings to SettingsState interface**

  In `src/store/settings.ts`, add to the `SettingsState` interface after `showProfileModal`:

  ```typescript
  logVerbosity: 'basic' | 'normal' | 'debug';
  logRetentionDays: number;
  logMaxSizeMb: number;
  logUploadEndpoint: string;
  setLogVerbosity: (v: 'basic' | 'normal' | 'debug') => void;
  setLogRetentionDays: (days: number) => void;
  setLogMaxSizeMb: (mb: number) => void;
  setLogUploadEndpoint: (url: string) => void;
  ```

- [ ] **Step 2: Add defaults and actions to the `create` call**

  In the `persist((set) => ({` block, after `setShowProfileModal: (show) => set({ showProfileModal: show }),` add:

  ```typescript
  logVerbosity: 'normal',
  logRetentionDays: 30,
  logMaxSizeMb: 200,
  logUploadEndpoint: '',
  setLogVerbosity: (v) => set({ logVerbosity: v }),
  setLogRetentionDays: (days) => set({ logRetentionDays: days }),
  setLogMaxSizeMb: (mb) => set({ logMaxSizeMb: mb }),
  setLogUploadEndpoint: (url) => set({ logUploadEndpoint: url }),
  ```

- [ ] **Step 3: Verify TypeScript compilation**

  ```powershell
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```powershell
  git add src/store/settings.ts
  git commit -m "feat(logging): add log settings to Zustand store"
  ```

---

### Task 7: Create useActionLog hook

**Files:**

- Create: `src/hooks/useActionLog.ts`

- [ ] **Step 1: Create the hook**

  Create `src/hooks/useActionLog.ts`:

  ```typescript
  import { useCallback } from 'react';
  import { invoke } from '@tauri-apps/api/core';
  import { useSettingsStore } from '@/store/settings';

  type EventLevel = 'basic' | 'normal' | 'debug';

  function getEventLevel(event: string): EventLevel {
    if (event.startsWith('error:')) return 'basic';
    if (
      event.startsWith('job:started') ||
      event.startsWith('job:completed') ||
      event.startsWith('job:failed')
    )
      return 'basic';
    if (event === 'asset:deleted' || event === 'reset:factory') return 'basic';
    if (event.startsWith('nav:') || event.startsWith('settings:') || event.startsWith('queue:'))
      return 'normal';
    // button:*, modal:*, input:* and everything else
    return 'debug';
  }

  const VERBOSITY_RANK: Record<EventLevel, number> = { basic: 0, normal: 1, debug: 2 };

  function shouldLog(eventLevel: EventLevel, configured: EventLevel): boolean {
    return VERBOSITY_RANK[eventLevel] <= VERBOSITY_RANK[configured];
  }

  export function useActionLog() {
    const verbosity = useSettingsStore((s) => s.logVerbosity);

    const logAction = useCallback(
      (event: string, details?: Record<string, unknown>) => {
        const level = getEventLevel(event);
        if (!shouldLog(level, verbosity)) return;
        invoke('log_user_action', {
          level: level.toUpperCase(),
          event,
          details: details ? JSON.stringify(details) : null,
        }).catch(console.error);
      },
      [verbosity],
    );

    return { logAction };
  }
  ```

- [ ] **Step 2: Verify TypeScript compilation**

  ```powershell
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```powershell
  git add src/hooks/useActionLog.ts
  git commit -m "feat(logging): add useActionLog hook with verbosity filtering"
  ```

---

### Task 8: Add Logs tab to SettingsPage.tsx

**Files:**

- Modify: `src/pages/SettingsPage.tsx`

The SettingsPage has many changes. Make them in the following precise order.

- [ ] **Step 1: Add `LogStorageInfo` interface**

  After the `TempInfo` interface (after line 114), add:

  ```typescript
  interface LogStorageInfo {
    logDir: string;
    totalSizeBytes: number;
    fileCount: number;
    oldestFileDate: string | null;
  }
  ```

- [ ] **Step 2: Add log fields to `Settings` interface**

  In the `Settings` interface, after `target_lufs: number;`, add:

  ```typescript
  log_verbosity: 'basic' | 'normal' | 'debug';
  log_retention_days: number;
  log_max_size_mb: number;
  log_upload_endpoint: string;
  ```

- [ ] **Step 3: Add 'logs' to SettingsTab type**

  Replace line 116:

  ```typescript
  type SettingsTab = 'general' | 'interface' | 'system' | 'advanced' | 'about';
  ```

  with:

  ```typescript
  type SettingsTab = 'general' | 'interface' | 'system' | 'logs' | 'advanced' | 'about';
  ```

- [ ] **Step 4: Add log state variables**

  In the component, after the `clearingThumbs` state (around line 151), add:

  ```typescript
  const [logInfo, setLogInfo] = useState<LogStorageInfo | null>(null);
  const [logInfoLoading, setLogInfoLoading] = useState(false);
  ```

- [ ] **Step 5: Load log verbosity in initial useEffect**

  In the `get_settings` `.then()` handler (around line 157), after the `settingsStore.setTheme(...)` call, add:

  ```typescript
  if (backendSettings.log_verbosity)
    settingsStore.setLogVerbosity(backendSettings.log_verbosity as 'basic' | 'normal' | 'debug');
  if (backendSettings.log_retention_days)
    settingsStore.setLogRetentionDays(Number(backendSettings.log_retention_days));
  if (backendSettings.log_max_size_mb)
    settingsStore.setLogMaxSizeMb(Number(backendSettings.log_max_size_mb));
  if (backendSettings.log_upload_endpoint !== undefined)
    settingsStore.setLogUploadEndpoint(backendSettings.log_upload_endpoint);
  ```

- [ ] **Step 6: Add useEffect to load log storage info when 'logs' tab is active**

  After the `useEffect` for `activeTab === 'system'` (around line 261), add:

  ```typescript
  useEffect(() => {
    if (activeTab !== 'logs') return;
    setLogInfoLoading(true);
    invoke<LogStorageInfo>('get_log_storage_info')
      .then((info) => {
        setLogInfo(info);
        setLogInfoLoading(false);
      })
      .catch(() => setLogInfoLoading(false));
  }, [activeTab]);
  ```

- [ ] **Step 7: Add 'Logs' to tabs array**

  In the `tabs` array (around line 444), add after the `system` entry and before `advanced`:

  ```typescript
  { id: 'logs', label: 'Logs', icon: Terminal },
  ```

  The array should now be:

  ```typescript
  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: t('settings.tabs.general'), icon: Shield },
    { id: 'interface', label: t('settings.tabs.interface'), icon: Palette },
    { id: 'system', label: t('settings.tabs.system'), icon: Server },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'advanced', label: t('settings.tabs.advanced'), icon: Globe },
    { id: 'about', label: t('settings.tabs.about'), icon: Info },
  ];
  ```

  Note: `Terminal` is already imported from `lucide-react` in this file.

- [ ] **Step 8: Add Log tab JSX**

  Before the closing `{/* TAB: ADVANCED */}` block (before `{activeTab === 'advanced' &&`), add:

  ```tsx
  {
    /* TAB: LOGS */
  }
  {
    activeTab === 'logs' && (
      <div className="space-y-6">
        {/* VERBOSIDADE */}
        <section className="rounded-xl border border-border p-6 bg-bg-secondary">
          <SectionTitle>Verbosidade</SectionTitle>
          <p className="text-sm text-text-secondary mb-4">
            Nível de detalhe dos logs de acção da interface
          </p>
          <div className="space-y-3">
            {(
              [
                { value: 'basic', label: 'Básico', desc: 'Erros e acções críticas' },
                { value: 'normal', label: 'Normal', desc: '+ Navegação e alterações de settings' },
                { value: 'debug', label: 'Debug', desc: '+ Todos os cliques e eventos de UI' },
              ] as { value: 'basic' | 'normal' | 'debug'; label: string; desc: string }[]
            ).map(({ value, label, desc }) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="log_verbosity"
                  value={value}
                  checked={settingsStore.logVerbosity === value}
                  onChange={() => {
                    settingsStore.setLogVerbosity(value);
                    handleUpdateSetting('log_verbosity', value);
                  }}
                  className="mt-0.5 accent-brand"
                />
                <span>
                  <span className="text-sm font-semibold text-text-primary">{label}</span>
                  <span className="ml-2 text-xs text-text-muted">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ARMAZENAMENTO */}
        <section className="rounded-xl border border-border p-6 bg-bg-secondary">
          <SectionTitle>Armazenamento</SectionTitle>
          {logInfoLoading && <p className="text-sm text-text-muted">A carregar...</p>}
          {logInfo && !logInfoLoading && (
            <div className="space-y-4">
              <div className="text-sm text-text-secondary space-y-1">
                <p>
                  <span className="font-medium text-text-primary">Pasta:</span> {logInfo.logDir}
                </p>
                <p>
                  <span className="font-medium text-text-primary">Total:</span>{' '}
                  {formatBytes(logInfo.totalSizeBytes)} · {logInfo.fileCount} ficheiro
                  {logInfo.fileCount !== 1 ? 's' : ''}
                  {logInfo.oldestFileDate && ` · mais antigo: ${logInfo.oldestFileDate}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  Reter
                  <input
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={settingsStore.logRetentionDays}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) {
                        settingsStore.setLogRetentionDays(v);
                        handleUpdateSetting('log_retention_days', String(v));
                      }
                    }}
                    className="w-16 rounded-lg border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary text-center"
                  />
                  dias
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  Máximo
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    defaultValue={settingsStore.logMaxSizeMb}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) {
                        settingsStore.setLogMaxSizeMb(v);
                        handleUpdateSetting('log_max_size_mb', String(v));
                      }
                    }}
                    className="w-20 rounded-lg border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary text-center"
                  />
                  MB
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => invoke('open_path', { path: logInfo.logDir }).catch(console.error)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  Abrir pasta
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm('Apagar todos os ficheiros de log?', {
                      title: 'Limpar logs',
                      kind: 'warning',
                    });
                    if (!ok) return;
                    await invoke('clear_log_files').catch((e: unknown) => toast.error(String(e)));
                    const info = await invoke<LogStorageInfo>('get_log_storage_info').catch(
                      () => null,
                    );
                    if (info) setLogInfo(info);
                    toast.success('Logs apagados');
                  }}
                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ENVIAR AO DESENVOLVEDOR */}
        <section className="rounded-xl border border-border p-6 bg-bg-secondary">
          <SectionTitle>Enviar Logs ao Desenvolvedor</SectionTitle>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Endpoint de upload
              </label>
              <input
                type="url"
                placeholder="https://..."
                defaultValue={settingsStore.logUploadEndpoint}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  settingsStore.setLogUploadEndpoint(v);
                  handleUpdateSetting('log_upload_endpoint', v);
                }}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <p className="mt-1 text-xs text-text-muted">
                Deixar vazio para desactivar o upload directo
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  try {
                    const bundlePath = await invoke<string>('export_logs_bundle');
                    const subject = `Nexora Logs v${APP_VERSION} — ${new Date().toISOString().slice(0, 10)}`;
                    const body = `Logs exportados para:\n${bundlePath}`;
                    window.open(
                      `mailto:dev@nexora.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
                    );
                  } catch (e: unknown) {
                    toast.error(String(e));
                  }
                }}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                <Upload size={14} />
                Enviar por email
              </button>
              <button
                disabled={!settingsStore.logUploadEndpoint}
                onClick={async () => {
                  try {
                    const result = await invoke<string>('upload_logs_to_server', {
                      endpoint: settingsStore.logUploadEndpoint,
                    });
                    toast.success(`Logs enviados: ${result}`);
                  } catch (e: unknown) {
                    toast.error(String(e));
                  }
                }}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Server size={14} />
                Enviar para servidor
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }
  ```

- [ ] **Step 9: Verify TypeScript compilation**

  ```powershell
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors.

- [ ] **Step 10: Commit**

  ```powershell
  git add src/pages/SettingsPage.tsx
  git commit -m "feat(logging): add Logs settings tab with verbosity, storage info, and send controls"
  ```

---

### Task 9: Add global Debug click listener to App.tsx

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Import useActionLog in App.tsx**

  In `src/App.tsx`, after the existing imports (around line 36), add:

  ```typescript
  import { useActionLog } from '@/hooks/useActionLog';
  ```

- [ ] **Step 2: Call useActionLog in App component**

  Inside the `function App()` body, after `const defaultProfile = useSettingsStore(...)` (around line 56), add:

  ```typescript
  const { logAction } = useActionLog();
  ```

- [ ] **Step 3: Add global click listener useEffect**

  After the `activeTabRef` useEffect (after the `useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);` block, around line 62), add:

  ```typescript
  // Listener global de cliques para nível Debug — regista elementos com data-log-id
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const logId = target.closest('[data-log-id]')?.getAttribute('data-log-id');
      if (!logId) return;
      logAction(`button:${logId}`);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [logAction]);
  ```

- [ ] **Step 4: Verify TypeScript compilation**

  ```powershell
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors.

- [ ] **Step 5: Run the app and verify the Logs tab appears**

  ```powershell
  npm run tauri dev
  ```

  Manual checks:
  - Open Settings → Logs tab appears between System and Advanced
  - Verbosity radio buttons work (select Basic, Normal, Debug)
  - Storage info section loads with path, size, file count
  - "Abrir pasta" opens the logs directory
  - Log file `nexora-YYYY-MM-DD.log` exists in `AppData\Local\Nexora\logs\`
  - Switching to Normal verbosity and clicking buttons produces no ACTION:DEBUG entries in the log file
  - Switching to Debug and clicking a button WITH `data-log-id` produces ACTION:DEBUG entries

- [ ] **Step 6: Commit**

  ```powershell
  git add src/App.tsx
  git commit -m "feat(logging): add global Debug click listener in App.tsx"
  ```
