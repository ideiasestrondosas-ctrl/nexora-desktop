# Beta Stability + Visual Comparator — Implementation Plan (v0.30.0-beta.1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 6 bugs críticos que bloqueiam a beta e implementar o VisualComparatorPlayer para a v0.30.0-beta.1.

**Architecture:** Fixes Rust isolados (watch_folders.rs, db/mod.rs, state.rs, lib.rs) + remoção de trigger duplicado em App.tsx + novo componente React split-screen. Zero novas dependências npm. Zero novos comandos Tauri.

**Tech Stack:** Rust stable, React 19, TypeScript strict, Tauri 2.x, `convertFileSrc` de `@tauri-apps/api/core`.

**Nota pré-implementação:**

- Fix 4 (logs event-driven) já está implementado em `src/hooks/useLogs.ts` — usa `listen('log-entry')` + fallback 60s. A task verifica e confirma; sem código a alterar.
- Fix 2 (WAL mode) já está parcialmente implementado — `db/mod.rs` já tem `journal_mode=WAL`; só faltam `synchronous=NORMAL` e `wal_autocheckpoint=1000`.
- Fix 5 (cloud dedup) — `cloud.rs` já filtra `status='pending'` por isso é idempotente; só precisa de remover o trigger no frontend.

---

## Mapa de Ficheiros

| Ficheiro                                    | Tarefa            | Tipo      |
| ------------------------------------------- | ----------------- | --------- |
| `src-tauri/src/watch_folders.rs`            | Fix 1 + Fix 3     | Modificar |
| `src-tauri/src/state.rs`                    | Fix 3             | Modificar |
| `src-tauri/src/lib.rs`                      | Fix 3             | Modificar |
| `src-tauri/src/db/mod.rs`                   | Fix 2             | Modificar |
| `src/hooks/useLogs.ts`                      | Fix 4 (verificar) | Verificar |
| `src/App.tsx`                               | Fix 5             | Modificar |
| `src/lib/version.ts`                        | Fix 6             | Modificar |
| `src/components/VisualComparatorPlayer.tsx` | Feature 7         | Criar     |
| `src/pages/AssetDetailPage.tsx`             | Feature 7         | Modificar |
| `src/i18n/locales/en/base.json`             | Feature 7         | Modificar |
| `src/i18n/locales/pt/common.json`           | Feature 7         | Modificar |
| `package.json`                              | Release           | Modificar |
| `src-tauri/Cargo.toml`                      | Release           | Modificar |
| `src-tauri/tauri.conf.json`                 | Release           | Modificar |

---

## Task 1 — Fix 1: Watch Folders Debounce + Deduplicação

**Files:**

- Modify: `src-tauri/src/watch_folders.rs`

### Contexto

O handler actual emite `watch-folder-file-added` imediatamente no primeiro `EventKind::Create`. Quando o utilizador copia um ficheiro grande, o FFprobe tenta abrir um ficheiro incompleto.

**Solução:** HashMap de ficheiros pendentes com verificação de estabilidade de tamanho (3s sem variação). HashSet para prevenir ingest duplo.

- [ ] **Passo 1.1 — Substituir o bloco de imports e estruturas no topo do ficheiro**

Em `src-tauri/src/watch_folders.rs`, adicionar `Instant` e as collections necessárias ao bloco de imports existente. Substituir as linhas de use no topo por:

```rust
use crate::state::{AppState, WatchCmd};
use chrono::Utc;
use notify::{Config, Event, EventKind, ModifyKind, RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Instant;
use tauri::{Emitter, State};
use uuid::Uuid;
```

- [ ] **Passo 1.2 — Adicionar struct `PendingFile` logo após `VIDEO_EXTS`**

Após a linha `const VIDEO_EXTS: &[&str] = &[...]`, adicionar:

```rust
struct PendingFile {
    size: u64,
    stable_since: Instant,
}
```

- [ ] **Passo 1.3 — Substituir o corpo da função `start` com lógica de debounce**

Substituir todo o conteúdo da função `pub fn start(app: tauri::AppHandle, db_path: std::path::PathBuf) -> mpsc::Sender<WatchCmd>` pelo seguinte:

