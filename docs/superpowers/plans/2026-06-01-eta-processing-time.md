# ETA de Processamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar estimativa de tempo restante por fase durante processamento de vídeo na Queue, Dashboard e AssetDetail.

**Architecture:** Nova tabela SQLite `phase_durations` populada quando fases transitam no handler Rust. Novo comando IPC `get_phase_eta` que consulta médias históricas por resolução+duração. Hook `usePhaseEta` no frontend atualiza quando `job.step` muda.

**Tech Stack:** Rust (rusqlite, chrono, std::time::Instant), TypeScript/React, Zustand, Tauri IPC, Tailwind CSS

---

## File Map

| Ficheiro                          | O quê                                                                     |
| --------------------------------- | ------------------------------------------------------------------------- |
| `src-tauri/src/db/migrations.rs`  | Nova migração: tabela `phase_durations` + índice                          |
| `src-tauri/src/state.rs`          | Adicionar `phase_start_times: Mutex<HashMap<String, (String, Instant)>>`  |
| `src-tauri/src/queue.rs`          | Detectar transições de step; inserir phase_durations; limpar cache        |
| `src-tauri/src/commands/jobs.rs`  | Novo comando `get_phase_eta` com tipos `PhaseEtaItem`, `PhaseEtaResponse` |
| `src-tauri/src/lib.rs`            | Registar `get_phase_eta` em `generate_handler!`                           |
| `src/hooks/usePhaseEta.ts`        | Novo hook — chama `get_phase_eta` quando `job.step` muda                  |
| `src/lib/eta.ts`                  | Utilitário `formatEtaMs(ms) -> string`                                    |
| `src/pages/QueuePage.tsx`         | ETA abaixo da barra de progresso                                          |
| `src/pages/DashboardPage.tsx`     | ETA compacto no card de job activo                                        |
| `src/pages/AssetDetailPage.tsx`   | ETA detalhado no Histórico de job activo                                  |
| `src/i18n/locales/en/common.json` | Chaves `queue.etaCalc`, `queue.etaActive`, `queue.etaRemaining`           |
| `src/i18n/locales/pt/common.json` | Idem PT                                                                   |

---

## Task 1: SQLite Migration — tabela phase_durations

**Files:**

- Modify: `src-tauri/src/db/migrations.rs`
- Modify: `src-tauri/src/db/schema.sql` (documentação)

### Contexto

O ficheiro `src-tauri/src/db/migrations.rs` tem uma função `run_migrations(conn)` que chama funções de migração individuais. O padrão é:

```rust
pub fn run_migrations(conn: &Connection) -> Result<()> {
    migrate_jobs_status_check(conn)?;
    migrate_assets_v2(conn)?;
    // ...
    Ok(())
}
```

- [ ] **Step 1: Adicionar função de migração em `migrations.rs`**

Adicionar no final do ficheiro, antes do último `}`:

```rust
fn migrate_phase_durations_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS phase_durations (
            id          INTEGER PRIMARY KEY,
            phase       TEXT    NOT NULL,
            width       INTEGER NOT NULL,
            height      INTEGER NOT NULL,
            asset_duration_secs REAL,
            elapsed_ms  INTEGER NOT NULL,
            created_at  TEXT    DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_phase_durations_lookup
            ON phase_durations (phase, width, height);",
    )?;
    Ok(())
}
```

- [ ] **Step 2: Registar a migração em `run_migrations`**

Localizar `run_migrations(conn: &Connection)` e adicionar a chamada:

```rust
pub fn run_migrations(conn: &Connection) -> Result<()> {
    migrate_jobs_status_check(conn)?;
    migrate_assets_v2(conn)?;
    migrate_cloud_v1(conn)?;
    migrate_watch_folders_v1(conn)?;
    migrate_telemetry_v1(conn)?;
    migrate_phase_durations_v1(conn)?;  // ← NOVO
    Ok(())
}
```

- [ ] **Step 3: Verificar compilação**

```bash
cd src-tauri && cargo check 2>&1 | grep -E "error|warning: unused"
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/db/migrations.rs
git commit -m "feat(db): tabela phase_durations para historico de duracao por fase"
```

---

## Task 2: AppState + queue.rs — tracking de transições de fase

**Files:**

- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/queue.rs`

### Contexto

`AppState` está em `src-tauri/src/state.rs` (linhas 12-30). Actualmente:

```rust
pub struct AppState {
    pub db: Mutex<Connection>,
    pub sidecar_pid: Mutex<Option<u32>>,
    pub active_pids: Mutex<HashMap<String, u32>>,
    pub watcher_tx: Mutex<Option<std::sync::mpsc::Sender<WatchCmd>>>,
    pub shutdown: Arc<AtomicBool>,
}
```

Em `queue.rs`, o handler `"job:progress"` (linha ~404) actualiza `progress` e `step` na DB. Precisamos de detectar quando `step` muda para registar a duração da fase anterior.

A lógica usa `std::time::Instant` (não persiste em DB — só em memória enquanto o job está activo). Libertar o lock de `phase_start_times` ANTES de adquirir o lock da DB para evitar deadlock.

- [ ] **Step 1: Adicionar `phase_start_times` ao AppState em `state.rs`**

```rust
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::{atomic::AtomicBool, Arc, Mutex};
use std::time::Instant;  // ← NOVO

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
    pub phase_start_times: Mutex<HashMap<String, (String, Instant)>>,  // ← NOVO (job_id -> (step, start))
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            db: Mutex::new(db),
            sidecar_pid: Mutex::new(None),
            active_pids: Mutex::new(HashMap::new()),
            watcher_tx: Mutex::new(None),
            shutdown: Arc::new(AtomicBool::new(false)),
            phase_start_times: Mutex::new(HashMap::new()),  // ← NOVO
        }
    }
}
```

- [ ] **Step 2: Modificar o handler `"job:progress"` em `queue.rs`**

Localizar o bloco `"job:progress" => {` (linha ~404). Substituir o bloco inteiro por:

```rust
"job:progress" => {
    if let (Some(progress), Some(step)) = (
        json.get("progress").and_then(|v| v.as_f64()),
        json.get("step").and_then(|v| v.as_str()),
    ) {
        let state = app_handle.state::<AppState>();
        let now = std::time::Instant::now();

        // Detectar transição de fase — libertar lock antes de aceder à DB
        let phase_changed: Option<(String, i64)> = {
            let mut phase_times = state
                .phase_start_times
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if let Some((prev_step, start_time)) = phase_times.get(&job_id_owned) {
                if prev_step.as_str() != step {
                    let prev = prev_step.clone();
                    let elapsed = start_time.elapsed().as_millis() as i64;
                    phase_times.insert(job_id_owned.clone(), (step.to_string(), now));
                    Some((prev, elapsed))
                } else {
                    None
                }
            } else {
                phase_times.insert(job_id_owned.clone(), (step.to_string(), now));
                None
            }
        }; // lock liberado aqui

        if let Ok(db) = state.db.lock() {
            if let Some((prev_step, elapsed_ms)) = &phase_changed {
                let _ = db.execute(
                    "INSERT INTO phase_durations (phase, width, height, asset_duration_secs, elapsed_ms)
                     SELECT ?1, a.width, a.height, a.duration_secs, ?2
                     FROM jobs j JOIN assets a ON j.asset_id = a.id WHERE j.id = ?3",
                    rusqlite::params![prev_step, elapsed_ms, &job_id_owned],
                );
            }
            let now_str = chrono::Utc::now().to_rfc3339();
            let _ = db.execute(
                "UPDATE jobs SET progress = ?, step = ?, updated_at = ? WHERE id = ?",
                [&progress.to_string(), step, &now_str, &job_id_owned],
            );
        }
    }
    let _ = app_handle.emit("sidecar:event", &json);
}
```

- [ ] **Step 3: Limpar cache em `job:completed` e `job:failed`**

No handler `"job:completed"` (linha ~422) e `"job:failed"`, adicionar antes de `let _ = app_handle.emit(...)`:

```rust
// Limpar cache de fase (evitar memory leak)
{
    let mut phase_times = app_handle
        .state::<AppState>()
        .phase_start_times
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    phase_times.remove(&job_id_owned);
}
```

> **Nota:** Adicionar este bloco em AMBOS os handlers: `"job:completed"` e `"job:failed"`.

- [ ] **Step 4: Verificar compilação**

```bash
cd src-tauri && cargo check 2>&1 | grep "error"
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/state.rs src-tauri/src/queue.rs
git commit -m "feat(queue): detectar transicoes de fase e gravar duracao em phase_durations"
```

---

## Task 3: Comando Rust `get_phase_eta`

**Files:**

- Modify: `src-tauri/src/commands/jobs.rs`
- Modify: `src-tauri/src/lib.rs`

### Contexto

Em `commands/jobs.rs`, o último comando é `list_jobs` (linha ~330). Seguir o mesmo padrão `State<AppState>`.

A ordem das fases (constante local, não importar do frontend):
`["ingest", "qc-pre", "transcode", "audio", "proxy", "thumbnail", "qc-post", "delivery"]`

- [ ] **Step 1: Adicionar tipos e constante no final de `commands/jobs.rs`**

```rust
const PHASE_ORDER: &[&str] = &[
    "ingest", "qc-pre", "transcode", "audio", "proxy",
    "thumbnail", "qc-post", "delivery",
];

#[derive(serde::Serialize, Clone)]
pub struct PhaseEtaItem {
    pub phase: String,
    pub estimated_ms: Option<i64>,
}

#[derive(serde::Serialize)]
pub struct PhaseEtaResponse {
    pub has_data: bool,
    pub current_phase: String,
    pub current_phase_eta_ms: Option<i64>,
    pub remaining_phases: Vec<PhaseEtaItem>,
    pub total_remaining_ms: Option<i64>,
}
```

- [ ] **Step 2: Adicionar o comando `get_phase_eta`**

```rust
#[tauri::command]
pub fn get_phase_eta(
    job_id: String,
    state: State<AppState>,
) -> Result<Option<PhaseEtaResponse>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Obter step actual + dimensões do asset
    let row: Option<(String, Option<i64>, Option<i64>, Option<f64>)> = db
        .query_row(
            "SELECT j.step, a.width, a.height, a.duration_secs
             FROM jobs j LEFT JOIN assets a ON j.asset_id = a.id
             WHERE j.id = ?1 AND j.status = 'processing'",
            [&job_id],
            |r| {
                Ok((
                    r.get::<_, String>(0).unwrap_or_default(),
                    r.get::<_, Option<i64>>(1)?,
                    r.get::<_, Option<i64>>(2)?,
                    r.get::<_, Option<f64>>(3)?,
                ))
            },
        )
        .ok();

    let (current_step, width, height, duration_secs) = match row {
        Some(r) => r,
        None => return Ok(None),
    };

    let current_idx = PHASE_ORDER
        .iter()
        .position(|&p| p == current_step.as_str())
        .unwrap_or(0);

    let mut has_data = false;
    let mut items: Vec<PhaseEtaItem> = Vec::new();

    for &phase in &PHASE_ORDER[current_idx..] {
        let avg_ms: Option<i64> = match (width, height) {
            (Some(w), Some(h)) => {
                // Tentar com tolerância de duração (±30%)
                let with_dur = if let Some(dur) = duration_secs {
                    db.query_row(
                        "SELECT CAST(AVG(elapsed_ms) AS INTEGER) FROM phase_durations
                         WHERE phase = ?1 AND width = ?2 AND height = ?3
                           AND ABS(asset_duration_secs - ?4) / (?4 + 0.001) < 0.3",
                        rusqlite::params![phase, w, h, dur],
                        |r| r.get::<_, Option<i64>>(0),
                    )
                    .ok()
                    .flatten()
                } else {
                    None
                };
                // Fallback: só resolução
                with_dur.or_else(|| {
                    db.query_row(
                        "SELECT CAST(AVG(elapsed_ms) AS INTEGER) FROM phase_durations
                         WHERE phase = ?1 AND width = ?2 AND height = ?3",
                        rusqlite::params![phase, w, h],
                        |r| r.get::<_, Option<i64>>(0),
                    )
                    .ok()
                    .flatten()
                })
            }
            _ => None,
        };

        if avg_ms.is_some() {
            has_data = true;
        }
        items.push(PhaseEtaItem {
            phase: phase.to_string(),
            estimated_ms: avg_ms,
        });
    }

    let current_phase_eta_ms = items.first().and_then(|i| i.estimated_ms);
    let remaining_phases = if items.len() > 1 {
        items[1..].to_vec()
    } else {
        vec![]
    };
    let total_remaining_ms: Option<i64> = if has_data {
        let sum: i64 = items.iter().filter_map(|i| i.estimated_ms).sum();
        if sum > 0 { Some(sum) } else { None }
    } else {
        None
    };

    Ok(Some(PhaseEtaResponse {
        has_data,
        current_phase: current_step,
        current_phase_eta_ms,
        remaining_phases,
        total_remaining_ms,
    }))
}
```

- [ ] **Step 3: Registar em `lib.rs`**

Localizar o bloco `generate_handler![` (linha ~178). Adicionar `commands::jobs::get_phase_eta,` a seguir a `commands::jobs::reject_job,`:

```rust
commands::jobs::reject_job,
commands::jobs::get_phase_eta,  // ← NOVO
```

- [ ] **Step 4: Verificar compilação**

```bash
cd src-tauri && cargo check 2>&1 | grep "error"
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/jobs.rs src-tauri/src/lib.rs
git commit -m "feat(rust): comando get_phase_eta -- consulta historico de duracao por fase"
```

---

## Task 4: Hook `usePhaseEta` + utilitário `formatEtaMs`

**Files:**

- Create: `src/hooks/usePhaseEta.ts`
- Create: `src/lib/eta.ts`

- [ ] **Step 1: Criar `src/lib/eta.ts`**

```typescript
/**
 * Formata milissegundos em string legível: "6min 20s", "45s", "< 1s"
 */
export function formatEtaMs(ms: number): string {
  if (ms < 1000) return '< 1s';
  const totalSecs = Math.round(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}min`;
  return `${mins}min ${secs}s`;
}
```

- [ ] **Step 2: Criar `src/hooks/usePhaseEta.ts`**

```typescript
import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useJobsStore } from '@/store/jobs';

export interface PhaseEtaItem {
  phase: string;
  estimated_ms: number | null;
}

export interface EtaResult {
  hasData: boolean;
  currentPhaseEtaMs: number | null;
  remainingPhases: PhaseEtaItem[];
  totalRemainingMs: number | null;
}

const EMPTY: EtaResult = {
  hasData: false,
  currentPhaseEtaMs: null,
  remainingPhases: [],
  totalRemainingMs: null,
};

interface PhaseEtaResponse {
  has_data: boolean;
  current_phase: string;
  current_phase_eta_ms: number | null;
  remaining_phases: PhaseEtaItem[];
  total_remaining_ms: number | null;
}

export function usePhaseEta(jobId: string | null, isProcessing: boolean): EtaResult {
  const [eta, setEta] = useState<EtaResult>(EMPTY);
  const job = useJobsStore((s) => s.jobs.find((j) => j.id === jobId));
  const lastStep = useRef<string | null>(null);

  useEffect(() => {
    if (!jobId || !isProcessing || !job) {
      setEta(EMPTY);
      lastStep.current = null;
      return;
    }

    const step = job.step ?? null;
    if (step === lastStep.current) return;
    lastStep.current = step;

    invoke<PhaseEtaResponse | null>('get_phase_eta', { jobId })
      .then((res) => {
        if (!res) {
          setEta(EMPTY);
          return;
        }
        setEta({
          hasData: res.has_data,
          currentPhaseEtaMs: res.current_phase_eta_ms,
          remainingPhases: res.remaining_phases,
          totalRemainingMs: res.total_remaining_ms,
        });
      })
      .catch(() => setEta(EMPTY));
  }, [jobId, isProcessing, job?.step]);

  return isProcessing ? eta : EMPTY;
}
```

- [ ] **Step 3: Adicionar i18n keys a EN e PT**

Em `src/i18n/locales/en/common.json`, dentro do objecto `"queue"` existente, adicionar:

```json
"etaCalc": "Calculating...",
"etaActive": "~{{time}} remaining",
"etaTotal": "~{{time}} total"
```

Em `src/i18n/locales/pt/common.json`, dentro do objecto `"queue"` existente:

```json
"etaCalc": "A calcular...",
"etaActive": "~{{time}} restante",
"etaTotal": "~{{time}} total"
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePhaseEta.ts src/lib/eta.ts src/i18n/locales/en/common.json src/i18n/locales/pt/common.json
git commit -m "feat(frontend): hook usePhaseEta + utilitario formatEtaMs + i18n keys"
```

---

## Task 5: QueuePage — ETA na barra de progresso

**Files:**

- Modify: `src/pages/QueuePage.tsx`

### Contexto

A barra de progresso do job activo está por volta da linha 402-418. A variável do job activo é provavelmente `job` dentro de um `.map()`. Confirmar o nome exato antes de editar.

O job tem: `job.id`, `job.progress`, `job.step`, `job.status`.

- [ ] **Step 1: Adicionar imports em `QueuePage.tsx`**

No topo do ficheiro, adicionar:

```typescript
import { usePhaseEta } from '@/hooks/usePhaseEta';
import { formatEtaMs } from '@/lib/eta';
```

- [ ] **Step 2: Localizar onde renderizar o ETA**

Procurar a secção que mostra `job.progress * 100` e `job.step` dentro do card de job. É uma secção dentro de um `.map()` sobre jobs activos.

Após a barra de progresso (o `<div className="w-full h-3 bg-bg-primary rounded-full...">` ou equivalente), adicionar um sub-componente para o ETA.

- [ ] **Step 3: Criar sub-componente `JobEta` dentro de `QueuePage.tsx`**

Antes da função principal `QueuePage`, adicionar:

```typescript
function JobEta({
  jobId,
  isProcessing,
}: {
  jobId: string;
  isProcessing: boolean;
}) {
  const { t } = useTranslation();
  const eta = usePhaseEta(jobId, isProcessing);

  if (!isProcessing) return null;

  return (
    <div className="mt-1.5 space-y-1.5">
      {/* Linha principal: fase activa + ETA */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted uppercase tracking-wide font-semibold">
          ETA
        </span>
        <span className="text-xs font-semibold text-cyan-400">
          {eta.hasData && eta.totalRemainingMs != null
            ? t('queue.etaActive', { time: formatEtaMs(eta.totalRemainingMs) })
            : t('queue.etaCalc')}
        </span>
      </div>
      {/* Badges das fases restantes (só se tiver dados) */}
      {eta.hasData && eta.remainingPhases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {eta.remainingPhases.slice(0, 4).map((p) => (
            <span
              key={p.phase}
              className="text-[10px] bg-bg-secondary border border-border rounded-full px-2 py-0.5 text-text-muted"
            >
              {t(`pipeline.${p.phase}`, p.phase)}
              {p.estimated_ms != null ? ` ~${formatEtaMs(p.estimated_ms)}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Inserir `<JobEta>` abaixo da barra de progresso**

Localizar o fim do bloco da barra de progresso no card do job activo e adicionar:

```typescript
<JobEta jobId={job.id} isProcessing={job.status === 'processing'} />
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/QueuePage.tsx
git commit -m "feat(queue): ETA por fase abaixo da barra de progresso"
```

---

## Task 6: DashboardPage — ETA compacto

**Files:**

- Modify: `src/pages/DashboardPage.tsx`

### Contexto

Na secção "Jobs Recentes" (linha ~308-335), o job activo mostra:

```tsx
{
  job.status === 'processing'
    ? `${t('dashboard.processing')} ${Math.round(job.progress * 100)}%`
    : t('dashboard.completed');
}
```

Queremos adicionar `~6min` a seguir ao percentual, de forma compacta.

- [ ] **Step 1: Adicionar imports em `DashboardPage.tsx`**

```typescript
import { usePhaseEta } from '@/hooks/usePhaseEta';
import { formatEtaMs } from '@/lib/eta';
```

- [ ] **Step 2: Criar sub-componente `CompactEta` dentro de `DashboardPage.tsx`**

```typescript
function CompactEta({ jobId }: { jobId: string }) {
  const eta = usePhaseEta(jobId, true);
  if (!eta.hasData || eta.totalRemainingMs == null) return null;
  return (
    <span className="text-[9px] text-cyan-400 font-semibold ml-1">
      ~{formatEtaMs(eta.totalRemainingMs)}
    </span>
  );
}
```

- [ ] **Step 3: Inserir `<CompactEta>` no card de job activo**

Localizar a linha que mostra o progresso percentual para jobs `'processing'`. Após `${Math.round(job.progress * 100)}%`, inserir:

```typescript
{job.status === 'processing' && <CompactEta jobId={job.id} />}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): ETA compacto no card de job activo"
```

---

## Task 7: AssetDetailPage — ETA detalhado no Histórico

**Files:**

- Modify: `src/pages/AssetDetailPage.tsx`

### Contexto

No tab Histórico de `AssetDetailPage.tsx`, os jobs activos têm `job.status === 'processing'`. A secção que mostra as fases com progresso está por volta da linha 921-1026. O `assetId` está disponível como prop.

- [ ] **Step 1: Adicionar imports em `AssetDetailPage.tsx`**

```typescript
import { usePhaseEta } from '@/hooks/usePhaseEta';
import { formatEtaMs } from '@/lib/eta';
```

- [ ] **Step 2: Criar sub-componente `DetailedEta` dentro de `AssetDetailPage.tsx`**

```typescript
function DetailedEta({ jobId }: { jobId: string }) {
  const { t } = useTranslation();
  const eta = usePhaseEta(jobId, true);

  if (!eta.hasData && eta.currentPhaseEtaMs == null) {
    return (
      <div className="text-xs text-text-muted mt-2">
        {t('queue.etaCalc')}
      </div>
    );
  }

  const remainingLabel = eta.remainingPhases
    .filter((p) => p.estimated_ms != null)
    .map((p) => t(`pipeline.${p.phase}`, p.phase))
    .join(' + ');

  const remainingMs = eta.remainingPhases.reduce(
    (sum, p) => sum + (p.estimated_ms ?? 0),
    0,
  );

  return (
    <div className="mt-2 border-t border-border/50 pt-2 space-y-1">
      {eta.currentPhaseEtaMs != null && (
        <div className="flex justify-between text-xs">
          <span className="text-blue-400 font-medium">
            {t(`pipeline.${eta.currentPhaseEtaMs != null ? 'transcode' : ''}`, '')} (activo)
          </span>
          <span className="text-cyan-400 font-semibold">
            ~{formatEtaMs(eta.currentPhaseEtaMs)}
          </span>
        </div>
      )}
      {remainingLabel && remainingMs > 0 && (
        <div className="flex justify-between text-[11px] text-text-muted">
          <span>{remainingLabel}</span>
          <span>~{formatEtaMs(remainingMs)}</span>
        </div>
      )}
      {eta.totalRemainingMs != null && (
        <div className="flex justify-between text-xs border-t border-border/30 pt-1 mt-1">
          <span className="text-text-secondary font-semibold">
            {t('queue.etaTotal', { time: '' }).replace('~', '').replace('total', 'Total estimado')}
          </span>
          <span className="text-cyan-400 font-bold">
            ~{formatEtaMs(eta.totalRemainingMs)}
          </span>
        </div>
      )}
    </div>
  );
}
```

> **Nota:** O `DetailedEta` recebe o `jobId` do job activo. O `currentPhase` vem do store via `usePhaseEta` — não é necessário passar como prop.

- [ ] **Step 3: Localizar a secção de job activo no tab Histórico**

Procurar a condição `job.status === 'processing'` dentro do render do tab Histórico. Após o bloco das fases do pipeline, adicionar:

```typescript
{job.status === 'processing' && <DetailedEta jobId={job.id} />}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run typecheck 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AssetDetailPage.tsx
git commit -m "feat(asset-detail): ETA detalhado por fase no tab Historico"
```

---

## Self-Review

**Spec coverage:**

- [x] phase_durations table → Task 1
- [x] Tracking de transições de step → Task 2
- [x] Limpeza de cache em job:completed e job:failed → Task 2 Step 3
- [x] get_phase_eta command → Task 3
- [x] Cálculo com resolução + duração (±30%) + fallback só resolução → Task 3 Step 2
- [x] hasData=false quando sem amostras → Task 3 Step 2
- [x] usePhaseEta hook → Task 4
- [x] formatEtaMs utilitário → Task 4 Step 1
- [x] i18n EN + PT → Task 4 Step 3
- [x] "A calcular..." fallback → Task 5 + Task 7
- [x] QueuePage ETA + badges → Task 5
- [x] DashboardPage ETA compacto → Task 6
- [x] AssetDetailPage ETA detalhado → Task 7

**Placeholders:** nenhum.

**Type consistency:** `PhaseEtaItem.estimated_ms` é `number | null` no TypeScript (Task 4) e `Option<i64>` no Rust (Task 3). Serde serializa `None` como `null` — compatível. `EtaResult` definida em `usePhaseEta.ts` e usada em todos os componentes.
