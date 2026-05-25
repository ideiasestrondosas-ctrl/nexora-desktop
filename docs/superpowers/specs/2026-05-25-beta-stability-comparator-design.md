# Beta Stability + Visual Comparator — Design Spec (v0.30.0-beta.1)

**Data:** 2026-05-25
**Versão alvo:** v0.30.0-beta.1 (beta fechada)
**Agente:** Claude Code (claude-sonnet-4-6)

---

## Contexto

A v0.29.0-alpha.1 está publicada e funcional. Análise multi-agente (Gemini, GPT-5.5, Kimi 2.6) identificou 6 problemas que bloqueiam uma beta fiável e um feature premium que diferencia o produto para testers técnicos.

Este spec cobre a **Abordagem B** aprovada: corrigir os 6 bugs críticos + implementar o VisualComparatorPlayer.

---

## Scope

### O que entra

1. Watch Folders debounce + deduplicação
2. SQLite WAL mode
3. Graceful shutdown das threads background
4. Event-driven logs (eliminar polling)
5. Cloud upload deduplicação (remover trigger frontend)
6. `version.ts` alinhado com versão real
7. VisualComparatorPlayer — comparador split-screen no AssetDetail

### O que NÃO entra

- Cloud upload progress bar (trait refactor demasiado extenso)
- Keychain fallback Linux headless (relevante só em servidores headless, fora do scope beta)
- CPU throttling / afinidade de threads FFmpeg
- Auto-purge de temporários órfãos no startup
- Code signing Windows / notarização macOS
- Novas plataformas cloud ou providers

---

## Fix 1 — Watch Folders Debounce + Deduplicação

### Problema

O crate `notify` emite `EventKind::Create` seguido de múltiplos `Modify` quando um ficheiro está a ser copiado. O handler actual emite `watch-folder-file-added` imediatamente no primeiro evento, fazendo FFmpeg/FFprobe tentar abrir um ficheiro incompleto.

### Design

**Estrutura de dados no thread do watcher (`watch_folders.rs`):**

```rust
struct PendingFile {
    size: u64,       // tamanho na última medição
    stable_since: Instant, // quando o tamanho ficou estável
}

let mut pending: HashMap<PathBuf, PendingFile> = HashMap::new();
let mut ingested: HashSet<PathBuf> = HashSet::new();
```

**Fluxo:**

1. `EventKind::Create` ou `Modify(ModifyKind::Data(_))` → inserir/actualizar `pending[path] = PendingFile { size, stable_since: now }` se tamanho mudou; não alterar `stable_since` se tamanho igual.
2. `EventKind::Remove` → remover de `pending` e `ingested`.
3. Loop de verificação a cada 1s: para cada entrada em `pending`, se `now - stable_since >= 3s` e path não está em `ingested` → emitir evento, mover para `ingested`, remover de `pending`.

**Critérios de "estável":** `file.metadata().len()` igual ao registado em `stable_since`. Tamanho 0 não conta como estável.

**Batch de múltiplos ficheiros:** O frontend já recebe os eventos individualmente via IPC. O batch (agrupar vários ficheiros num único modal de submit) é responsabilidade do frontend existente — sem mudanças necessárias.

### Ficheiros

- Modificar: `src-tauri/src/watch_folders.rs`

### Testes

- Teste unitário Rust: simular chegada de eventos Create+Modify+Modify com tamanho crescente → verificar que não emite antes de 3s de estabilidade.
- Teste: mesmo caminho com dois eventos Create → verificar que `ingested` previne duplo ingest.

---

## Fix 2 — SQLite WAL Mode

### Problema

O SQLite usa journal mode padrão (rollback journal). Com escrita concorrente de logs, telemetria e actualizações de progresso de jobs, os readers bloqueiam enquanto há writers. Em máquinas lentas, provoca lentidão percetível na UI.

### Design

Em `src-tauri/src/db/mod.rs`, após `Connection::open(path)`:

```rust
conn.execute_batch(
    "PRAGMA journal_mode=WAL;
     PRAGMA synchronous=NORMAL;
     PRAGMA wal_autocheckpoint=1000;"
)?;
```