```rust
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

        let mut watched: HashMap<String, String> = HashMap::new();
        let mut pending: HashMap<PathBuf, PendingFile> = HashMap::new();
        let mut ingested: HashSet<PathBuf> = HashSet::new();

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
                        .watch(std::path::Path::new(&path), RecursiveMode::NonRecursive)
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
            // Processar comandos
            while let Ok(cmd) = cmd_rx.try_recv() {
                match cmd {
                    WatchCmd::Add { id, path } => {
                        if watcher
                            .watch(std::path::Path::new(&path), RecursiveMode::NonRecursive)
                            .is_ok()
                        {
                            watched.insert(id, path);
                        }
                    }
                    WatchCmd::Remove { id } => {
                        if let Some(path) = watched.remove(&id) {
                            let _ = watcher.unwatch(std::path::Path::new(&path));
                        }
                    }
                    WatchCmd::SetEnabled { id, enabled } => {
                        if let Some(path) = watched.get(&id).cloned() {
                            if enabled {
                                let _ = watcher.watch(
                                    std::path::Path::new(&path),
                                    RecursiveMode::NonRecursive,
                                );
                            } else {
                                let _ = watcher.unwatch(std::path::Path::new(&path));
                            }
                        }
                    }
                    WatchCmd::Shutdown => {
                        log::info!("watch_folders: shutdown recebido, a terminar thread");
                        return;
                    }
                }
            }

            // Processar eventos de ficheiro
            while let Ok(Ok(event)) = ev_rx.try_recv() {
                let is_create_or_modify = matches!(
                    event.kind,
                    EventKind::Create(_) | EventKind::Modify(ModifyKind::Data(_))
                );
                let is_remove = matches!(event.kind, EventKind::Remove(_));

                for file_path in &event.paths {
                    let is_video = file_path
                        .extension()
                        .and_then(|e| e.to_str())
                        .map(|e| VIDEO_EXTS.contains(&e.to_lowercase().as_str()))
                        .unwrap_or(false);

                    if !is_video {
                        continue;
                    }

                    if is_remove {
                        pending.remove(file_path);
                        ingested.remove(file_path);
                        continue;
                    }

                    if is_create_or_modify {
                        let size = std::fs::metadata(file_path)
                            .map(|m| m.len())
                            .unwrap_or(0);

                        if size == 0 {
                            continue;
                        }

                        match pending.get(file_path) {
                            Some(pf) if pf.size == size => {
                                // tamanho estável — não actualizar stable_since
                            }
                            _ => {
                                // tamanho novo ou primeira detecção
                                pending.insert(
                                    file_path.clone(),
                                    PendingFile {
                                        size,
                                        stable_since: Instant::now(),
                                    },
                                );
                            }
                        }
                    }
                }
            }

            // Verificar ficheiros pendentes — emitir se estável ≥ 3s
            let now = Instant::now();
            let ready: Vec<PathBuf> = pending
                .iter()
                .filter(|(_, pf)| now.duration_since(pf.stable_since).as_secs() >= 3)
                .map(|(p, _)| p.clone())
                .collect();

            for file_path in ready {
                pending.remove(&file_path);

                if ingested.contains(&file_path) {
                    continue;
                }
                ingested.insert(file_path.clone());

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
                    "watch_folders: ficheiro estável detectado: {}",
                    file_path.display()
                );
            }

            std::thread::sleep(std::time::Duration::from_secs(1));
        }
    });

    cmd_tx
}
```

**Nota:** O loop muda de 250ms para 1s — compatível com a granularidade de 3s de estabilidade e poupa CPU.

- [ ] **Passo 1.4 — Verificar que compila**

```powershell
cd src-tauri; cargo check; cd ..
```

Esperado: sem erros. Se houver `ModifyKind` não encontrado, verificar que `notify` está na versão 6.x em `Cargo.toml`.

- [ ] **Passo 1.5 — Commit**

```bash
git add src-tauri/src/watch_folders.rs
git commit -m "fix(watch-folders): debounce de tamanho 3s + deduplicação via ingested set"
```

---

## Task 2 — Fix 2: SQLite WAL Tuning

**Files:**

- Modify: `src-tauri/src/db/mod.rs`

### Contexto

`db/mod.rs` já tem `journal_mode=WAL`, `foreign_keys=ON` e `busy_timeout=5000`. Faltam apenas `synchronous=NORMAL` (perf/segurança) e `wal_autocheckpoint=1000` (evita crescimento do WAL file).

- [ ] **Passo 2.1 — Localizar e expandir o execute_batch existente**

