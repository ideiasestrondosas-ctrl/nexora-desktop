# Alpha Instrumentada v0.29.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os 7 componentes da Alpha Instrumentada (Watch Folders, Onboarding, Error UX, Bug Report, Telemetria, Traduções EN+PT, ALPHA-TESTING.md) e publicar `v0.29.0-alpha.1`.

**Architecture:** Watch Folders usa crate `notify = "6"` num thread separado que comunica com o setup via `mpsc::Sender`; o sender é guardado em `AppState`. Telemetria é só local (SQLite). Onboarding, BugReport e ErrorMessage são componentes React novos integrados em `App.tsx`, `TopBar.tsx` e `JobCard.tsx`.

**Tech Stack:** React 19, TypeScript strict, Tauri 2, Rust stable, rusqlite, notify 6, lucide-react, i18next.

---

## Mapa de ficheiros

| Ficheiro                                  | Acção     | Responsabilidade                                                |
| ----------------------------------------- | --------- | --------------------------------------------------------------- |
| `scripts/check-translations.mjs`          | Criar     | Audita chaves i18n EN vs todas as línguas                       |
| `src-tauri/Cargo.toml`                    | Modificar | + `notify = "6"`                                                |
| `src-tauri/src/state.rs`                  | Modificar | + `watcher_tx: Mutex<Option<mpsc::Sender<WatchCmd>>>`           |
| `src-tauri/src/db/migrations.rs`          | Modificar | + tabelas `watch_folders` e `telemetry_events`                  |
| `src-tauri/src/watch_folders.rs`          | Criar     | Thread watcher + comandos Tauri                                 |
| `src-tauri/src/telemetry.rs`              | Criar     | Registo de eventos de telemetria                                |
| `src-tauri/src/commands/logs.rs`          | Modificar | + `get_last_n_logs_text`, `save_bug_report`                     |
| `src-tauri/src/lib.rs`                    | Modificar | + mod watch_folders, mod telemetry, novos comandos              |
| `src/components/OnboardingModal.tsx`      | Criar     | Modal 4 passos no primeiro arranque                             |
| `src/components/BugReportModal.tsx`       | Criar     | Reportar problema com log anexado                               |
| `src/components/PipelineErrorMessage.tsx` | Criar     | Mapeamento erro raw → mensagem accionável                       |
| `src/components/TopBar.tsx`               | Modificar | + botão Bug → BugReportModal                                    |
| `src/components/JobCard.tsx`              | Modificar | + PipelineErrorMessage no lugar do erro raw                     |
| `src/pages/SettingsPage.tsx`              | Modificar | + tab Watch Folders + secção Privacidade                        |
| `src/App.tsx`                             | Modificar | + OnboardingModal + BugReportModal state                        |
| `src/i18n/locales/en/base.json`           | Modificar | + chaves novas (watchFolders, onboarding, bugReport, telemetry) |
| `src/i18n/locales/pt/common.json`         | Modificar | + todas as chaves novas em PT                                   |
| `ALPHA-TESTING.md`                        | Criar     | Guia para testers alpha                                         |

---

## Task 1: Script check-translations.mjs

**Files:**

- Create: `scripts/check-translations.mjs`

- [ ] **Passo 1.1 — Criar o script**

```javascript
// scripts/check-translations.mjs
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/i18n/locales');

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, key));
    } else {
      acc[key] = v;
    }
    return acc;
  }, {});
}

const enRaw = JSON.parse(readFileSync(join(localesDir, 'en/base.json'), 'utf8'));
const enKeys = new Set(Object.keys(flatten(enRaw)));

const langs = readdirSync(localesDir).filter((l) => l !== 'en');

let totalMissing = 0;
let report = '';

for (const lang of langs.sort()) {
  const commonPath = join(localesDir, lang, 'common.json');
  if (!existsSync(commonPath)) {
    report += `\n[${lang}] — ficheiro common.json não existe\n`;
    continue;
  }
  const raw = JSON.parse(readFileSync(commonPath, 'utf8'));
  const keys = new Set(Object.keys(flatten(raw)));

  const missing = [...enKeys].filter((k) => !keys.has(k));
  const orphan = [...keys].filter((k) => !enKeys.has(k));

  if (missing.length === 0 && orphan.length === 0) {
    report += `[${lang}] ✓ completo\n`;
  } else {
    report += `\n[${lang}] ${missing.length} em falta, ${orphan.length} órfãs\n`;
    if (missing.length > 0)
      report += `  MISSING:\n${missing.map((k) => `    - ${k}`).join('\n')}\n`;
    if (orphan.length > 0) report += `  ORPHAN:\n${orphan.map((k) => `    + ${k}`).join('\n')}\n`;
    totalMissing += missing.length;
  }
}

console.log(report);
console.log(`\nTotal chaves em EN: ${enKeys.size}`);
console.log(`Total chaves em falta (todas as línguas): ${totalMissing}`);

// Alpha gate: pt deve ter 0 em falta
const ptPath = join(localesDir, 'pt/common.json');
if (existsSync(ptPath)) {
  const ptRaw = JSON.parse(readFileSync(ptPath, 'utf8'));
  const ptKeys = new Set(Object.keys(flatten(ptRaw)));
  const ptMissing = [...enKeys].filter((k) => !ptKeys.has(k));
  if (ptMissing.length > 0) {
    console.error(`\n❌ ALPHA GATE FAIL: pt tem ${ptMissing.length} chaves em falta`);
    process.exit(1);
  } else {
    console.log('\n✅ Alpha gate PT: OK');
  }
}
```

- [ ] **Passo 1.2 — Correr o script para ver o estado actual**

```bash
node scripts/check-translations.mjs
```

Esperado: lista de chaves em falta por língua. Guardar o output — vai ser usado na Task 9.

- [ ] **Passo 1.3 — Commit**

```bash
git add scripts/check-translations.mjs
git commit -m "feat(i18n): script check-translations para auditar chaves EN vs todas as linguas"
```

---

## Task 2: SQLite migrations — watch_folders + telemetry_events

**Files:**

- Modify: `src-tauri/src/db/migrations.rs`

- [ ] **Passo 2.1 — Adicionar funções de migração**

Adicionar no fim do ficheiro `src-tauri/src/db/migrations.rs`, antes do último `}`:

```rust
fn migrate_watch_folders_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS watch_folders (
            id         TEXT PRIMARY KEY,
            path       TEXT NOT NULL UNIQUE,
            enabled    INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

fn migrate_telemetry_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS telemetry_events (
            id           TEXT PRIMARY KEY,
            event_type   TEXT NOT NULL,
            payload_json TEXT,
            created_at   TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}
```