- `journal_mode=WAL`: readers e writers coexistem sem bloqueio mútuo.
- `synchronous=NORMAL`: seguro para crash do processo (não do SO); bom compromisso perf/segurança.
- `wal_autocheckpoint=1000`: checkpoint automático a cada 1000 páginas (~4MB); evita crescimento infinito do WAL file.

Sem migração necessária — o PRAGMA é aplicado a cada abertura de conexão.

### Ficheiros

- Modificar: `src-tauri/src/db/mod.rs`

### Verificação

```rust
let mode: String = conn.query_row("PRAGMA journal_mode", [], |r| r.get(0))?;
assert_eq!(mode, "wal");
```

---

## Fix 3 — Graceful Shutdown das Threads Background

### Problema

`lib.rs` cria 3 threads no `setup()` que correm em loop infinito:

1. Disk space thread
2. Metrics thread
3. Watch folders thread (notify Watcher)

Nenhuma é notificada quando a app fecha. No Windows, o processo pode ficar hung enquanto o notify Watcher mantém handles de directório abertos.

### Design

**`AppState` recebe campo novo:**

```rust
pub shutdown: Arc<std::sync::atomic::AtomicBool>,
```

**Threads 1 e 2 (disk + metrics):**

```rust
let shutdown = Arc::clone(&state.shutdown);
std::thread::spawn(move || {
    while !shutdown.load(Ordering::Relaxed) {
        // ... trabalho existente ...
        std::thread::sleep(Duration::from_secs(2));
    }
});
```

**Thread 3 (watcher):** Adicionar variante `WatchCmd::Shutdown` ao enum existente. O loop do watcher verifica este comando e faz `break`, deixando o `Watcher` ser dropped.

**Handler de encerramento em `lib.rs`:**

```rust
.build(tauri::generate_context!())?
.run(|app_handle, event| {
    if let tauri::RunEvent::ExitRequested { .. } = event {
        if let Some(state) = app_handle.try_state::<AppState>() {
            state.shutdown.store(true, Ordering::Relaxed);
            if let Ok(tx) = state.watcher_tx.lock() {
                if let Some(tx) = tx.as_ref() {
                    let _ = tx.send(WatchCmd::Shutdown);
                }
            }
            if let Ok(mut pids) = state.active_pids.lock() {
                for (_, pid) in pids.drain() {
                    #[cfg(unix)]
                    unsafe { libc::kill(pid as i32, libc::SIGTERM); }
                    #[cfg(windows)]
                    // TerminateProcess via winapi ou via std::process::Command kill
                }
            }
        }
    }
});
```

### Ficheiros

- Modificar: `src-tauri/src/state.rs` (campo `shutdown`)
- Modificar: `src-tauri/src/lib.rs` (threads + RunEvent handler)
- Modificar: `src-tauri/src/watch_folders.rs` (WatchCmd::Shutdown)

---

## Fix 4 — Event-Driven Logs

### Problema

`LogPage.tsx` faz polling `invoke('get_logs')` a cada 5s independentemente de haver logs novos. Em laptops, mantém CPU acordada e drena bateria. Com a app aberta horas, acumula centenas de invocações desnecessárias.

### Design

**Rust — emitir evento após escrita:**

Em `src-tauri/src/logger.rs`, na função `write()`, após inserir no SQLite:

```rust
if let Some(app) = APP_HANDLE.get() {
    let _ = app.emit("log:update", ());
}
```

`APP_HANDLE` é um `OnceLock<AppHandle>` inicializado no `setup()` de `lib.rs` (padrão já usado noutros locais do projecto).

**React — substituir polling:**

Em `src/pages/LogPage.tsx`:

```typescript
useEffect(() => {
  fetchLogs(); // carga inicial

  const unlisten = listen('log:update', () => fetchLogs());

  // fallback polling a 30s para eventos perdidos
  const interval = setInterval(fetchLogs, 30_000);

  return () => {
    unlisten.then((f) => f());
    clearInterval(interval);
  };
}, []);
```

O polling a 5s é **removido** e substituído por fallback a 30s.

### Ficheiros