Em `src-tauri/src/db/mod.rs`, encontrar o bloco:

```rust
conn.execute_batch(
    "PRAGMA journal_mode=WAL;
     PRAGMA foreign_keys=ON;
     PRAGMA busy_timeout=5000;",
)?;
```

Substituir por:

```rust
conn.execute_batch(
    "PRAGMA journal_mode=WAL;
     PRAGMA synchronous=NORMAL;
     PRAGMA wal_autocheckpoint=1000;
     PRAGMA foreign_keys=ON;
     PRAGMA busy_timeout=5000;",
)?;
```

- [ ] **Passo 2.2 — Verificar que compila**

```powershell
cd src-tauri; cargo check; cd ..
```

- [ ] **Passo 2.3 — Commit**

```bash
git add src-tauri/src/db/mod.rs
git commit -m "fix(db): synchronous=NORMAL e wal_autocheckpoint=1000 na conexão SQLite"
```

---

## Task 3 — Fix 3: Graceful Shutdown das Threads Background

**Files:**

- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`
- (watch_folders.rs já tem `WatchCmd::Shutdown` da Task 1)

### Contexto

`lib.rs` tem 2 threads em loop infinito (disk + metrics) e o watcher. No Windows, o `notify::Watcher` mantém handles de directório abertos, fazendo o processo ficar hung ao fechar.

- [ ] **Passo 3.1 — Adicionar `WatchCmd::Shutdown` e `shutdown` ao `state.rs`**

Substituir todo o conteúdo de `src-tauri/src/state.rs` por:

```rust
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
```

- [ ] **Passo 3.2 — Verificar que compila após state.rs**

```powershell
cd src-tauri; cargo check; cd ..
```

Esperado: sem erros. O compilador confirmará que `WatchCmd::Shutdown` em `watch_folders.rs` (Task 1) já cobre o novo enum variant.

- [ ] **Passo 3.3 — Actualizar thread do disco em `lib.rs` para verificar shutdown**

Em `lib.rs`, localizar o bloco da thread de disco:

```rust
let disk_handle = app.handle().clone();
std::thread::spawn(move || loop {
    std::thread::sleep(std::time::Duration::from_secs(10));
```

Substituir por:

```rust
let disk_handle = app.handle().clone();
let disk_shutdown = Arc::clone(&app.state::<AppState>().shutdown);
std::thread::spawn(move || {
    while !disk_shutdown.load(std::sync::atomic::Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_secs(10));
```

E fechar o `loop` com `}` (adicionar `}` antes do final do bloco spawn para fechar o `while`). O spawn fecha com `});` como antes.

Resultado completo do bloco (substituição total):

```rust
let disk_handle = app.handle().clone();
let disk_shutdown = Arc::clone(&app.state::<AppState>().shutdown);
std::thread::spawn(move || {
    while !disk_shutdown.load(std::sync::atomic::Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_secs(10));
        let stats = disk_handle
            .path()
            .app_data_dir()
            .ok()
            .and_then(|p| p.to_str().map(str::to_string))
            .and_then(|path| commands::system::get_disk_space(path).ok());
        if let Some(s) = stats {
            let _ = disk_handle.emit(
                "disk-space",
                serde_json::json!({
                    "diskFreeBytes": s.free_bytes,
                    "diskTotalBytes": s.total_bytes,
                }),
            );
        }
    }
});
```

- [ ] **Passo 3.4 — Actualizar thread de métricas em `lib.rs` para verificar shutdown**

Localizar a linha:

```rust
let metrics_handle = app.handle().clone();
std::thread::spawn(move || {
    use sysinfo::{Networks, System};
```

Adicionar imediatamente após `let metrics_handle = app.handle().clone();`:

```rust
let metrics_shutdown = Arc::clone(&app.state::<AppState>().shutdown);
```

Localizar dentro do spawn o bloco `loop {` e substituir por:

```rust
while !metrics_shutdown.load(std::sync::atomic::Ordering::Relaxed) {
```

E o `}` que fecha o `loop` passa a fechar o `while`. O resto do conteúdo é inalterado.

- [ ] **Passo 3.5 — Adicionar `use std::sync::Arc;` ao topo de `lib.rs`**

No topo de `lib.rs`, após `use state::AppState;`, adicionar:

```rust
use std::sync::Arc;
```

- [ ] **Passo 3.6 — Substituir `.run(tauri::generate_context!())` pelo handler de ExitRequested**

No final de `lib.rs`, localizar:

```rust
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar a aplicação Nexora");
```

Substituir por:

```rust
        .build(tauri::generate_context!())
        .expect("Erro ao compilar contexto Nexora")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    state.shutdown.store(true, std::sync::atomic::Ordering::Relaxed);
                    if let Ok(tx) = state.watcher_tx.lock() {
                        if let Some(sender) = tx.as_ref() {
                            let _ = sender.send(state::WatchCmd::Shutdown);
                        }
                    }
                }
            }
        });
