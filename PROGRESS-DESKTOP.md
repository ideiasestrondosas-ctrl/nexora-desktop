# Nexora Media Processing â€” Desktop Nativo â€” Estado do Projecto

> **âš ï¸ LEITURA OBRIGATÃ“RIA PARA TODOS OS AGENTES IA**
>
> Este ficheiro DEVE ser lido ANTES de qualquer trabalho no mÃ³dulo Desktop.
> DEVE ser actualizado no FIM de cada sessÃ£o de desenvolvimento.
> Existe para reduzir tokens, evitar retrabalho, e manter consistÃªncia.
>
> **Documento de referÃªncia:** `nexora-desktop-documento.md`

---

## ðŸ“‹ Identidade

| Campo | Valor |
|---|---|
| **Nome** | Nexora Media Processing â€” Desktop Nativo |
| **VersÃ£o** | 0.1.0 |
| **IDE** | Google Antigravity (fork VS Code com Gemini, Claude, ChatGPT) |
| **Stack Shell** | Tauri 2.x (Rust) |
| **Stack Frontend** | React 19 + TypeScript + Tailwind CSS + Zustand |
| **Stack Sidecar** | Node.js 20 + TypeScript + esbuild |
| **Base de dados** | SQLite via better-sqlite3 |
| **Media tools** | FFmpeg Â· FFprobe Â· MediaInfo Â· BS1770GAIN Â· MediaConch Â· HandBrakeCLI |
| **Build** | GitHub Actions (Tauri Action) |
| **Plataformas alvo** | Windows x64 Â· macOS Universal (Intel+ARM) Â· Linux x64 |
| **RelaÃ§Ã£o com Server** | MÃ³dulo separado, mesma base de qualidade e standards |

---

## âœ… O que estÃ¡ concluÃ­do

### Fase 0 â€” DocumentaÃ§Ã£o e Arquitectura
- [x] Documento de especificaÃ§Ã£o Desktop criado (nexora-desktop-documento.md)
- [x] PROGRESS-DESKTOP.md criado
- [x] ADRs Desktop definidos (ADR-D001 a ADR-D012)
- [x] Estrutura de directÃ³rios definida
- [x] Prompts Desktop 1-4 redigidos
- [x] Checklist de aceitaÃ§Ã£o definida
- [x] Mapeamento funcional Cloud â†’ Desktop documentado

### Fase 1 â€” Setup do Ambiente
- [ ] Script nexora-desktop-setup.sh/ps1 executado formalmente
- [x] Node.js 20 instalado e verificado
- [x] Rust (stable) instalado e verificado
- [x] Git instalado e verificado
- [ ] FFmpeg instalado e verificado (para testes)
- [x] DependÃªncias Tauri instaladas (VS Build Tools no Windows)

### Fase 2 â€” Estrutura do Projecto
- [x] Projecto Tauri criado (npm create tauri-app)
- [x] DependÃªncias npm instaladas (zustand, better-sqlite3, esbuild, concurrently, tailwindcss)
- [ ] Pastas criadas (sidecar/, src-tauri/binaries/, tests/) â€” faltam sidecar/ e tests/
- [x] tauri.conf.json configurado (janela 1280Ã—800, bundle, productName)
- [x] Path aliases @/ configurados (vite.config.ts + tsconfig.json)
- [x] tsc --noEmit: OK Â· cargo check: OK Â· tauri build --debug: OK

### Fase 3 â€” Prompt Desktop 1 (Tauri + SQLite + IPC) âœ… COMPLETO
- [x] tauri.conf.json completo com bundle, icons, productName, janela min/max
- [x] schema.sql criado com todas as tabelas (assets, jobs, settings, audit_log + Ã­ndices)
- [x] migrations.rs implementado (auto-migration no startup via include_str!)
- [x] commands/assets.rs (ingest_asset, list_assets, get_asset)
- [x] commands/jobs.rs (submit_job, cancel_job, get_job_status, list_jobs)
- [x] commands/settings.rs (get_settings, update_settings + defaults)
- [x] commands/system.rs (detect_gpu NVENC/AMF/QSV/CPU, get_disk_space, get_app_version)
- [x] tray.rs (system tray: Mostrar Nexora / Sair + clique no Ã­cone)
- [x] sidecar.rs (spawn graceful + leitura JSON stdout + emit Tauri events)
- [x] state.rs (AppState com Mutex<Connection> + sidecar_pid)
- [x] lib.rs completo (setup: db + tray + sidecar; invoke_handler com todos os commands)
- [x] cargo check: OK Â· tsc --noEmit: OK