- [ ] **Passo 2.2 — Chamar as migrações em `run()`**

Localizar a função `pub fn run(conn: &Connection) -> Result<()>` e adicionar as duas chamadas:

```rust
pub fn run(conn: &Connection) -> Result<()> {
    conn.execute_batch(SCHEMA)?;
    migrate_jobs_status_check(conn)?;
    migrate_assets_v2(conn)?;
    migrate_cloud_v1(conn)?;
    migrate_watch_folders_v1(conn)?;
    migrate_telemetry_v1(conn)?;
    Ok(())
}
```

- [ ] **Passo 2.3 — Verificar que compila**

```bash
cd src-tauri && cargo check
```

Esperado: sem erros.

- [ ] **Passo 2.4 — Commit**

```bash
cd ..
git add src-tauri/src/db/migrations.rs
git commit -m "feat(db): adicionar tabelas watch_folders e telemetry_events"
```

---

## Task 3: Watch Folders — Rust backend

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/state.rs`
- Create: `src-tauri/src/watch_folders.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Passo 3.1 — Adicionar crate `notify` ao `Cargo.toml`**

No bloco `[dependencies]` de `src-tauri/Cargo.toml`, após a linha `window-vibrancy = "0.5"`:

```toml
notify = "6"
```

- [ ] **Passo 3.2 — Adicionar `watcher_tx` ao `AppState`**

Substituir o conteúdo de `src-tauri/src/state.rs`:

```rust
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::Mutex;

pub enum WatchCmd {
    Add { id: String, path: String },
    Remove { id: String },
    SetEnabled { id: String, enabled: bool },
}

pub struct AppState {
    pub db: Mutex<Connection>,
    pub sidecar_pid: Mutex<Option<u32>>,
    pub active_pids: Mutex<HashMap<String, u32>>,
    pub watcher_tx: Mutex<Option<std::sync::mpsc::Sender<WatchCmd>>>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            db: Mutex::new(db),
            sidecar_pid: Mutex::new(None),
            active_pids: Mutex::new(HashMap::new()),
            watcher_tx: Mutex::new(None),
        }
    }
}
```

- [ ] **Passo 3.3 — Criar `src-tauri/src/watch_folders.rs`**

```rust
use crate::state::{AppState, WatchCmd};
use chrono::Utc;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::mpsc;
use tauri::{Emitter, State};
use uuid::Uuid;

const VIDEO_EXTS: &[&str] = &["mp4", "mov", "mxf", "avi", "mkv", "webm", "ts", "m2ts", "m4v"];

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
                        if let Some(path) = watched.remove(&id) {
                            let _ = watcher.unwatch(Path::new(&path));
                        }
                    }
                    WatchCmd::SetEnabled { id, enabled } => {
                        if let Some(path) = watched.get(&id).cloned() {
                            if enabled {
                                let _ = watcher
                                    .watch(Path::new(&path), RecursiveMode::NonRecursive);
                            } else {
                                let _ = watcher.unwatch(Path::new(&path));
                            }
                        }
                    }
                }
            }

            // Processar eventos de ficheiro sem bloquear
            while let Ok(Ok(event)) = ev_rx.try_recv() {
                if matches!(event.kind, EventKind::Create(_)) {
                    for file_path in &event.paths {
                        let is_video = file_path
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(|e| VIDEO_EXTS.contains(&e.to_lowercase().as_str()))
                            .unwrap_or(false);

                        if is_video {
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
                                "watch_folders: ficheiro detectado: {}",
                                file_path.display()
                            );
                        }
                    }
                }
            }

            std::thread::sleep(std::time::Duration::from_millis(250));
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
```

- [ ] **Passo 3.4 — Adicionar `mod watch_folders` e inicialização ao `lib.rs`**

Adicionar `mod watch_folders;` ao bloco de módulos no topo de `src-tauri/src/lib.rs` (após `mod tray;`):

```rust
mod watch_folders;
```

No bloco `setup(|app| { ... })`, após a linha `queue::start(app.handle().clone(), &db_path);`, adicionar:

```rust
// Iniciar watcher de pastas
let watcher_tx = watch_folders::start(app.handle().clone(), db_path.clone());
let wf_state = app.state::<AppState>();
if let Ok(mut tx) = wf_state.watcher_tx.lock() {
    *tx = Some(watcher_tx);
}
```

- [ ] **Passo 3.5 — Registar os comandos no `invoke_handler`**

No `invoke_handler`, após `commands::metrics::get_system_metrics,`, adicionar:

```rust
watch_folders::list_watch_folders,
watch_folders::add_watch_folder,
watch_folders::remove_watch_folder,
watch_folders::toggle_watch_folder,
```

- [ ] **Passo 3.6 — Verificar que compila**

```bash
cd src-tauri && cargo check
```

Esperado: sem erros. Se `notify` não descarregar, correr `cargo fetch` primeiro.

- [ ] **Passo 3.7 — Commit**

```bash
cd ..
git add src-tauri/Cargo.toml src-tauri/src/state.rs src-tauri/src/watch_folders.rs src-tauri/src/lib.rs
git commit -m "feat(watch-folders): backend Rust — notify crate, comandos Tauri, watcher thread"
```

---

## Task 4: Watch Folders — React frontend

**Files:**

- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/i18n/locales/en/base.json`

- [ ] **Passo 4.1 — Adicionar chaves i18n EN para Watch Folders**

Em `src/i18n/locales/en/base.json`, localizar o objecto `"settings"` e adicionar dentro de `"settings"`:

```json
"watchFolders": {
  "tab": "Watch Folders",
  "title": "Watch Folders",
  "description": "Nexora monitors these folders and automatically adds new video files to the queue.",
  "addFolder": "Add Folder",
  "noFolders": "No folders configured.",
  "noFoldersHint": "Click \"Add Folder\" to start monitoring a directory.",
  "remove": "Remove",
  "enabled": "Active",
  "disabled": "Paused",
  "addError": "Could not add folder: {{error}}",
  "removeConfirm": "Remove this folder from Watch Folders?"
}
```

- [ ] **Passo 4.2 — Adicionar tipo `WatchFolder` e imports ao `SettingsPage.tsx`**

Adicionar após os imports existentes no topo de `src/pages/SettingsPage.tsx`:

```typescript
import { listen } from '@tauri-apps/api/event';
import { open as dialogOpen } from '@tauri-apps/plugin-dialog';

interface WatchFolder {
  id: string;
  path: string;
  enabled: boolean;
  createdAt: string;
}
```

- [ ] **Passo 4.3 — Adicionar state e lógica de Watch Folders ao componente `SettingsPage`**

Dentro da função `SettingsPage`, após as declarações de state existentes, adicionar:

```typescript
const [watchFolders, setWatchFolders] = useState<WatchFolder[]>([]);