```

- [ ] **Passo 3.7 — Verificar que compila**

```powershell
cd src-tauri; cargo check; cd ..
```

Esperado: sem erros. Se surgir erro em `state::WatchCmd::Shutdown`, garantir que `state` está no módulo path correcto (já é `mod state;` no topo de `lib.rs`).

- [ ] **Passo 3.8 — Commit**

```bash
git add src-tauri/src/state.rs src-tauri/src/lib.rs
git commit -m "fix(shutdown): graceful shutdown via AtomicBool + WatchCmd::Shutdown + ExitRequested handler"
```

---

## Task 4 — Fix 4: Verificar Event-Driven Logs (já implementado)

**Files:**

- Verify: `src/hooks/useLogs.ts`

### Contexto

`useLogs.ts` já usa `listen('log-entry', ...)` para receber logs em tempo real e tem fallback de 60s. O requisito do spec (substituir polling 5s por eventos + fallback 30s) já foi implementado numa versão anterior. Esta task verifica e confirma.

- [ ] **Passo 4.1 — Confirmar implementação em `src/hooks/useLogs.ts`**

Ler o ficheiro e verificar que:

1. Existe `listen<LogEntry>('log-entry', ...)` num `useEffect`
2. O `setInterval` tem valor ≥ 30000ms (actualmente 60000ms — OK)
3. Não existe nenhum `setInterval` de 5000ms ou inferior

Ficheiro actual (`src/hooks/useLogs.ts` linhas 44–74) já cumpre todos os requisitos.

- [ ] **Passo 4.2 — Sem alterações necessárias — commit de verificação**

```bash
git commit --allow-empty -m "chore(logs): Fix 4 verificado — useLogs já usa event-driven com fallback 60s"
```

---

## Task 5 — Fix 5: Cloud Upload Deduplicação

**Files:**

- Modify: `src/App.tsx`

### Contexto

`App.tsx` tem um `useEffect` (linhas ~91–103) que chama `invoke('process_cloud_destinations', ...)` quando um job muda para `'done'`. O backend (`queue.rs`) já faz o mesmo após emitir `job:completed`. `cloud.rs` filtra `status='pending'` por isso a segunda chamada não re-faz uploads, mas cria chamadas desnecessárias.

- [ ] **Passo 5.1 — Remover o useEffect de cloud upload em `src/App.tsx`**

Localizar e apagar o bloco:

```typescript
useEffect(() => {
  const unsubscribe = useJobsStore.subscribe((state, prevState) => {
    state.jobs.forEach((job) => {
      if (job.status !== 'done') return;
      const prev = prevState.jobs.find((j) => j.id === job.id);
      if (!prev || prev.status === 'done') return;
      invoke('process_cloud_destinations', { jobId: job.id }).catch(console.error);
    });
  });
  return unsubscribe;
}, []);
```

Apagar também o import de `invoke` de `@tauri-apps/api/core` **se** não for usado noutro sítio no ficheiro. Verificar antes de apagar o import.

- [ ] **Passo 5.2 — Verificar tipos**

```powershell
npm run typecheck
```

Esperado: sem erros. Se `invoke` ainda for usado noutro sítio em App.tsx, manter o import.

- [ ] **Passo 5.3 — Commit**

```bash
git add src/App.tsx
git commit -m "fix(cloud): remover trigger duplicado de process_cloud_destinations no frontend"
```

---

## Task 6 — Fix 6: version.ts Actualizado

**Files:**

- Modify: `src/lib/version.ts`

### Contexto

`APP_VERSION` está em `'0.25.0'` e o VERSION_HISTORY não tem entradas para 0.26.0 a 0.30.0-beta.1.

- [ ] **Passo 6.1 — Actualizar `APP_VERSION` e adicionar entradas ao histórico**

Substituir todo o conteúdo de `src/lib/version.ts` por:

```typescript
/**
 * Versão única da aplicação Nexora Desktop.
 * Actualizar aqui em cada release — propaga automaticamente
 * para todos os sítios que mostram a versão.
 */