### Fase 4 â€” Prompt Desktop 2 (Sidecar + Queue + Orchestrator + Workers)
- [x] NexoraSimpleQueue implementado (memÃ³ria + SQLite, prioridades, retry)
- [x] NexoraDesktopOrchestrator implementado (idempotente, step-by-step)
- [x] ingest-worker.ts
- [x] qc-pre-worker.ts
- [x] transcode-worker.ts (GPU auto-detect, todos os perfis)
- [x] audio-worker.ts (two-pass R128 + BS1770GAIN verificaÃ§Ã£o)
- [x] proxy-worker.ts
- [x] thumbnail-worker.ts
- [x] qc-post-worker.ts (VMAF, SHA-256, MediaConch)
- [x] delivery-worker.ts (mover + notificaÃ§Ã£o + audit log)
- [x] 6 perfis de transcode JSON criados
- [x] ComunicaÃ§Ã£o sidecar â†” Tauri via stdout/JSON funcional

### Fase 5 â€” Prompt Desktop 3 (Frontend React)
- [x] App.tsx com navegaÃ§Ã£o por tabs (Processar, HistÃ³rico, DefiniÃ§Ãµes)
- [x] DropZone.tsx (drag-and-drop + file dialog)
- [x] JobCard.tsx + ProgressBar.tsx
- [x] NexoraStatusBadge.tsx + VMAFGauge.tsx
- [x] ProcessPage.tsx (drop zone + jobs activos)
- [x] HistoryPage.tsx (assets processados + filtros)
- [x] SettingsPage.tsx (todas as definiÃ§Ãµes)
- [x] useTauriCommand.ts hook
- [x] useJobStatus.ts hook (polling 1s)
- [x] useNotification.ts hook
- [x] useGPU.ts hook
- [x] Stores Zustand (jobs, settings, assets)
- [x] Tema claro/escuro funcional
- [x] Paleta Nexora aplicada (#1A6FD4, #4FB8A0)

### Fase 6 â€” Prompt Desktop 4 (Build + Testes + DistribuiÃ§Ã£o)
- [ ] build-desktop.yml (GitHub Actions 3 plataformas)
- [ ] download-media-binaries.js funcional
- [ ] generate-fixtures.sh (ficheiros de teste)
- [ ] queue.test.ts
- [ ] orchestrator.test.ts
- [ ] workers.test.ts
- [ ] package.json com todos os scripts
- [ ] README-DESKTOP.md
- [ ] Auto-updater configurado

### Fase 7 â€” IntegraÃ§Ã£o e ValidaÃ§Ã£o Final
- [ ] Testar localmente (tauri dev) â€” funcional em 3 plataformas
- [ ] Testes unitÃ¡rios passam (>80% cobertura)
- [ ] Build funciona para Windows (.exe)
- [ ] Build funciona para macOS (.dmg universal)
- [ ] Build funciona para Linux (.AppImage + .deb)
- [ ] Checklist de aceitaÃ§Ã£o completa (PARTE 11 do documento)
- [ ] GitHub Release criado com artefactos das 3 plataformas

---

## ðŸ”„ Em progresso agora

```
Data:          2026-05-09
Agente:        Claude Sonnet 4.6
A trabalhar em: â€”
Bloqueios:     Nenhum
```

---

## ðŸ“ Estrutura de ficheiros actual

```
nexora-desktop/
â”œâ”€â”€ src/                        â† React boilerplate (ainda por implementar)
â”‚   â”œâ”€â”€ App.tsx, App.css, main.tsx
â”‚   â””â”€â”€ vite-env.d.ts
â”œâ”€â”€ src-tauri/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ lib.rs              â† Setup completo (db + tray + sidecar + commands)
â”‚   â”‚   â”œâ”€â”€ main.rs
â”‚   â”‚   â”œâ”€â”€ state.rs            â† AppState
â”‚   â”‚   â”œâ”€â”€ tray.rs             â† System tray
â”‚   â”‚   â”œâ”€â”€ sidecar.rs          â† GestÃ£o do processo sidecar
â”‚   â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â”‚   â”œâ”€â”€ mod.rs          â† open() com WAL
â”‚   â”‚   â”‚   â”œâ”€â”€ migrations.rs   â† Auto-migration
â”‚   â”‚   â”‚   â””â”€â”€ schema.sql      â† Tabelas completas
â”‚   â”‚   â””â”€â”€ commands/
â”‚   â”‚       â”œâ”€â”€ mod.rs
â”‚   â”‚       â”œâ”€â”€ assets.rs       â† ingest, list, get
â”‚   â”‚       â”œâ”€â”€ jobs.rs         â† submit, cancel, status, list
â”‚   â”‚       â”œâ”€â”€ settings.rs     â† get, update
â”‚   â”‚       â””â”€â”€ system.rs       â† gpu, disk, version
â”‚   â”œâ”€â”€ Cargo.toml              â† + rusqlite, uuid, chrono, anyhow, notification
â”‚   â”œâ”€â”€ tauri.conf.json         â† Configurado
â”‚   â””â”€â”€ capabilities/
â”‚       â””â”€â”€ default.json        â† + notification:default
â”œâ”€â”€ package.json                â† React 19 + todas as deps
â”œâ”€â”€ vite.config.ts              â† Tailwind + alias @/
â”œâ”€â”€ tsconfig.json               â† paths @/* â†’ src/*
â””â”€â”€ scripts/                   â† Scripts de setup/sync
```

---

## âš ï¸ Problemas conhecidos

| Data | Problema | Estado |
|---|---|---|
| â€” | Nenhum registado | â€” |

---

## ðŸ—ï¸ ADRs Desktop (ImutÃ¡veis)

| ADR | DecisÃ£o | JustificaÃ§Ã£o |
|---|---|---|
| ADR-D001 | Tauri 2.x como shell nativa | Instalador 10x menor, RAM 6x menor que Electron |
| ADR-D002 | Node.js sidecar para lÃ³gica media | Reutiliza workers do Server sem duplicaÃ§Ã£o |
| ADR-D003 | SQLite como Ãºnica base de dados | Zero configuraÃ§Ã£o, ficheiro local, backup trivial |
| ADR-D004 | Fila em memÃ³ria + SQLite | SubstituiÃ§Ã£o simples do BullMQ+Redis |
| ADR-D005 | Orchestrator local step-by-step | SubstituiÃ§Ã£o simples do Temporal.io |
| ADR-D006 | BinÃ¡rios media incluÃ­dos no instalador | Zero dependÃªncias para o utilizador |
| ADR-D007 | GPU auto-detectada no startup | NVENC/AMF/QSV sem config manual |
| ADR-D008 | NotificaÃ§Ãµes nativas do SO | SubstituiÃ§Ã£o de webhooks HTTP |
| ADR-D009 | Auto-updater via Tauri built-in | Updates automÃ¡ticos |
| ADR-D010 | Mesmos parÃ¢metros FFmpeg que Server | Compatibilidade de outputs |
| ADR-D011 | IPC via Tauri Commands | Sem servidor HTTP local |
| ADR-D012 | Deep links nexora:// | IntegraÃ§Ã£o nativa com SO |

---

## ðŸ“… HistÃ³rico de sessÃµes

> Nunca apagar linhas antigas. Adicionar sempre no final.

| Data | O que foi feito | Agente usado | Ficheiros criados/modificados |
|---|---|---|---|
| 2026-05-02 | DocumentaÃ§Ã£o Desktop criada, PROGRESS-DESKTOP.md criado, ADRs definidos, Prompts 1-4 redigidos | Claude Opus | nexora-desktop-documento.md, PROGRESS-DESKTOP.md |
| 2026-05-09 | Deps npm instaladas, Tailwind + aliases configurados, Prompt Desktop 1 completo (SQLite + IPC + Tray + Sidecar) | Claude Sonnet 4.6 | Cargo.toml, tauri.conf.json, schema.sql, lib.rs, state.rs, tray.rs, sidecar.rs, commands/* |
| 2026-05-09 | Prompt Desktop 2 completo: sidecar Node.js com fila, orchestrator e 8 workers (ingest, qc-pre, transcode GPU, audio R128, proxy, thumbnail, qc-post VMAF, delivery) + 6 perfis JSON + tsx + BOM fix | Claude Sonnet 4.6 | sidecar/* (17 ficheiros novos), package.json, src-tauri/src/lib.rs, src-tauri/src/sidecar.rs, tauri.conf.json |
| 2026-05-09 | Prompt Desktop 3 completo: Frontend React 19 com Zustand, Tailwind v4, 3 tabs de navegaÃ§Ã£o, hooks de polling e GPU, DropZone e JobCards. | Google Antigravity (Gemini 3.1 Pro) | src/**/*, package.json, src-tauri/Cargo.toml, src-tauri/src/lib.rs |

---

## ðŸŽ¯ PrÃ³ximos passos (ordenados por prioridade)

1. [x] ~~Instalar dependÃªncias~~ â€” feito
2. [x] ~~Prompt Desktop 1~~ â€” completo
3. [ ] Criar pasta `sidecar/` e `tests/`
4. [ ] Executar **Prompt Desktop 2** â€” Sidecar + Workers Node.js
5. [ ] Executar **Prompt Desktop 3** â€” Frontend React
6. [ ] Executar **Prompt Desktop 4** â€” Build + Testes
7. [ ] Descarregar binÃ¡rios: `npm run download:binaries`
8. [ ] Testar: `npm run tauri dev`
9. [ ] Build final + tag + GitHub Release

---

## ðŸ“ Contexto tÃ©cnico rÃ¡pido (para agentes IA)

**Portas em uso (desenvolvimento):**
- 1420 â†’ Vite dev server (frontend React)
- Sem servidor HTTP em produÃ§Ã£o (IPC directo Tauri)

**ConvenÃ§Ãµes de cÃ³digo:**
- TypeScript strict mode â€” sem `any` implÃ­cito
- Nomes em inglÃªs no cÃ³digo, comentÃ¡rios em portuguÃªs de Portugal
- Imports absolutos via paths aliases (`@/components/`, `@/hooks/`, etc.)
- Todos os erros sÃ£o typed (nunca `catch(e: any)`)
- Todos os IDs sÃ£o UUID v4
- FFmpeg SEMPRE via execFile (NUNCA exec com string concatenada)
- ParÃ¢metros FFmpeg: sempre arrays, nunca strings

**Limites de recursos:**
- Max jobs simultÃ¢neos: configurÃ¡vel (default 2, max 4)
- FFmpeg timeout: 4h (14400000ms)
- SQLite max size: sem limite prÃ¡tico
- Sidecar: 1 processo Node.js, multi-threaded via worker_threads se necessÃ¡rio

**RelaÃ§Ã£o com o Server:**
- Mesmos perfis de transcode (JSON iguais)
- Mesmos parÃ¢metros FFmpeg
- Mesmos thresholds VMAF (85/90/93)
- Mesmos targets LUFS (-23/-14) e True Peak (-1 dBTP)
- CÃ³digo dos workers reutilizÃ¡vel (adaptaÃ§Ã£o mÃ­nima para SQLite/sidecar)

---

*Este ficheiro Ã© a fonte de verdade do projecto Desktop.*
*Em caso de dÃºvida, consulta aqui.*
*Ãšltima actualizaÃ§Ã£o: 2026-05-09 por Claude Sonnet 4.6*
