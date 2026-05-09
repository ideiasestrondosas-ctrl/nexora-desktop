# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-09
Agente: Claude Sonnet 4.6

## O que foi feito

### Dependências npm instaladas
- zustand, better-sqlite3, esbuild, concurrently
- tailwindcss, @tailwindcss/vite, @types/better-sqlite3

### Configuração base
- vite.config.ts: plugin Tailwind + alias @/ → src/
- tsconfig.json: paths @/* → src/*
- tsc --noEmit: OK
- tauri build --debug: OK (gerou .exe, .msi, .nsis)

### Prompt Desktop 1 — Concluído
Todos os módulos Rust implementados e cargo check OK:

- src-tauri/Cargo.toml → rusqlite, uuid, chrono, anyhow, log, env_logger, tauri-plugin-notification, tray-icon feature
- src-tauri/tauri.conf.json → janela 1280×800, productName Nexora Desktop
- src-tauri/capabilities/default.json → + notification:default
- src-tauri/src/db/schema.sql → tabelas assets, jobs, settings, audit_log + índices
- src-tauri/src/db/mod.rs → open() com WAL + foreign_keys
- src-tauri/src/db/migrations.rs → run() via include_str!
- src-tauri/src/state.rs → AppState { db: Mutex<Connection>, sidecar_pid }
- src-tauri/src/commands/assets.rs → ingest_asset, list_assets, get_asset
- src-tauri/src/commands/jobs.rs → submit_job, cancel_job, get_job_status, list_jobs
- src-tauri/src/commands/settings.rs → get_settings, update_settings
- src-tauri/src/commands/system.rs → detect_gpu (NVENC/AMF/QSV/CPU), get_disk_space, get_app_version
- src-tauri/src/tray.rs → tray com Mostrar/Sair + clique no ícone
- src-tauri/src/sidecar.rs → spawn (graceful skip se binário não existir) + leitura JSON stdout
- src-tauri/src/lib.rs → setup completo com db, tray, sidecar, todos os commands registados

## Estado de compilação

- cargo check: OK
- tsc --noEmit: OK
- tauri build --debug: OK (validado antes do Prompt Desktop 1)

## Próximo passo

**Prompt Desktop 2 — Sidecar + Queue + Orchestrator + Workers**

Implementar em sidecar/:
1. NexoraSimpleQueue (memória + SQLite, prioridades, retry)
2. NexoraDesktopOrchestrator (step-by-step, idempotente)
3. Workers: ingest, qc-pre, transcode (GPU auto-detect), audio (R128), proxy, thumbnail, qc-post (VMAF), delivery
4. 6 perfis de transcode JSON
5. Comunicação sidecar ↔ Tauri via stdout/JSON

Referência de workers: C:\Dev\Nexora Media Processing\src\workers\ (somente leitura)

## Ficheiros criados/modificados nesta sessão

```
package.json (deps adicionadas)
vite.config.ts (tailwind + alias)
tsconfig.json (paths)
src-tauri/Cargo.toml
src-tauri/tauri.conf.json
src-tauri/capabilities/default.json
src-tauri/src/db/schema.sql (novo)
src-tauri/src/db/mod.rs (novo)
src-tauri/src/db/migrations.rs (novo)
src-tauri/src/state.rs (novo)
src-tauri/src/commands/mod.rs (novo)
src-tauri/src/commands/assets.rs (novo)
src-tauri/src/commands/jobs.rs (novo)
src-tauri/src/commands/settings.rs (novo)
src-tauri/src/commands/system.rs (novo)
src-tauri/src/tray.rs (novo)
src-tauri/src/sidecar.rs (novo)
src-tauri/src/lib.rs (reescrito)
PROGRESS-DESKTOP.md (actualizado)
SYNC-STATE.md (este ficheiro)
```