export const APP_VERSION = '0.30.0-beta.1';

export interface VersionEntry {
  version: string;
  description: string;
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '0.30.0-beta.1',
    description:
      'v0.30.0-beta.1: Beta fechada — Watch Folders debounce (ficheiros grandes), SQLite WAL tuning, graceful shutdown de threads, cloud upload deduplicado, VisualComparatorPlayer split-screen para comparar original vs processado.',
  },
  {
    version: '0.29.0-alpha.1',
    description:
      'v0.29.0-alpha.1: Alpha Instrumentada — Watch Folders, Onboarding Wizard, Telemetria local opt-in, Bug Report integrado, mapeamento automático de erros do pipeline, keychain OS para credenciais cloud.',
  },
  {
    version: '0.28.0',
    description:
      'v0.28.0: Platform-Adaptive UX — design tokens CSS por plataforma (Windows/macOS/Linux), WindowControls.tsx (botões min/max/close Fluent), efeitos Mica (Windows 11) e Vibrancy (macOS), scrollbars nativas.',
  },
  {
    version: '0.27.0',
    description:
      'v0.27.0: Segurança cloud — credenciais armazenadas no OS keychain (Windows Credential Manager / macOS Keychain / Linux Secret Service), fix path traversal SMB, auditoria de segurança completa.',
  },
  {
    version: '0.26.0',
    description:
      'v0.26.0: CI/CD release pipeline, sync automático CHANGELOG + SYNC-STATE, check-translations gate, builds assinados Windows/macOS.',
  },
  {
    version: '0.25.0',
    description:
      'v0.25.0: Cloud File Browser — navegar, descarregar e apagar ficheiros em FTP/SFTP/SMB/S3/GDrive directamente nas definições; cloud upload para destinos agora accionado automaticamente após processamento; GDrive upsert (PATCH se ficheiro já existe); correcções GDrive Browse (base_path → folder ID, raiz My Drive).',
  },
  {
    version: '0.24.0',
    description:
      'v0.24.0: sistema de logging completo (ficheiros rotativos, verbosidade, aba Logs nas Settings, envio ao developer); settings aplicam ao vivo (idioma e concorrência); cache display na aba System; GDrive OAuth melhorado (URL clicável + código copiável); CloudDestinationPicker no BatchSubmitModal; MinIO local isolado para desenvolvimento.',
  },
  {
    version: '0.23.0',
    description:
      'v0.23.0: navegação in-app para ficheiros processados, popup de reprocessamento em foreground (portal), Pipeline Summary clicável com painel expansível, delete e factory reset com autorização explícita de ficheiros, 6 novas chaves i18n.',
  },
  {
    version: '0.22.0',
    description:
      'v0.22.0: MediaInfo com tabs horizontais, caminhos original/processado visíveis, reprocessar com selector de perfil, botões explorador separados (original/processado), download de ficheiro processado, fila com navegação para asset, dashboard scrollável, registo de actividade, 16 novas chaves i18n, manual do utilizador.',
  },
  {
    version: '0.21.0',
    description:
      'v0.21.0: sidecar reconstruído com todos os fixes activos, max_concurrent_jobs funcional, output_dir migrado automaticamente de temp para Videos/Nexora Output, filenames nos jobs da fila, log de acções, feedback de retry/cancel.',
  },
  {
    version: '0.20.0',
    description:
      'v0.20.0: output_dir padrão para Videos/Nexora Output, MediaInfo original vs processado com toggle, caminho do ficheiro visível no player, SHA-256 e TAGS no Copy All, limpeza GitHub, Videos_Tests incluídos.',
  },
  {
    version: '0.19.0',
    description:
      'v0.19.0: suporte H.265/HEVC e VP9, BatchSubmitModal com estimativas, thumbnails automáticos, player inline na Biblioteca, MediaInfo detalhado no Detalhe de Asset, correcções VMAF Windows, navegação de detalhes clicável.',
  },
  {
    version: '0.18.0',
    description:
      'Auditoria v0.18.0: drag-drop corrigido, sidecar stateless, CSP estrita, least-privilege, ESLint+Prettier, Husky, testes de componentes, recharts, Radix Dialog, sonner, tauri-plugin-store, telemetria opt-in.',
  },
  {
    version: '0.17.0',
    description:
      'Estabilização e documentação: README completo, manual do utilizador, guia de ecrãs, HelpOverlay integrado.',
  },
  {
    version: '0.16.0',
    description:
      'UI/UX overhaul completo: TopBar com métricas circulares, definições por tabs (Geral, Interface, Sistema, Avançado, Sobre), pipeline de 8 fases com resumo visual, aprovação de quarentena, VMAF activo, perfis com dropdown, tema e idioma.',
  },
  {
    version: '0.15.0',
    description:
      'Pipeline de quarentena QC pré/pós, estados qc_quarantined e qc_rejected, aprovação manual de jobs, VMAF scoring com libvmaf.',
  },
  {
    version: '0.14.0',
    description:
      'Workers FFmpeg bundled, GPU auto-detect (NVENC/AMF/QSV), sidecar Node.js estável, logs estruturados, fila em memória + SQLite.',
  },
  {
    version: '0.13.0',
    description:
      'Factory reset, system tray, schema SQLite completo, deep links nexora://, auto-updater Tauri built-in.',
  },
  {
    version: '0.12.0',
    description:
      'Frontend React 19 + Zustand + Tailwind v4, drag-and-drop nativo Tauri, notificações do SO.',
  },
  {
    version: '0.11.0',
    description: 'Tauri 2.x setup, IPC commands, CI/CD GitHub Actions, builds Windows/macOS/Linux.',
  },
  {
    version: '0.10.0',
    description: 'Protótipo inicial: shell Tauri, esqueleto React, estrutura de projecto desktop.',
  },
];
```

- [ ] **Passo 6.2 — Verificar tipos**

```powershell
npm run typecheck
```

- [ ] **Passo 6.3 — Commit**

```bash
git add src/lib/version.ts
git commit -m "fix(version): actualizar APP_VERSION para 0.30.0-beta.1 + histórico completo 0.26-0.30"
```

---

## Task 7 — Feature 7: VisualComparatorPlayer

**Files:**

- Create: `src/components/VisualComparatorPlayer.tsx`
- Modify: `src/pages/AssetDetailPage.tsx`
- Modify: `src/i18n/locales/en/base.json`
- Modify: `src/i18n/locales/pt/common.json`

### Contexto

Componente split-screen para comparar visualmente o vídeo original com o processado. Integrado como nova tab no AssetDetailPage, visível apenas quando `asset.output_path` não é nulo.

### Sub-task 7a: i18n keys

- [ ] **Passo 7a.1 — Adicionar chaves `comparator` ao `src/i18n/locales/en/base.json`**

Localizar o final do JSON (antes do `}` de fecho) e adicionar uma nova chave `"comparator"` ao objecto raiz. O JSON termina com `"description": "Description"\n  }\n}`. Inserir antes do `}` final:

```json
  "comparator": {
    "tab": "Comparator",
    "original": "Original",
    "processed": "Processed",
    "noOutput": "Processed file not available",
    "dragHint": "Drag to compare"
  }
