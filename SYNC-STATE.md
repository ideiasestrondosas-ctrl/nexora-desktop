# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-09
Agente: Claude Sonnet 4.6

## O que foi feito

### Prompt Desktop 2 — Concluído
Sidecar Node.js completo com fila, orchestrator e todos os workers:

- sidecar/tsconfig.json → CommonJS, strict, resolveJsonModule
- sidecar/events.ts → protocolo JSON linha-a-linha stdout (SidecarEvent)
- sidecar/db.ts → wrapper better-sqlite3 (WAL + busy_timeout) + todos os helpers
- sidecar/profiles/types.ts → TranscodeProfile + loadProfile()
- sidecar/profiles/*.json → 6 perfis (broadcast-hd/sd, web-4k/hd, proxy, social)
- sidecar/workers/types.ts → ProgressCallback
- sidecar/workers/ingest-worker.ts → SHA-256 streaming + ffprobe metadata
- sidecar/workers/qc-pre-worker.ts → validação tamanho + codec + duração
- sidecar/workers/transcode-worker.ts → GPU auto-detect (NVENC→AMF→QSV→CPU), ADR-D010
- sidecar/workers/audio-worker.ts → EBU R128 dois passos + BS1770GAIN opcional
- sidecar/workers/proxy-worker.ts → proxy 960×540 libx264 veryfast
- sidecar/workers/thumbnail-worker.ts → frame JPEG a 5s (ou metade da duração)
- sidecar/workers/qc-post-worker.ts → VMAF (libvmaf opcional) + SHA-256 ficheiro final
- sidecar/workers/delivery-worker.ts → cópia para output_dir + audit log
- sidecar/orchestrator/NexoraDesktopOrchestrator.ts → pipeline 8 passos com pesos de progresso
- sidecar/queue/NexoraSimpleQueue.ts → poll SQLite 2s, MAX_CONCURRENT=2
- sidecar/index.ts → entry point (NEXORA_DB_PATH env var obrigatório)

### Ajustes adicionais
- src-tauri/src/sidecar.rs → passa NEXORA_DB_PATH env var ao sidecar no spawn
- src-tauri/src/lib.rs → db_path extraído para variável (passado ao sidecar)
- package.json → scripts sidecar:check, sidecar:build, sidecar:dev + tsx devDependency
- src-tauri/tauri.conf.json → removido BOM UTF-8 (causava "expected value at line 1 col 1")

## Estado de compilação

- cargo check: OK
- tsc --noEmit (sidecar): OK
- tsc --noEmit (frontend): OK (não alterado)

## Próximo passo

**Prompt Desktop 3 — Frontend React**

Implementar em src/:
1. Stores Zustand (jobs, assets, settings)
2. Hooks (useTauriCommand, useJobStatus, useNotification, useGPU)
3. Componentes (DropZone, JobCard, ProgressBar, NexoraStatusBadge, VMAFGauge)
4. Páginas (ProcessPage, HistoryPage, SettingsPage)
5. App.tsx com navegação por tabs
6. Tema claro/escuro com paleta Nexora (#1A6FD4, #4FB8A0)

## Ficheiros criados/modificados nesta sessão

```
package.json (scripts sidecar:* + tsx)
src-tauri/src/lib.rs (db_path extraído)
src-tauri/src/sidecar.rs (NEXORA_DB_PATH env var)
src-tauri/tauri.conf.json (BOM removido)
sidecar/tsconfig.json (novo)
sidecar/events.ts (novo)
sidecar/db.ts (novo)
sidecar/profiles/types.ts (novo)
sidecar/profiles/broadcast-hd.json (novo)
sidecar/profiles/broadcast-sd.json (novo)
sidecar/profiles/web-4k.json (novo)
sidecar/profiles/web-hd.json (novo)
sidecar/profiles/proxy.json (novo)
sidecar/profiles/social.json (novo)
sidecar/workers/types.ts (novo)
sidecar/workers/ingest-worker.ts (novo)
sidecar/workers/qc-pre-worker.ts (novo)
sidecar/workers/transcode-worker.ts (novo)
sidecar/workers/audio-worker.ts (novo)
sidecar/workers/proxy-worker.ts (novo)
sidecar/workers/thumbnail-worker.ts (novo)
sidecar/workers/qc-post-worker.ts (novo)
sidecar/workers/delivery-worker.ts (novo)
sidecar/orchestrator/NexoraDesktopOrchestrator.ts (novo)
sidecar/queue/NexoraSimpleQueue.ts (novo)
sidecar/index.ts (novo)
SYNC-STATE.md (este ficheiro)
```