- Modificar: `src-tauri/src/logger.rs`
- Modificar: `src-tauri/src/lib.rs` (inicializar APP_HANDLE se não existir)
- Modificar: `src/pages/LogPage.tsx`

---

## Fix 5 — Cloud Upload Deduplicação

### Problema

O upload cloud pós-job é disparado em dois sítios:

1. **`App.tsx`** — `useEffect` que observa mudanças de status para `'done'` e chama `invoke('process_cloud_destinations', { jobId })`.
2. **`queue.rs`** — `tauri::async_runtime::spawn` após emitir `job:completed`.

Se o frontend estiver montado quando um job completa, o upload é feito duas vezes, podendo criar ficheiros duplicados no destino cloud e duplicar o estado em `job_cloud_destinations`.

### Design

Remover o trigger do frontend. O backend é o único dono do upload pós-job.

**`App.tsx`:** Apagar o `useEffect` que chama `process_cloud_destinations`. O frontend continua a ouvir `job:completed` apenas para actualizar a UI (status badges, lista de jobs).

**`queue.rs`:** Sem alterações — o spawn existente permanece.

**Idempotência:** O comando `run_cloud_uploads` verifica se o destino já tem status `'uploaded'` antes de tentar. Caso a verificação não exista, adicionar `WHERE status != 'uploaded'` na query de destinos pendentes.

### Ficheiros

- Modificar: `src/App.tsx` (remover useEffect de cloud upload)
- Modificar: `src-tauri/src/commands/cloud.rs` (verificar idempotência na query)

---

## Fix 6 — version.ts Alinhado

### Problema

`src/lib/version.ts` tem a última entrada em `0.25.0`. A UI About mostra versão desactualizada a testers.

### Design

Adicionar entradas ao array `VERSION_HISTORY` para as versões publicadas desde 0.25.0 até 0.30.0-beta.1. O formato existente é mantido:

```typescript
{ version: '0.29.0-alpha.1', date: '2026-05-25', highlights: ['Watch Folders', 'Onboarding', 'Telemetria opt-in', 'Bug Report integrado'] },
{ version: '0.30.0-beta.1', date: '2026-05-XX', highlights: ['Graceful shutdown', 'SQLite WAL', 'Visual Comparator'] },
```

### Ficheiros

- Modificar: `src/lib/version.ts`

---

## Feature 7 — VisualComparatorPlayer

### Objectivo

Permitir ao utilizador comparar visualmente o vídeo original com o processado através de um slider deslizante. Integrado no `AssetDetailPage` como nova tab, visível apenas quando `asset.output_path` existe.

### Arquitectura

```
AssetDetailPage
  └── [nova] Tab "Comparador"  (só visível se output_path não nulo)
        └── VisualComparatorPlayer
              ├── ContainerDiv (position: relative, overflow: hidden)
              │     ├── <video> leftRef   ← original  (z-index: 1)
              │     ├── <video> rightRef  ← processado (z-index: 2, clip-path dinâmico)
              │     └── DividerHandle     ← div arrastável (z-index: 3)
              └── Controls
                    ├── Play/Pause button (actua nos dois elementos)
                    ├── Scrubber (<input type="range">)
                    └── Timestamp display
```

### Acesso aos ficheiros

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';

const leftSrc = convertFileSrc(asset.path);
const rightSrc = convertFileSrc(asset.outputPath);
```

`convertFileSrc` converte caminhos locais para o protocolo `asset://` do Tauri, já usado noutros componentes. Sem novos comandos Rust.

### Split visual

O vídeo original (`leftRef`) ocupa o container completo. O vídeo processado (`rightRef`) fica em cima com:

```css
clip-path: inset(0 0 0 var(--split-px));
```

O `DividerHandle` é uma div vertical posicionada em `left: var(--split-px)`. O drag actualiza `--split-px` via `onMouseMove`/`onTouchMove`.

Estado inicial: `splitPx = containerWidth / 2` (50/50).

### Sincronismo de playback

```typescript
// timeupdate no vídeo esquerdo sincroniza o direito
leftRef.current.addEventListener('timeupdate', () => {
  if (Math.abs(rightRef.current.currentTime - leftRef.current.currentTime) > 0.1) {
    rightRef.current.currentTime = leftRef.current.currentTime;
  }
});
```