```

- [ ] **Passo 7a.2 — Adicionar chaves `comparator` ao `src/i18n/locales/pt/common.json`**

No ficheiro PT, localizar o final do JSON e adicionar:

```json
  "comparator": {
    "tab": "Comparador",
    "original": "Original",
    "processed": "Processado",
    "noOutput": "Ficheiro processado não disponível",
    "dragHint": "Arrasta para comparar"
  }
```

- [ ] **Passo 7a.3 — Verificar JSON válido**

```powershell
node -e "require('./src/i18n/locales/en/base.json'); require('./src/i18n/locales/pt/common.json'); console.log('JSON OK')"
```

Esperado: `JSON OK`

### Sub-task 7b: Criar VisualComparatorPlayer.tsx

- [ ] **Passo 7b.1 — Criar `src/components/VisualComparatorPlayer.tsx`**

```typescript
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VisualComparatorPlayerProps {
  originalPath: string;
  processedPath: string;
}

export function VisualComparatorPlayer({
  originalPath,
  processedPath,
}: VisualComparatorPlayerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const [splitPct, setSplitPct] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isDragging = useRef(false);

  const leftSrc = convertFileSrc(originalPath);
  const rightSrc = convertFileSrc(processedPath);

  // Sincronizar vídeo direito com o esquerdo
  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const onTimeUpdate = () => {
      setCurrentTime(left.currentTime);
      if (Math.abs(right.currentTime - left.currentTime) > 0.1) {
        right.currentTime = left.currentTime;
      }
    };

    const onLoadedMetadata = () => setDuration(left.duration);

    left.addEventListener('timeupdate', onTimeUpdate);
    left.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      left.removeEventListener('timeupdate', onTimeUpdate);
      left.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    if (left.paused) {
      await Promise.all([left.play(), right.play()]);
      setIsPlaying(true);
    } else {
      left.pause();
      right.pause();
      setIsPlaying(false);
    }
  }, []);

  const onScrubChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (leftRef.current) leftRef.current.currentTime = t;
    if (rightRef.current) rightRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSplitPct(pct);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Split-screen container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden select-none cursor-col-resize"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Vídeo original (fundo completo) */}
        <video
          ref={leftRef}
          src={leftSrc}
          className="absolute inset-0 w-full h-full object-contain"
          preload="metadata"
          muted={false}
          style={{ zIndex: 1 }}
        />

        {/* Vídeo processado (clip-path dinâmico, muted para evitar eco) */}
        <video
          ref={rightRef}
          src={rightSrc}
          className="absolute inset-0 w-full h-full object-contain"
          preload="metadata"
          muted
          style={{
            zIndex: 2,
            clipPath: `inset(0 0 0 ${splitPct}%)`,
          }}
        />

        {/* Linha divisória */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_8px_rgba(0,0,0,0.6)]"
          style={{ left: `${splitPct}%`, zIndex: 3 }}
        />

        {/* Handle de drag */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center cursor-col-resize hover:scale-110 transition-transform"
          style={{ left: `${splitPct}%`, zIndex: 4 }}
          onMouseDown={onDividerMouseDown}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2L2 7L5 12M9 2L12 7L9 12" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Labels de lado */}
        <span className="absolute bottom-2 left-2 text-xs font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded" style={{ zIndex: 5 }}>
          {t('comparator.original')}
        </span>
        <span className="absolute bottom-2 right-2 text-xs font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded" style={{ zIndex: 5 }}>
          {t('comparator.processed')}
        </span>

        {/* Drag hint (oculta após hover) */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-white/60 bg-black/30 px-2 py-0.5 rounded-full pointer-events-none" style={{ zIndex: 5 }}>
          {t('comparator.dragHint')}
        </span>
      </div>

      {/* Controlos */}
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-brand/10 hover:bg-brand/20 text-brand flex items-center justify-center transition-colors flex-shrink-0"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={onScrubChange}
          className="flex-1 accent-brand h-1.5 cursor-pointer"
        />

        <span className="text-xs text-text-muted font-mono tabular-nums flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Passo 7b.2 — Verificar tipos**

```powershell
npm run typecheck
```

Esperado: sem erros. Se `convertFileSrc` der erro, verificar que `@tauri-apps/api` está instalado (`npm ls @tauri-apps/api`).

### Sub-task 7c: Integrar no AssetDetailPage

- [ ] **Passo 7c.1 — Adicionar import do componente a `src/pages/AssetDetailPage.tsx`**

No bloco de imports do ficheiro (após os imports existentes de componentes), adicionar:

```typescript
import { VisualComparatorPlayer } from '@/components/VisualComparatorPlayer';
```

- [ ] **Passo 7c.2 — Actualizar o tipo `activeDetailTab`**

Localizar:

```typescript
const [activeDetailTab, setActiveDetailTab] = useState<'qc' | 'metadata' | 'media' | 'history'>(
  'qc',
);
```

Substituir por:

```typescript
const [activeDetailTab, setActiveDetailTab] = useState<
  'qc' | 'metadata' | 'media' | 'history' | 'comparator'
>('qc');
```

- [ ] **Passo 7c.3 — Adicionar botão de tab "Comparador" na barra de tabs**

Localizar o botão da tab "Histórico" (contém `setActiveDetailTab('history')`). Logo **após** o fecho `</button>` desse botão, inserir:

```tsx
{
  asset.output_path && (
    <button
      onClick={() => {
        logActivity('Separador Comparador', 'click');
        setActiveDetailTab('comparator');
      }}
      className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
        activeDetailTab === 'comparator'
          ? 'border-brand text-brand'
          : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-surface/10'
      }`}
    >
      <ScanLine size={15} />
      {t('comparator.tab')}
    </button>
  );
}
```

**Nota:** `ScanLine` já está importado em AssetDetailPage (linha 11).

- [ ] **Passo 7c.4 — Adicionar painel de tab no bloco `{/* TAB PANELS */}`**

Localizar a secção de tab panels (após `{/* TAB PANELS */}`). No final dos painéis existentes (após o último `}`), antes do fecho do contentor de painéis, adicionar:

```tsx
{
  activeDetailTab === 'comparator' && asset.output_path && (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <VisualComparatorPlayer originalPath={asset.path} processedPath={asset.output_path} />
    </section>
  );
}
```

- [ ] **Passo 7c.5 — Verificar tipos e lint**

```powershell
npm run typecheck
npm run lint
```

Esperado: sem erros.

- [ ] **Passo 7c.6 — Commit da Feature 7**

```bash
git add src/components/VisualComparatorPlayer.tsx src/pages/AssetDetailPage.tsx src/i18n/locales/en/base.json src/i18n/locales/pt/common.json
git commit -m "feat(comparator): VisualComparatorPlayer split-screen + tab Comparador no AssetDetail"
```

---

## Task 8 — Release: Actualizar Versões nos Manifestos

**Files:**

- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

### Contexto

Três manifestos de versão precisam de estar alinhados: `package.json` usa semver completo (`0.30.0-beta.1`); `tauri.conf.json` deve ser numérico (`0.30.0` — constraint WiX MSI); `Cargo.toml` usa `0.30.0`.

- [ ] **Passo 8.1 — Actualizar `package.json`**

Localizar `"version": "0.29.0-alpha.1"` (ou versão anterior) e substituir por:

```json
"version": "0.30.0-beta.1",
```

- [ ] **Passo 8.2 — Actualizar `src-tauri/Cargo.toml`**

Localizar `version = "0.29.0"` (ou versão anterior) na secção `[package]` e substituir por:

```toml
version = "0.30.0"
```

- [ ] **Passo 8.3 — Actualizar `src-tauri/tauri.conf.json`**

Localizar `"version": "0.29.0"` (ou versão anterior) e substituir por:

```json
"version": "0.30.0",
```

- [ ] **Passo 8.4 — Verificar versões alinhadas**

```powershell
node -e "const p = require('./package.json'); console.log('pkg:', p.version)"
```

```powershell
grep '^version' src-tauri/Cargo.toml
```

Esperado: `pkg: 0.30.0-beta.1` e `version = "0.30.0"`.

- [ ] **Passo 8.5 — Commit**

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore(release): bump versões para 0.30.0-beta.1 / 0.30.0"
```