useEffect(() => {
  invoke<WatchFolder[]>('list_watch_folders').then(setWatchFolders).catch(console.error);
}, []);

const handleAddWatchFolder = async () => {
  try {
    const selected = await dialogOpen({ directory: true, multiple: false });
    if (!selected) return;
    const path = typeof selected === 'string' ? selected : selected[0];
    const folder = await invoke<WatchFolder>('add_watch_folder', { path });
    setWatchFolders((prev) => [...prev, folder]);
  } catch (e) {
    console.error('add_watch_folder error', e);
  }
};

const handleRemoveWatchFolder = async (id: string) => {
  await invoke('remove_watch_folder', { id });
  setWatchFolders((prev) => prev.filter((f) => f.id !== id));
};

const handleToggleWatchFolder = async (id: string, enabled: boolean) => {
  await invoke('toggle_watch_folder', { id, enabled });
  setWatchFolders((prev) => prev.map((f) => (f.id === id ? { ...f, enabled } : f)));
};
```

- [ ] **Passo 4.4 — Adicionar tab "Watch Folders" à lista de tabs**

Localizar a declaração `const tabs: { id: SettingsTab; ... }[] = [` e:

1. Adicionar `'watchFolders'` ao tipo `SettingsTab`:

   ```typescript
   type SettingsTab =
     | 'general'
     | 'interface'
     | 'system'
     | 'logs'
     | 'cloud'
     | 'watchFolders'
     | 'advanced'
     | 'about';
   ```

2. Adicionar a tab ao array (antes de `'advanced'`):

   ```typescript
   { id: 'watchFolders' as const, label: t('settings.watchFolders.tab'), icon: FolderOpen },
   ```

3. Adicionar import `FolderOpen` ao import de lucide-react (já deve ter outros ícones importados — adicionar `FolderOpen` à lista).

- [ ] **Passo 4.5 — Adicionar painel de Watch Folders ao JSX**

Localizar onde os outros tabs são renderizados (procurar `activeTab === 'cloud'` ou similar). Adicionar após o bloco do tab `cloud`:

```tsx
{
  activeTab === 'watchFolders' && (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          {t('settings.watchFolders.title')}
        </h3>
        <p className="text-xs text-text-muted mb-4">{t('settings.watchFolders.description')}</p>
        <button
          onClick={handleAddWatchFolder}
          className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors mb-4"
        >
          {t('settings.watchFolders.addFolder')}
        </button>
        {watchFolders.length === 0 ? (
          <div className="text-sm text-text-muted py-4 text-center border border-dashed border-border rounded-lg">
            <p>{t('settings.watchFolders.noFolders')}</p>
            <p className="text-xs mt-1 opacity-70">{t('settings.watchFolders.noFoldersHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {watchFolders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border"
              >
                <FolderOpen size={16} className="text-brand flex-shrink-0" />
                <span className="flex-1 text-sm text-text-primary truncate" title={folder.path}>
                  {folder.path}
                </span>
                <span
                  className={`text-xs font-medium ${folder.enabled ? 'text-green-500' : 'text-text-muted'}`}
                >
                  {folder.enabled
                    ? t('settings.watchFolders.enabled')
                    : t('settings.watchFolders.disabled')}
                </span>
                <button
                  onClick={() => handleToggleWatchFolder(folder.id, !folder.enabled)}
                  className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                >
                  {folder.enabled ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => handleRemoveWatchFolder(folder.id)}
                  className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  {t('settings.watchFolders.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Passo 4.6 — Adicionar listener de `watch-folder-file-added` no `App.tsx`**

Em `src/App.tsx`, adicionar import:

```typescript
import { listen } from '@tauri-apps/api/event';
```

E dentro do componente `App`, adicionar `useEffect` após os outros `useEffect`:

```typescript
useEffect(() => {
  const unlisten = listen<{ path: string; watchFolderId: string }>(
    'watch-folder-file-added',
    (event) => {
      // Reutiliza o mesmo mecanismo de ingest que o drag-drop
      setBatchPaths([event.payload.path]);
      setBatchOpen(true);
    },
  );
  return () => {
    unlisten.then((fn) => fn());
  };
}, []);
```

- [ ] **Passo 4.7 — Verificar tipos**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Passo 4.8 — Commit**

```bash
git add src/pages/SettingsPage.tsx src/i18n/locales/en/base.json src/App.tsx
git commit -m "feat(watch-folders): frontend React — tab Settings, listener evento, integração fila"
```

---

## Task 5: Onboarding Modal

**Files:**

- Create: `src/components/OnboardingModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/locales/en/base.json`
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Passo 5.1 — Adicionar chaves i18n EN para Onboarding**

Em `src/i18n/locales/en/base.json`, adicionar ao nível raiz (antes de `"settings"`):

```json
"onboarding": {
  "step1Title": "Welcome to Nexora Desktop",
  "step1Desc": "Professional media processing, native on your workstation. Let's get you set up in under a minute.",
  "step2Title": "Output Folder",
  "step2Desc": "Where should processed files be saved?",
  "step2Choose": "Choose folder",
  "step3Title": "Privacy",
  "step3Desc": "Help improve Nexora by sharing anonymous error data — stored only on this device, never sent anywhere.",
  "step3Toggle": "Share anonymous error data",
  "step4Title": "You're all set!",
  "step4Desc": "Drag video files onto the app, or use the Library to add files to the queue.",
  "next": "Next",
  "back": "Back",
  "start": "Start using Nexora",
  "stepOf": "Step {{current}} of {{total}}"
}
```

- [ ] **Passo 5.2 — Criar `src/components/OnboardingModal.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import { CheckCircle, FolderOpen } from 'lucide-react';

const STORAGE_KEY = 'nexora_onboarding_complete';

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [outputDir, setOutputDir] = useState('');
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const TOTAL_STEPS = 4;

  // Carregar output_dir actual como sugestão
  useEffect(() => {
    invoke<Record<string, string>>('get_settings')
      .then((s) => setOutputDir(s.output_dir ?? ''))
      .catch(() => {});
  }, []);

  const handleChooseFolder = async () => {
    const selected = await dialogOpen({ directory: true, multiple: false });
    if (!selected) return;
    const path = typeof selected === 'string' ? selected : selected[0];
    setOutputDir(path);
  };

  const handleComplete = async () => {
    // Guardar output_dir
    if (outputDir) {
      await invoke('update_settings', { key: 'output_dir', value: outputDir }).catch(() => {});
    }
    // Guardar preferência de telemetria
    await invoke('update_settings', {
      key: 'telemetry_enabled',
      value: telemetryEnabled ? 'true' : 'false',
    }).catch(() => {});
    // Marcar onboarding como concluído
    localStorage.setItem(STORAGE_KEY, '1');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <p className="text-xs text-text-muted mb-6 text-center">
            {t('onboarding.stepOf', { current: step, total: TOTAL_STEPS })}
          </p>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-brand" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step1Title')}
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">
                {t('onboarding.step1Desc')}
              </p>
            </div>
          )}

          {/* Step 2: Output folder */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step2Title')}
              </h2>
              <p className="text-sm text-text-muted mb-4">{t('onboarding.step2Desc')}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outputDir}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border text-sm text-text-primary truncate"
                  placeholder="/path/to/output"
                />
                <button
                  onClick={handleChooseFolder}
                  className="px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors flex items-center gap-1.5"
                >
                  <FolderOpen size={14} />
                  {t('onboarding.step2Choose')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Privacy/Telemetry */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step3Title')}
              </h2>
              <p className="text-sm text-text-muted mb-6">{t('onboarding.step3Desc')}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setTelemetryEnabled((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors ${telemetryEnabled ? 'bg-brand' : 'bg-muted'} relative flex-shrink-0`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${telemetryEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </div>
                <span className="text-sm text-text-primary">{t('onboarding.step3Toggle')}</span>
              </label>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step4Title')}
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">
                {t('onboarding.step4Desc')}
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-muted transition-colors"
              >
                {t('onboarding.back')}
              </button>
            ) : (
              <div />
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
              >
                {t('onboarding.next')}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                {t('onboarding.start')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);
  return { show, complete: () => setShow(false) };
}
```

- [ ] **Passo 5.3 — Integrar OnboardingModal no `App.tsx`**

Adicionar import:

```typescript
import OnboardingModal, { useOnboarding } from '@/components/OnboardingModal';
```

Dentro da função `App`, adicionar após os outros hooks:

```typescript
const { show: showOnboarding, complete: completeOnboarding } = useOnboarding();
```

No JSX do return, após `<HelpOverlay .../>`, adicionar:

```tsx
{
  showOnboarding && <OnboardingModal onComplete={completeOnboarding} />;
}
```

- [ ] **Passo 5.4 — Adicionar botão "Resetar onboarding" em Settings → Advanced**

Em `src/pages/SettingsPage.tsx`, localizar o painel `activeTab === 'advanced'` e adicionar antes do botão Factory Reset:

```tsx
<div className="flex items-center justify-between py-3 border-b border-border">
  <div>
    <p className="text-sm font-medium text-text-primary">Reset Onboarding</p>
    <p className="text-xs text-text-muted mt-0.5">Show the welcome wizard again on next launch.</p>
  </div>
  <button
    onClick={() => {
      localStorage.removeItem('nexora_onboarding_complete');
    }}
    className="px-3 py-1.5 rounded-lg border border-border text-sm text-text-muted hover:bg-muted transition-colors"
  >
    Reset
  </button>
</div>
```

- [ ] **Passo 5.5 — Verificar tipos**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Passo 5.6 — Commit**

```bash
git add src/components/OnboardingModal.tsx src/App.tsx src/pages/SettingsPage.tsx src/i18n/locales/en/base.json
git commit -m "feat(onboarding): modal 4 passos no primeiro arranque com output dir e telemetria opt-in"
```

---

## Task 6: PipelineErrorMessage UX

**Files:**

- Create: `src/components/PipelineErrorMessage.tsx`
- Modify: `src/components/JobCard.tsx`
- Modify: `src/i18n/locales/en/base.json`

- [ ] **Passo 6.1 — Adicionar chaves i18n EN para erros de pipeline**

Em `src/i18n/locales/en/base.json`, dentro do objecto `"jobCard"`, substituir o conteúdo por:

```json
"jobCard": {
  "cancel": "Cancel Job",
  "processing": "Processing...",
  "completedAt": "Completed at {{date}}",
  "unknownError": "Transcoding error",
  "errorSuggestion": "See Logs for details",
  "errors": {
    "diskFull": "Disk full",
    "diskFullHint": "Free up disk space and try again",
    "permission": "Permission denied",
    "permissionHint": "Check destination folder permissions",
    "corrupt": "Corrupted or unsupported file",
    "corruptHint": "Check that the source file is intact",
    "codec": "Codec not available",
    "codecHint": "Select a different preset",
    "killed": "Process interrupted",
    "killedHint": "Job was cancelled or system ran out of memory",
    "generic": "Transcoding error",
    "genericHint": "See Logs for details"
  }
}
```

- [ ] **Passo 6.2 — Criar `src/components/PipelineErrorMessage.tsx`**

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface ErrorInfo {
  title: string;
  hint: string;
}

function categorize(raw: string, t: (key: string) => string): ErrorInfo {
  const r = raw.toLowerCase();
  if (r.includes('no space left') || r.includes('disk full') || r.includes('enospc')) {
    return { title: t('jobCard.errors.diskFull'), hint: t('jobCard.errors.diskFullHint') };
  }
  if (r.includes('permission denied') || r.includes('access is denied') || r.includes('eperm')) {
    return { title: t('jobCard.errors.permission'), hint: t('jobCard.errors.permissionHint') };
  }
  if (
    r.includes('invalid data found') ||
    r.includes('moov atom not found') ||
    r.includes('not supported')
  ) {
    return { title: t('jobCard.errors.corrupt'), hint: t('jobCard.errors.corruptHint') };
  }
  if (r.includes('encoder not found') || r.includes('codec not found') || r.includes('unknown encoder')) {
    return { title: t('jobCard.errors.codec'), hint: t('jobCard.errors.codecHint') };
  }
  if (r.includes('sigkill') || r.includes('killed') || r.includes('signal 9')) {
    return { title: t('jobCard.errors.killed'), hint: t('jobCard.errors.killedHint') };
  }
  return { title: t('jobCard.errors.generic'), hint: t('jobCard.errors.genericHint') };
}

interface Props {
  rawError: string | null | undefined;
}

export default function PipelineErrorMessage({ rawError }: Props) {
  const { t } = useTranslation();
  const { title, hint } = rawError
    ? categorize(rawError, t)
    : { title: t('jobCard.unknownError'), hint: t('jobCard.errorSuggestion') };

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-red-400">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {title}
      </span>
      <span className="text-xs text-text-muted pl-4">{hint}</span>
    </span>
  );
}
```

- [ ] **Passo 6.3 — Substituir erro raw no `JobCard.tsx`**

Em `src/components/JobCard.tsx`, adicionar import:

```typescript
import PipelineErrorMessage from '@/components/PipelineErrorMessage';
```

Localizar o bloco:

```tsx
) : isError ? (
  <>
    <AlertCircle className="w-3 h-3 text-red-500" />{' '}
    {job.error || t('jobCard.unknownError')}
  </>
```

Substituir por:

```tsx
) : isError ? (
  <PipelineErrorMessage rawError={job.error} />
```

Remover o import de `AlertCircle` do JobCard se já não for usado noutro lado (verificar antes de remover).

- [ ] **Passo 6.4 — Verificar tipos e lint**

```bash
npm run typecheck && npm run lint
```

Esperado: sem erros.

- [ ] **Passo 6.5 — Commit**

```bash
git add src/components/PipelineErrorMessage.tsx src/components/JobCard.tsx src/i18n/locales/en/base.json
git commit -m "feat(ux): mensagens de erro de pipeline categorizadas e accionaveis"
```

---

## Task 7: Telemetria — Rust + Settings UI

**Files:**

- Create: `src-tauri/src/telemetry.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/i18n/locales/en/base.json`

- [ ] **Passo 7.1 — Criar `src-tauri/src/telemetry.rs`**

```rust
use crate::state::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryEvent {
    pub id: String,
    pub event_type: String,
    pub payload_json: Option<String>,
    pub created_at: String,
}

/// Regista um evento de telemetria apenas se telemetria estiver activada.
pub fn record(state: &AppState, event_type: &str, payload: Option<serde_json::Value>) {
    let enabled = state
        .db
        .lock()
        .ok()
        .and_then(|db| {
            db.query_row(
                "SELECT value FROM settings WHERE key = 'telemetry_enabled'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok()
        })
        .map(|v| v == "true")
        .unwrap_or(false);

    if !enabled {
        return;
    }

    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let payload_str = payload.map(|p| p.to_string());

    if let Ok(db) = state.db.lock() {
        let _ = db.execute(
            "INSERT INTO telemetry_events (id, event_type, payload_json, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, event_type, payload_str, created_at],
        );
    }
}

#[tauri::command]
pub fn get_telemetry_events(state: State<AppState>) -> Result<Vec<TelemetryEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, event_type, payload_json, created_at FROM telemetry_events ORDER BY created_at DESC LIMIT 200",
        )
        .map_err(|e| e.to_string())?;
    let rows: Vec<TelemetryEvent> = stmt
        .query_map([], |row| {
            Ok(TelemetryEvent {
                id: row.get(0)?,
                event_type: row.get(1)?,
                payload_json: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn clear_telemetry_events(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute_batch("DELETE FROM telemetry_events")
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Passo 7.2 — Registar módulo e comandos em `lib.rs`**

Adicionar `mod telemetry;` ao bloco de módulos no topo (após `mod watch_folders;`):

```rust
mod telemetry;
```

Adicionar ao `invoke_handler`:

```rust
telemetry::get_telemetry_events,
telemetry::clear_telemetry_events,
```

Registar evento `app_launch` no setup, após `log::info!(...)`:

```rust
// Evento de telemetria de arranque (só se telemetria activada)
if let Some(state) = app.try_state::<AppState>() {
    telemetry::record(
        &state,
        "app_launch",
        Some(serde_json::json!({
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
        })),
    );
}
```

- [ ] **Passo 7.3 — Verificar que compila**

```bash
cd src-tauri && cargo check
```

- [ ] **Passo 7.4 — Adicionar chaves i18n EN para Privacidade**

Em `src/i18n/locales/en/base.json`, dentro de `"settings"`, adicionar:

```json
"privacy": {
  "tab": "Privacy",
  "title": "Privacy & Telemetry",
  "toggle": "Share anonymous error data",
  "toggleHint": "Error counts and app events — stored only on this device.",
  "viewData": "View collected data",
  "clearData": "Delete all data",
  "noData": "No telemetry data collected yet.",
  "cleared": "All telemetry data deleted."
}
```

- [ ] **Passo 7.5 — Adicionar tab Privacidade e painel ao `SettingsPage.tsx`**

1. Adicionar `'privacy'` ao tipo `SettingsTab`.

2. Adicionar ao array de tabs (antes de `'advanced'`):

   ```typescript
   { id: 'privacy' as const, label: t('settings.privacy.tab'), icon: Shield },
   ```

   (`Shield` já está importado na lista de ícones do SettingsPage.)

3. Adicionar state para a secção de privacidade (dentro da função `SettingsPage`):

   ```typescript
   const [telemetryEnabled, setTelemetryEnabled] = useState(false);
   const [telemetryEvents, setTelemetryEvents] = useState<
     Array<{ id: string; eventType: string; payloadJson?: string; createdAt: string }>
   >([]);
   const [showTelemetryData, setShowTelemetryData] = useState(false);

   // Carregar telemetry_enabled quando o tab fica activo
   useEffect(() => {
     if (activeTab !== 'privacy') return;
     invoke<Record<string, string>>('get_settings').then((s) => {
       setTelemetryEnabled(s.telemetry_enabled === 'true');
     });
   }, [activeTab]);

   const handleViewTelemetry = async () => {
     const events = await invoke<typeof telemetryEvents>('get_telemetry_events');
     setTelemetryEvents(events);
     setShowTelemetryData(true);
   };

   const handleClearTelemetry = async () => {
     await invoke('clear_telemetry_events');
     setTelemetryEvents([]);
     setShowTelemetryData(false);
   };
   ```

4. Adicionar painel JSX (após o bloco `activeTab === 'watchFolders'`):
   ```tsx
   {
     activeTab === 'privacy' && (
       <div className="space-y-6">
         <h3 className="text-sm font-semibold text-text-primary">{t('settings.privacy.title')}</h3>
         <div className="flex items-start justify-between gap-4 py-3 border-b border-border">
           <div>
             <p className="text-sm font-medium text-text-primary">{t('settings.privacy.toggle')}</p>
             <p className="text-xs text-text-muted mt-0.5">{t('settings.privacy.toggleHint')}</p>
           </div>
           <input
             type="checkbox"
             checked={telemetryEnabled}
             onChange={(e) => {
               const val = e.target.checked;
               setTelemetryEnabled(val);
               invoke('update_settings', {
                 key: 'telemetry_enabled',
                 value: val ? 'true' : 'false',
               });
             }}
             className="mt-1 w-4 h-4 accent-brand"
           />
         </div>
         <div className="flex gap-3">
           <button
             onClick={handleViewTelemetry}
             className="px-3 py-1.5 rounded-lg border border-border text-sm text-text-muted hover:bg-muted transition-colors"
           >
             {t('settings.privacy.viewData')}
           </button>
           <button
             onClick={handleClearTelemetry}
             className="px-3 py-1.5 rounded-lg border border-red-500/40 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
           >
             {t('settings.privacy.clearData')}
           </button>
         </div>
         {showTelemetryData && (
           <div className="bg-bg-secondary rounded-lg border border-border p-3 max-h-64 overflow-y-auto">
             {telemetryEvents.length === 0 ? (
               <p className="text-xs text-text-muted">{t('settings.privacy.noData')}</p>
             ) : (
               <pre className="text-xs text-text-primary whitespace-pre-wrap">
                 {JSON.stringify(telemetryEvents, null, 2)}
               </pre>
             )}
           </div>
         )}
       </div>
     );
   }
   ```

- [ ] **Passo 7.6 — Verificar tipos**

```bash
npm run typecheck
```

- [ ] **Passo 7.7 — Commit**

```bash
cd ..
git add src-tauri/src/telemetry.rs src-tauri/src/lib.rs src/pages/SettingsPage.tsx src/i18n/locales/en/base.json
git commit -m "feat(telemetry): registo local opt-in de eventos + painel Privacidade em Settings"
```

---

## Task 8: BugReportModal + TopBar + Rust commands

**Files:**

- Modify: `src-tauri/src/commands/logs.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src/components/BugReportModal.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/locales/en/base.json`

- [ ] **Passo 8.1 — Adicionar `get_last_n_logs_text` e `save_bug_report` ao `logs.rs`**

No fim de `src-tauri/src/commands/logs.rs`, adicionar:

```rust
#[tauri::command]
pub fn get_last_n_logs_text(n: i64, state: State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let cap = n.min(500).max(1);
    let mut stmt = db
        .prepare(
            "SELECT ts, level, source, message FROM logs ORDER BY ts DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let lines: Vec<String> = stmt
        .query_map(rusqlite::params![cap], |row| {
            let ts: String = row.get(0)?;
            let level: String = row.get(1)?;
            let source: String = row.get(2)?;
            let message: String = row.get(3)?;
            Ok(format!("[{}] [{:<5}] {} — {}", ts, level, source, message))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>()
        .into_iter()
        .rev() // ordem cronológica
        .collect();
    Ok(lines.join("\n"))
}

#[tauri::command]
pub fn save_bug_report(content: String, app: tauri::AppHandle) -> Result<String, String> {
    use std::io::Write as IoWrite;
    let date = chrono::Utc::now().format("%Y-%m-%d_%H%M%S");
    let filename = format!("nexora-bug-{}.txt", date);

    let downloads = app
        .path()
        .download_dir()
        .map_err(|e| e.to_string())?;
    let path = downloads.join(&filename);

    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().into_owned())
}
```

- [ ] **Passo 8.2 — Registar os dois comandos no `invoke_handler` de `lib.rs`**

Adicionar após `commands::logs::log_user_action,`:

```rust
commands::logs::get_last_n_logs_text,
commands::logs::save_bug_report,
```

- [ ] **Passo 8.3 — Verificar que compila**

```bash
cd src-tauri && cargo check
```

- [ ] **Passo 8.4 — Adicionar chaves i18n EN para BugReport**

Em `src/i18n/locales/en/base.json`, adicionar ao nível raiz:

```json
"bugReport": {
  "title": "Report a Problem",
  "titleLabel": "Title",
  "titlePlaceholder": "Brief description of the issue",
  "descLabel": "Description",
  "descPlaceholder": "Steps to reproduce, expected vs actual behaviour...",
  "includeLogs": "Include last 50 log lines",
  "copyClipboard": "Copy to clipboard",
  "openGitHub": "Open GitHub Issue",
  "saveFile": "Save as file",
  "copied": "Copied to clipboard",
  "saved": "Saved to {{path}}",
  "titleRequired": "Title is required"
}
```

E em `"topbar"`, adicionar `"bugReport": "Report a Problem"`.

- [ ] **Passo 8.5 — Criar `src/components/BugReportModal.tsx`**

```typescript
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from 'react-i18next';
import { X, Copy, Github, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BugReportModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);

  if (!open) return null;

  const buildContent = async (): Promise<string> => {
    let content = `## ${title}\n\n${desc}`;
    if (includeLogs) {
      const logs = await invoke<string>('get_last_n_logs_text', { n: 50 });
      content += `\n\n## Logs\n\`\`\`\n${logs}\n\`\`\``;
    }
    return content;
  };

  const validate = () => {
    if (!title.trim()) {
      setTitleError(true);
      return false;
    }
    setTitleError(false);
    return true;
  };

  const handleCopy = async () => {
    if (!validate()) return;
    const content = await buildContent();
    await writeText(content);
    setStatus(t('bugReport.copied'));
  };

  const handleGitHub = async () => {
    if (!validate()) return;
    const content = await buildContent();
    const url = `https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`;
    await openUrl(url);
  };

  const handleSave = async () => {
    if (!validate()) return;
    const content = await buildContent();
    const path = await invoke<string>('save_bug_report', { content });
    setStatus(t('bugReport.saved', { path }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">{t('bugReport.title')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t('bugReport.titleLabel')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
              placeholder={t('bugReport.titlePlaceholder')}
              className={`w-full px-3 py-2 rounded-lg bg-bg-secondary border text-sm text-text-primary outline-none focus:ring-1 focus:ring-brand ${titleError ? 'border-red-500' : 'border-border'}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {t('bugReport.descLabel')}
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('bugReport.descPlaceholder')}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-sm text-text-primary outline-none focus:ring-1 focus:ring-brand resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
            <input
              type="checkbox"
              checked={includeLogs}
              onChange={(e) => setIncludeLogs(e.target.checked)}
              className="accent-brand"
            />
            {t('bugReport.includeLogs')}
          </label>
          {status && (
            <p className="text-xs text-green-500">{status}</p>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-muted transition-colors"
          >
            <Copy size={14} /> {t('bugReport.copyClipboard')}
          </button>
          <button
            onClick={handleGitHub}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-muted transition-colors"
          >
            <Github size={14} /> {t('bugReport.openGitHub')}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            <FileText size={14} /> {t('bugReport.saveFile')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Passo 8.6 — Adicionar botão Bug e state ao `App.tsx`**

Adicionar import:

```typescript
import BugReportModal from '@/components/BugReportModal';
```

Adicionar state dentro de `App`:

```typescript
const [bugReportOpen, setBugReportOpen] = useState(false);
```

Passar prop ao `TopBar`:

```tsx
<TopBar
  activeTab={activeTab}
  onHelpOpen={() => setHelpOpen(true)}
  onBugReport={() => setBugReportOpen(true)}
/>
```

Adicionar modal após `<HelpOverlay .../>`:

```tsx
<BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
```

- [ ] **Passo 8.7 — Atualizar `TopBar.tsx` para aceitar `onBugReport`**

1. Adicionar `Bug` ao import lucide: `import { LogOut, Cpu, MemoryStick, HardDrive, Monitor, HelpCircle, Bug } from 'lucide-react';`

2. Adicionar à interface `TopBarProps`:

   ```typescript
   onBugReport?: () => void;
   ```

3. Adicionar ao destructuring: `export default function TopBar({ activeTab, onHelpOpen, onBugReport }: TopBarProps)`

4. Adicionar botão no JSX, após o bloco do botão Ajuda:
   ```tsx
   {
     onBugReport && (
       <button
         onClick={onBugReport}
         className="p-2.5 rounded-lg text-text-muted hover:text-orange-400 hover:bg-orange-400/10 transition-colors mr-1"
         title={t('topbar.bugReport')}
       >
         <Bug size={20} />
       </button>
     );
   }
   ```

- [ ] **Passo 8.8 — Verificar tipos e lint**

```bash
npm run typecheck && npm run lint
```

Esperado: sem erros.

- [ ] **Passo 8.9 — Commit**

```bash
cd ..
git add src-tauri/src/commands/logs.rs src-tauri/src/lib.rs src/components/BugReportModal.tsx src/components/TopBar.tsx src/App.tsx src/i18n/locales/en/base.json
git commit -m "feat(bug-report): BugReportModal com log anexado — clipboard, GitHub Issue, ficheiro"
```

---

## Task 9: Traduções PT — corrigir chaves em falta

**Files:**

- Modify: `src/i18n/locales/pt/common.json`

- [ ] **Passo 9.1 — Correr o script de auditoria**

```bash
node scripts/check-translations.mjs 2>&1 | grep -A 100 "\[pt\]"
```

Esperado: lista de chaves em falta em PT (resultado da Task 1 + chaves novas adicionadas nas tasks 4-8).

- [ ] **Passo 9.2 — Adicionar chaves novas ao `pt/common.json`**

Localizar cada secção em falta e adicionar as traduções. Chaves novas garantidas pelas tasks anteriores:

**Secção `"onboarding"`** (adicionar em `pt/common.json`):

```json
"onboarding": {
  "step1Title": "Bem-vindo ao Nexora Desktop",
  "step1Desc": "Processamento de media profissional, nativo no teu computador. Vamos configurar em menos de um minuto.",
  "step2Title": "Pasta de destino",
  "step2Desc": "Onde devem ser guardados os ficheiros processados?",
  "step2Choose": "Escolher pasta",
  "step3Title": "Privacidade",
  "step3Desc": "Ajuda a melhorar o Nexora partilhando dados anónimos de erros — guardados apenas neste dispositivo, nunca enviados.",
  "step3Toggle": "Partilhar dados anónimos de erros",
  "step4Title": "Está tudo pronto!",
  "step4Desc": "Arrasta ficheiros de vídeo para a app, ou usa a Biblioteca para adicionar ficheiros à fila.",
  "next": "Seguinte",
  "back": "Anterior",
  "start": "Começar a usar o Nexora",
  "stepOf": "Passo {{current}} de {{total}}"
}
```

**Secção `"bugReport"`**:

```json
"bugReport": {
  "title": "Reportar Problema",
  "titleLabel": "Título",
  "titlePlaceholder": "Descrição breve do problema",
  "descLabel": "Descrição",
  "descPlaceholder": "Passos para reproduzir, comportamento esperado vs actual...",
  "includeLogs": "Incluir últimas 50 linhas de log",
  "copyClipboard": "Copiar para clipboard",
  "openGitHub": "Abrir GitHub Issue",
  "saveFile": "Guardar como ficheiro",
  "copied": "Copiado para o clipboard",
  "saved": "Guardado em {{path}}",
  "titleRequired": "O título é obrigatório"
}
```

**Secção `"settings.watchFolders"`** (adicionar dentro de `"settings"`):

```json
"watchFolders": {
  "tab": "Watch Folders",
  "title": "Watch Folders",
  "description": "O Nexora monitoriza estas pastas e adiciona automaticamente novos ficheiros de vídeo à fila.",
  "addFolder": "Adicionar Pasta",
  "noFolders": "Sem pastas configuradas.",
  "noFoldersHint": "Clica em \"Adicionar Pasta\" para começar a monitorizar uma directoria.",
  "remove": "Remover",
  "enabled": "Activa",
  "disabled": "Em pausa",
  "addError": "Não foi possível adicionar a pasta: {{error}}",
  "removeConfirm": "Remover esta pasta das Watch Folders?"
}
```

**Secção `"settings.privacy"`** (adicionar dentro de `"settings"`):

```json
"privacy": {
  "tab": "Privacidade",
  "title": "Privacidade e Telemetria",
  "toggle": "Partilhar dados anónimos de erros",
  "toggleHint": "Contagem de erros e eventos da app — guardados apenas neste dispositivo.",
  "viewData": "Ver dados recolhidos",
  "clearData": "Apagar todos os dados",
  "noData": "Ainda não foram recolhidos dados de telemetria.",
  "cleared": "Todos os dados de telemetria foram apagados."
}
```

**Chaves de jobCard** (actualizar dentro de `"jobCard"` em PT):

```json
"jobCard": {
  "cancel": "Cancelar Job",
  "processing": "A processar...",
  "completedAt": "Concluído às {{date}}",
  "unknownError": "Erro de transcodificação",
  "errorSuggestion": "Consulta os Registos para detalhes",
  "errors": {
    "diskFull": "Disco cheio",
    "diskFullHint": "Liberta espaço em disco e tenta novamente",
    "permission": "Sem permissão",
    "permissionHint": "Verifica as permissões da pasta de destino",
    "corrupt": "Ficheiro corrompido ou formato não suportado",
    "corruptHint": "Verifica se o ficheiro original está íntegro",
    "codec": "Codec não disponível",
    "codecHint": "Selecciona um preset diferente",
    "killed": "Processo interrompido",
    "killedHint": "A conversão foi cancelada ou o sistema ficou sem memória",
    "generic": "Erro de transcodificação",
    "genericHint": "Consulta os Registos para detalhes"
  }
}
```

Também adicionar em `"topbar"`: `"bugReport": "Reportar Problema"`.

- [ ] **Passo 9.3 — Correr script novamente — alpha gate deve passar**

```bash
node scripts/check-translations.mjs
```

Esperado: `✅ Alpha gate PT: OK` e exit code 0.

- [ ] **Passo 9.4 — Commit**

```bash
git add src/i18n/locales/pt/common.json
git commit -m "feat(i18n): traducoes PT para onboarding, bugReport, watchFolders, privacidade, erros pipeline"
```

---

## Task 10: ALPHA-TESTING.md

**Files:**

- Create: `ALPHA-TESTING.md`

- [ ] **Passo 10.1 — Criar `ALPHA-TESTING.md`**

```markdown
# Nexora Desktop — Alpha Testing Guide

**Versão:** v0.29.0-alpha.1  
**Data:** 2026-05  
**Contacto:** ideiasestrondosas@gmail.com

---

## Requisitos Mínimos

| Sistema         | Versão mínima           |
| --------------- | ----------------------- |
| Windows         | 10 (x64)                |
| macOS           | 11 Big Sur              |
| Ubuntu / Debian | 20.04 LTS               |
| RAM             | 4 GB (8 GB recomendado) |
| Disco           | 2 GB livres             |

---

## Instalação

### Windows

1. Descarrega `Nexora_0.29.0-alpha.1_x64.msi` (ou `.exe`)
2. Executa o instalador — clica "Mais informações" → "Executar mesmo assim" se aparecer aviso do SmartScreen (app não está ainda assinada)
3. Lança via menu Iniciar

### macOS

1. Descarrega `Nexora_0.29.0-alpha.1_universal.dmg`
2. Abre o DMG, arrasta para Aplicações
3. No Finder, clica com botão direito → Abrir (primeira execução)

### Linux

1. Descarrega `.deb` ou `.AppImage`
2. `.deb`: `sudo dpkg -i nexora_0.29.0-alpha.1_amd64.deb`
3. `.AppImage`: `chmod +x Nexora*.AppImage && ./Nexora*.AppImage`

---

## Bugs Conhecidos

- [ ] _(actualizar antes de enviar)_

---

## Lista de Acções de Teste

Por favor testa cada item e nota o que aconteceu (funcionou / erro / comportamento estranho).

### Onboarding

- [ ] **01** — Na primeira abertura aparece o modal de boas-vindas com 4 passos?
- [ ] **02** — Consegues seleccionar uma pasta de output no passo 2?
- [ ] **03** — O toggle de telemetria no passo 3 funciona?
- [ ] **04** — Após clicar "Começar" o modal fecha e não volta a aparecer?
- [ ] **05** — Em Settings → Avançado, o botão "Reset Onboarding" faz o modal aparecer no próximo arranque?

### Importar Ficheiros

- [ ] **06** — Arrasta um ficheiro de vídeo para a janela — aparece o modal de batch submit?
- [ ] **07** — Usa Biblioteca → "Scan Directory" para importar uma pasta com vídeos?
- [ ] **08** — O asset aparece na Biblioteca após ingest?

### Fila e Transcodificação

- [ ] **09** — Submete um job com o perfil "Web HD" — o job aparece na Fila?
- [ ] **10** — O job completa sem erros? Qual foi o tempo aproximado?
- [ ] **11** — O ficheiro de output foi criado na pasta correcta?
- [ ] **12** — Se cancelares um job em curso, desaparece da fila?

### Watch Folders

- [ ] **13** — Em Settings → Watch Folders, consegues adicionar uma pasta?
- [ ] **14** — Copias um ficheiro `.mp4` para essa pasta — abre o modal de submit automaticamente?
- [ ] **15** — O toggle "Pause/Resume" desactiva e reactiva a monitorização?

### Reportar Problema

- [ ] **16** — O ícone de bug na barra de topo abre o modal "Reportar Problema"?
- [ ] **17** — Preenches título, clicas "Guardar como ficheiro" — é criado um `.txt` em Downloads?
- [ ] **18** — O botão "Abrir GitHub Issue" abre o browser com o título pré-preenchido?

### Cloud (opcional — só se tiveres credenciais)

- [ ] **19** — Em Settings → Cloud, consegues adicionar um perfil FTP/S3?
- [ ] **20** — Ao submeter um job com destino cloud, o upload ocorre após transcodificação?

### Geral

- [ ] **21** — A app arranca e fecha sem crashes após 15 minutos de uso?
- [ ] **22** — Alterna entre todos os ecrãs (Dashboard, Biblioteca, Fila, Perfis, Settings, Registos) — algum fica em branco ou crashou?

---

## Como Reportar

1. **Botão na app:** ícone de bug na barra de topo → preenche título + descrição → "Guardar como ficheiro" ou "Abrir GitHub Issue"
2. **GitHub Issues:** https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues
3. **Email:** ideiasestrondosas@gmail.com

Por favor inclui sempre:

- Sistema operativo e versão
- O que fizeste antes do problema
- O que esperavas vs o que aconteceu
- O ficheiro de log se conseguires (botão "Guardar como ficheiro" no modal de bug)
```

- [ ] **Passo 10.2 — Commit**

```bash
git add ALPHA-TESTING.md
git commit -m "docs: ALPHA-TESTING.md — guia de instalacao e 22 accoes de teste para alpha testers"
```

---

## Task 11: Bump versão e tag v0.29.0-alpha.1

**Files:**

- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Passo 11.1 — Actualizar versão em `package.json`**

Alterar `"version": "0.28.0"` para `"version": "0.29.0-alpha.1"`.

- [ ] **Passo 11.2 — Actualizar versão em `src-tauri/Cargo.toml`**

Alterar `version = "0.28.0"` para `version = "0.29.0-alpha.1"`.

- [ ] **Passo 11.3 — Actualizar versão em `src-tauri/tauri.conf.json`**

Localizar `"version": "0.28.0"` e alterar para `"version": "0.29.0-alpha.1"`.

- [ ] **Passo 11.4 — Build final de verificação**

```bash
cd src-tauri && cargo check && cd ..
npm run typecheck
```

Esperado: sem erros de compilação ou tipos.

- [ ] **Passo 11.5 — Commit de versão**

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock
git commit -m "chore(release): v0.29.0-alpha.1"
```

- [ ] **Passo 11.6 — Criar tag e push**

```bash
git tag v0.29.0-alpha.1
git push origin main --tags
```

O CI (GitHub Actions) arranca automaticamente e gera os instaladores para Windows, macOS e Linux.

- [ ] **Passo 11.7 — Após CI terminar, publicar a release**

```bash
pwsh -ExecutionPolicy Bypass -File scripts\sync.ps1 -PublishDraft
```

A opção 6 encontra o draft do CI, gera as release notes e publica. Copiar o link da release e partilhar com os testers juntamente com o ficheiro `ALPHA-TESTING.md`.

```

```
