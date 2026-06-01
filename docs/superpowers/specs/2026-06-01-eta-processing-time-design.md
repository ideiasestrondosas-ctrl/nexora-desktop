# ETA de Processamento — Design

**Data:** 2026-06-01
**Status:** Aprovado

---

## Requisito

Mostrar estimativa de tempo restante por fase durante o processamento de vídeo, em 3 locais: Queue, Dashboard, AssetDetail.

---

## Decisões de Design

- **Detalhe:** por fase activa + total restante (opção B aprovada)
- **Cálculo:** média histórica por resolução × duração do vídeo (±30% de tolerância)
- **Fallback:** "A calcular..." quando há menos de 1 amostra histórica
- **Tracking:** transições de `step` detectadas no handler Rust (queue.rs) sem alterar o sidecar

---

## Backend — Rust + SQLite

### Nova tabela `phase_durations`

```sql
CREATE TABLE IF NOT EXISTS phase_durations (
  id          INTEGER PRIMARY KEY,
  phase       TEXT    NOT NULL,
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  asset_duration_secs REAL,
  elapsed_ms  INTEGER NOT NULL,
  created_at  TEXT    DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_phase_durations_lookup
  ON phase_durations (phase, width, height);
```

### Tracking de transições de fase (queue.rs)

O handler `job:progress` já actualiza `step` na tabela `jobs`. Adicionamos um `HashMap<job_id, (step, Instant)>` em `AppState` chamado `phase_start_times`. Quando o step muda:

1. Calcular `elapsed_ms = now - start_time`
2. Inserir na tabela `phase_durations` com `width`, `height`, `asset_duration_secs` do asset
3. Actualizar o cache com `(new_step, now)`

### Novo comando IPC `get_phase_eta`

Input: `{ job_id: String }`

Output:

```rust
struct PhaseEtaResponse {
  has_data: bool,
  current_phase: String,
  current_phase_eta_ms: Option<i64>,
  remaining_phases: Vec<PhaseEtaItem>,  // fases ainda por executar
  total_remaining_ms: Option<i64>,
}

struct PhaseEtaItem {
  phase: String,
  estimated_ms: Option<i64>,
}
```

Lógica:

1. Ler `step`, `width`, `height`, `asset_duration_secs` do job
2. Determinar fases restantes (baseado na ordem: ingest, qc-pre, transcode, audio, proxy, thumbnail, qc-post, delivery)
3. Para cada fase restante: `SELECT AVG(elapsed_ms) FROM phase_durations WHERE phase = ? AND width = ? AND height = ? AND ABS(asset_duration_secs - ?) / ? < 0.3`
4. Se < 1 amostra: tentar sem filtro de duração (só resolução)
5. Se ainda 0 amostras: `has_data = false`

---

## Frontend

### Novo hook `src/hooks/usePhaseEta.ts`

```ts
function usePhaseEta(jobId: string | null, isProcessing: boolean): EtaResult;
```

- Só activo quando `isProcessing === true`
- Chama `invoke('get_phase_eta', { jobId })` quando `job.step` muda (via `useJobsStore`)
- Retorna `{ hasData, currentPhaseEtaMs, remainingPhases, totalRemainingMs }`
- Quando job termina: retorna `{ hasData: false, ... }`

### UI — 3 locais

**QueuePage.tsx** — abaixo da barra de progresso do job activo:

- Linha: `"Transcode ~6min 20s"` (fase actual + ETA)
- Badges das fases restantes: `[Áudio ~45s] [QC ~30s]`
- Fallback: `"A calcular..."`

**DashboardPage.tsx** — coluna direita do card de job activo:

- Compacto: `"~6min"` a seguir ao progresso percentual
- Fallback: sem texto extra (não rompe o layout)

**AssetDetailPage.tsx** — tab Histórico, job activo:

- Linha da fase activa: `"Transcode (activo)   ~6min 20s"`
- Linha restante: `"Áudio + Proxy + QC + DL   ~2min 10s"`
- Linha total: `"Total estimado   ~8min 30s"`
- Fallback: `"A calcular..."`

### i18n

Novas chaves em EN e PT (dentro de `"queue"` existente):

```json
"etaCalc": "A calcular...",
"etaRemaining": "~{{time}} restante",
"etaActive": "{{phase}} ~{{time}}"
```

Utilitário `formatEtaMs(ms: number): string` → `"6min 20s"` | `"45s"` | `"< 1s"`

---

## Ficheiros Alterados

| Ficheiro                          | Alteração                                                      |
| --------------------------------- | -------------------------------------------------------------- |
| `src-tauri/src/db/schema.sql`     | Tabela `phase_durations` + índice                              |
| `src-tauri/src/db/migrations.rs`  | Migração v2: criar tabela se não existe                        |
| `src-tauri/src/state.rs`          | `phase_start_times: Mutex<HashMap<String, (String, Instant)>>` |
| `src-tauri/src/queue.rs`          | Detectar transições de step; inserir phase_durations           |
| `src-tauri/src/commands/jobs.rs`  | `get_phase_eta` command                                        |
| `src-tauri/src/lib.rs`            | Registar `get_phase_eta` em generate_handler!                  |
| `src/hooks/usePhaseEta.ts`        | Novo hook                                                      |
| `src/lib/eta.ts`                  | `formatEtaMs()` utilitário                                     |
| `src/pages/QueuePage.tsx`         | ETA abaixo da barra de progresso                               |
| `src/pages/DashboardPage.tsx`     | ETA compacto no card                                           |
| `src/pages/AssetDetailPage.tsx`   | ETA detalhado no Histórico                                     |
| `src/i18n/locales/en/common.json` | Chaves etaCalc, etaRemaining, etaActive                        |
| `src/i18n/locales/pt/common.json` | Idem PT                                                        |