---

## Self-review

**Cobertura do spec:**

- [x] Fix 1: Watch Folders debounce 3s + ingested set → Task 1
- [x] Fix 2: SQLite WAL + synchronous=NORMAL + wal_autocheckpoint → Task 2
- [x] Fix 3: Graceful shutdown AtomicBool + WatchCmd::Shutdown + ExitRequested → Task 3
- [x] Fix 4: Event-driven logs → Task 4 (já implementado, verificado)
- [x] Fix 5: Remover trigger cloud frontend → Task 5
- [x] Fix 6: version.ts actualizado → Task 6
- [x] Feature 7: VisualComparatorPlayer + tab + i18n → Task 7
- [x] Release bump → Task 8

**Desvios justificados do spec:**

- Fix 4 é verify-only: `useLogs.ts` já implementa o pattern correcto com `listen('log-entry')` + fallback 60s. Nenhuma alteração necessária.
- Fix 5 idempotência: `cloud.rs` já filtra `WHERE status='pending'` — a query não precisa de alteração; só remover o trigger frontend.
- `WatchCmd::Shutdown` foi incluído na Task 1 (watch_folders.rs) e Task 3 (state.rs) por dependência entre os dois ficheiros.

**Consistência de tipos:**

- `VisualComparatorPlayer` recebe `originalPath: string` + `processedPath: string` — passados de `asset.path` (string) e `asset.output_path` (string | null, guardado por condicional).
- `activeDetailTab` type expandido com `'comparator'` em ambos os sítios (useState + botão).
- `WatchCmd::Shutdown` adicionado ao enum em `state.rs` e tratado no `match` em `watch_folders.rs`.