- Play/Pause: ambos em simultâneo via `leftRef.current.play(); rightRef.current.play()`.
- Scrubber: seek em ambos.
- `rightRef` tem `muted` para evitar eco de áudio.
- Ambos têm `preload="metadata"` — só carregam o necessário até o utilizador fazer play.

### Labels de lado

Overlay fixo no canto inferior esquerdo/direito:

- Esquerda: `ORIGINAL`
- Direita: `PROCESSADO`

Usando classes Tailwind `absolute bottom-2 left-2 text-xs font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded`.

### i18n

Chaves mínimas necessárias:

```json
"comparator": {
    "tab": "Comparador",
    "original": "Original",
    "processed": "Processado",
    "noOutput": "Ficheiro processado não disponível",
    "dragHint": "Arrasta para comparar"
}
```

### Ficheiros

| Ficheiro                                    | Alteração                                        |
| ------------------------------------------- | ------------------------------------------------ |
| `src/components/VisualComparatorPlayer.tsx` | Novo (~150 linhas)                               |
| `src/pages/AssetDetailPage.tsx`             | Nova tab "Comparador" + renderização condicional |
| `src/i18n/locales/en/base.json`             | Chaves `comparator.*`                            |
| `src/i18n/locales/pt/common.json`           | Tradução PT                                      |

Sem dependências npm novas. Sem comandos Rust novos.

### Error states

- `output_path` nulo ou ficheiro não encontrado: mostrar mensagem `t('comparator.noOutput')` com ícone.
- Erro de load do vídeo: `onError` em cada `<video>` mostra toast e esconde o comparador.

---

## Ficheiros Afectados — Resumo

| Ficheiro                                    | Fixes                                   |
| ------------------------------------------- | --------------------------------------- |
| `src-tauri/src/db/mod.rs`                   | Fix 2 (WAL)                             |
| `src-tauri/src/state.rs`                    | Fix 3 (shutdown AtomicBool)             |
| `src-tauri/src/lib.rs`                      | Fix 3 (threads + RunEvent)              |
| `src-tauri/src/watch_folders.rs`            | Fix 1 (debounce) + Fix 3 (Shutdown cmd) |
| `src-tauri/src/logger.rs`                   | Fix 4 (emit log:update)                 |
| `src-tauri/src/commands/cloud.rs`           | Fix 5 (idempotência query)              |
| `src/App.tsx`                               | Fix 5 (remover useEffect cloud)         |
| `src/pages/LogPage.tsx`                     | Fix 4 (event-driven)                    |
| `src/lib/version.ts`                        | Fix 6 (entradas em falta)               |
| `src/components/VisualComparatorPlayer.tsx` | Feature 7 (novo)                        |
| `src/pages/AssetDetailPage.tsx`             | Feature 7 (nova tab)                    |
| `src/i18n/locales/en/base.json`             | Feature 7 (chaves comparator)           |
| `src/i18n/locales/pt/common.json`           | Feature 7 (tradução PT)                 |

---

## Critérios de Conclusão

- [ ] Copiar ficheiro 2GB para watch folder → ingest só começa após fim da cópia
- [ ] `PRAGMA journal_mode` retorna `wal` no startup
- [ ] Fechar app durante transcode → nenhum processo `node` ou `ffmpeg` orphan no gestor de tarefas
- [ ] LogPage não faz chamadas IPC quando não há logs novos (verificável em DevTools Network)
- [ ] Job completo com destino cloud → exactamente 1 entrada em `job_cloud_destinations`
- [ ] UI About mostra `0.30.0-beta.1`
- [ ] AssetDetail com output_path mostra tab "Comparador"; slider sincroniza os dois vídeos

---

## Versão e Release

- `package.json`: `0.30.0-beta.1`
- `tauri.conf.json`: `0.30.0` (numérico — constraint MSI WiX)
- `Cargo.toml`: `0.30.0`
- Tag GitHub: `v0.30.0-beta.1`
- Release marcada como **Pre-release** no GitHub
