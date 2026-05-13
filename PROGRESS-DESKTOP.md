# Nexora Media Processing Ã¢â‚¬â€ Desktop Nativo Ã¢â‚¬â€ Estado do Projecto

> **Ã¢Å¡Â Ã¯Â¸Â LEITURA OBRIGATÃƒâ€œRIA PARA TODOS OS AGENTES IA**
>
> Este ficheiro DEVE ser lido ANTES de qualquer trabalho no mÃƒÂ³dulo Desktop.
> DEVE ser actualizado no FIM de cada sessÃƒÂ£o de desenvolvimento.
> Existe para reduzir tokens, evitar retrabalho, e manter consistÃƒÂªncia.
>
> **Documento de referÃƒÂªncia:** `nexora-desktop-documento.md`

---

## Ã°Å¸â€œâ€¹ Identidade

| Campo | Valor |
|---|---|
| **Nome** | Nexora Media Processing Ã¢â‚¬â€ Desktop Nativo |
| **VersÃƒÂ£o** | 0.1.0 |
| **IDE** | Google Antigravity (fork VS Code com Gemini, Claude, ChatGPT) |
| **Stack Shell** | Tauri 2.x (Rust) |
| **Stack Frontend** | React 19 + TypeScript + Tailwind CSS + Zustand |
| **Stack Sidecar** | Node.js 20 + TypeScript + esbuild |
| **Base de dados** | SQLite via better-sqlite3 |
| **Media tools** | FFmpeg Ã‚Â· FFprobe Ã‚Â· MediaInfo Ã‚Â· BS1770GAIN Ã‚Â· MediaConch Ã‚Â· HandBrakeCLI |
| **Build** | GitHub Actions (Tauri Action) |
| **Plataformas alvo** | Windows x64 Ã‚Â· macOS Universal (Intel+ARM) Ã‚Â· Linux x64 |
| **RelaÃƒÂ§ÃƒÂ£o com Server** | MÃƒÂ³dulo separado, mesma base de qualidade e standards |

---

## Ã¢Å“â€¦ O que estÃƒÂ¡ concluÃƒÂ­do

### Fase 0 Ã¢â‚¬â€ DocumentaÃƒÂ§ÃƒÂ£o e Arquitectura
- [x] Documento de especificaÃƒÂ§ÃƒÂ£o Desktop criado (nexora-desktop-documento.md)
- [x] PROGRESS-DESKTOP.md criado
- [x] ADRs Desktop definidos (ADR-D001 a ADR-D012)
- [x] Estrutura de directÃƒÂ³rios definida
- [x] Prompts Desktop 1-4 redigidos
- [x] Checklist de aceitaÃƒÂ§ÃƒÂ£o definida
- [x] Mapeamento funcional Cloud Ã¢â€ â€™ Desktop documentado

### Fase 1 Ã¢â‚¬â€ Setup do Ambiente
- [ ] Script nexora-desktop-setup.sh/ps1 executado formalmente
- [x] Node.js 20 instalado e verificado
- [x] Rust (stable) instalado e verificado
- [x] Git instalado e verificado
- [ ] FFmpeg instalado e verificado (para testes)
- [x] DependÃƒÂªncias Tauri instaladas (VS Build Tools no Windows)

### Fase 2 Ã¢â‚¬â€ Estrutura do Projecto
- [x] Projecto Tauri criado (npm create tauri-app)
- [x] DependÃƒÂªncias npm instaladas (zustand, better-sqlite3, esbuild, concurrently, tailwindcss)
- [ ] Pastas criadas (sidecar/, src-tauri/binaries/, tests/) Ã¢â‚¬â€ faltam sidecar/ e tests/
- [x] tauri.conf.json configurado (janela 1280Ãƒâ€”800, bundle, productName)
- [x] Path aliases @/ configurados (vite.config.ts + tsconfig.json)
- [x] tsc --noEmit: OK Ã‚Â· cargo check: OK Ã‚Â· tauri build --debug: OK

### Fase 3 Ã¢â‚¬â€ Prompt Desktop 1 (Tauri + SQLite + IPC) Ã¢Å“â€¦ COMPLETO
- [x] tauri.conf.json completo com bundle, icons, productName, janela min/max
- [x] schema.sql criado com todas as tabelas (assets, jobs, settings, audit_log + ÃƒÂ­ndices)
- [x] migrations.rs implementado (auto-migration no startup via include_str!)
- [x] commands/assets.rs (ingest_asset, list_assets, get_asset)
- [x] commands/jobs.rs (submit_job, cancel_job, get_job_status, list_jobs)
- [x] commands/settings.rs (get_settings, update_settings + defaults)
- [x] commands/system.rs (detect_gpu NVENC/AMF/QSV/CPU, get_disk_space, get_app_version)
- [x] tray.rs (system tray: Mostrar Nexora / Sair + clique no ÃƒÂ­cone)
- [x] sidecar.rs (spawn graceful + leitura JSON stdout + emit Tauri events)
- [x] state.rs (AppState com Mutex<Connection> + sidecar_pid)
- [x] lib.rs completo (setup: db + tray + sidecar; invoke_handler com todos os commands)
- [x] cargo check: OK Ã‚Â· tsc --noEmit: OK

### Fase 4 Ã¢â‚¬â€ Prompt Desktop 2 (Sidecar + Queue + Orchestrator + Workers)
- [x] NexoraSimpleQueue implementado (memÃƒÂ³ria + SQLite, prioridades, retry)
- [x] NexoraDesktopOrchestrator implementado (idempotente, step-by-step)
- [x] ingest-worker.ts
- [x] qc-pre-worker.ts
- [x] transcode-worker.ts (GPU auto-detect, todos os perfis)
- [x] audio-worker.ts (two-pass R128 + BS1770GAIN verificaÃƒÂ§ÃƒÂ£o)
- [x] proxy-worker.ts
- [x] thumbnail-worker.ts
- [x] qc-post-worker.ts (VMAF, SHA-256, MediaConch)
- [x] delivery-worker.ts (mover + notificaÃƒÂ§ÃƒÂ£o + audit log)
- [x] 6 perfis de transcode JSON criados
- [x] ComunicaÃƒÂ§ÃƒÂ£o sidecar Ã¢â€ â€ Tauri via stdout/JSON funcional

### Fase 5 Ã¢â‚¬â€ Prompt Desktop 3 (Frontend React)
- [x] App.tsx com navegaÃƒÂ§ÃƒÂ£o por tabs (Processar, HistÃƒÂ³rico, DefiniÃƒÂ§ÃƒÂµes)
- [x] DropZone.tsx (drag-and-drop + file dialog)
- [x] JobCard.tsx + ProgressBar.tsx
- [x] NexoraStatusBadge.tsx + VMAFGauge.tsx
- [x] ProcessPage.tsx (drop zone + jobs activos)
- [x] HistoryPage.tsx (assets processados + filtros)
- [x] SettingsPage.tsx (todas as definiÃƒÂ§ÃƒÂµes)
- [x] useTauriCommand.ts hook
- [x] useJobStatus.ts hook (polling 1s)
- [x] useNotification.ts hook
- [x] useGPU.ts hook
- [x] Stores Zustand (jobs, settings, assets)
- [x] Tema claro/escuro funcional
- [x] Paleta Nexora aplicada (#1A6FD4, #4FB8A0)

### Fase 6 Ã¢â‚¬â€ Prompt Desktop 4 (Build + Testes + DistribuiÃƒÂ§ÃƒÂ£o)
- [ ] build-desktop.yml (GitHub Actions 3 plataformas)
- [ ] download-media-binaries.js funcional
- [ ] generate-fixtures.sh (ficheiros de teste)
- [ ] queue.test.ts
- [ ] orchestrator.test.ts
- [ ] workers.test.ts
- [ ] package.json com todos os scripts
- [ ] README-DESKTOP.md
- [ ] Auto-updater configurado

### Fase 7 Ã¢â‚¬â€ IntegraÃƒÂ§ÃƒÂ£o e ValidaÃƒÂ§ÃƒÂ£o Final
- [ ] Testar localmente (tauri dev) Ã¢â‚¬â€ funcional em 3 plataformas
- [ ] Testes unitÃƒÂ¡rios passam (>80% cobertura)
- [ ] Build funciona para Windows (.exe)
- [ ] Build funciona para macOS (.dmg universal)
- [ ] Build funciona para Linux (.AppImage + .deb)
- [ ] Checklist de aceitaÃƒÂ§ÃƒÂ£o completa (PARTE 11 do documento)
- [ ] GitHub Release criado com artefactos das 3 plataformas

---

## Ã°Å¸â€â€ž Em progresso agora

```
Data:          2026-05-09
Agente:        Claude Sonnet 4.6
A trabalhar em: Ã¢â‚¬â€
Bloqueios:     Nenhum
```

---

## Ã°Å¸â€œÂ Estrutura de ficheiros actual

```
nexora-desktop/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ src/                        Ã¢â€ Â React boilerplate (ainda por implementar)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ App.tsx, App.css, main.tsx
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ vite-env.d.ts
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ src-tauri/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ src/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ lib.rs              Ã¢â€ Â Setup completo (db + tray + sidecar + commands)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ main.rs
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ state.rs            Ã¢â€ Â AppState
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ tray.rs             Ã¢â€ Â System tray
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ sidecar.rs          Ã¢â€ Â GestÃƒÂ£o do processo sidecar
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ db/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ mod.rs          Ã¢â€ Â open() com WAL
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ migrations.rs   Ã¢â€ Â Auto-migration
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ schema.sql      Ã¢â€ Â Tabelas completas
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ commands/
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ mod.rs
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ assets.rs       Ã¢â€ Â ingest, list, get
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ jobs.rs         Ã¢â€ Â submit, cancel, status, list
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ settings.rs     Ã¢â€ Â get, update
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ system.rs       Ã¢â€ Â gpu, disk, version
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Cargo.toml              Ã¢â€ Â + rusqlite, uuid, chrono, anyhow, notification
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ tauri.conf.json         Ã¢â€ Â Configurado
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ capabilities/
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ default.json        Ã¢â€ Â + notification:default
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ package.json                Ã¢â€ Â React 19 + todas as deps
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ vite.config.ts              Ã¢â€ Â Tailwind + alias @/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ tsconfig.json               Ã¢â€ Â paths @/* Ã¢â€ â€™ src/*
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ scripts/                   Ã¢â€ Â Scripts de setup/sync
```

---

## Ã¢Å¡Â Ã¯Â¸Â Problemas conhecidos

| Data | Problema | Estado |
|---|---|---|
| Ã¢â‚¬â€ | Nenhum registado | Ã¢â‚¬â€ |

---

## Ã°Å¸Ââ€”Ã¯Â¸Â ADRs Desktop (ImutÃƒÂ¡veis)

| ADR | DecisÃƒÂ£o | JustificaÃƒÂ§ÃƒÂ£o |
|---|---|---|
| ADR-D001 | Tauri 2.x como shell nativa | Instalador 10x menor, RAM 6x menor que Electron |
| ADR-D002 | Node.js sidecar para lÃƒÂ³gica media | Reutiliza workers do Server sem duplicaÃƒÂ§ÃƒÂ£o |
| ADR-D003 | SQLite como ÃƒÂºnica base de dados | Zero configuraÃƒÂ§ÃƒÂ£o, ficheiro local, backup trivial |
| ADR-D004 | Fila em memÃƒÂ³ria + SQLite | SubstituiÃƒÂ§ÃƒÂ£o simples do BullMQ+Redis |
| ADR-D005 | Orchestrator local step-by-step | SubstituiÃƒÂ§ÃƒÂ£o simples do Temporal.io |
| ADR-D006 | BinÃƒÂ¡rios media incluÃƒÂ­dos no instalador | Zero dependÃƒÂªncias para o utilizador |
| ADR-D007 | GPU auto-detectada no startup | NVENC/AMF/QSV sem config manual |
| ADR-D008 | NotificaÃƒÂ§ÃƒÂµes nativas do SO | SubstituiÃƒÂ§ÃƒÂ£o de webhooks HTTP |
| ADR-D009 | Auto-updater via Tauri built-in | Updates automÃƒÂ¡ticos |
| ADR-D010 | Mesmos parÃƒÂ¢metros FFmpeg que Server | Compatibilidade de outputs |
| ADR-D011 | IPC via Tauri Commands | Sem servidor HTTP local |
| ADR-D012 | Deep links nexora:// | IntegraÃƒÂ§ÃƒÂ£o nativa com SO |

---

## Ã°Å¸â€œâ€¦ HistÃƒÂ³rico de sessÃƒÂµes

> Nunca apagar linhas antigas. Adicionar sempre no final.

| Data | O que foi feito | Agente usado | Ficheiros criados/modificados |
|---|---|---|---|
| 2026-05-02 | DocumentaÃƒÂ§ÃƒÂ£o Desktop criada, PROGRESS-DESKTOP.md criado, ADRs definidos, Prompts 1-4 redigidos | Claude Opus | nexora-desktop-documento.md, PROGRESS-DESKTOP.md |
| 2026-05-09 | Deps npm instaladas, Tailwind + aliases configurados, Prompt Desktop 1 completo (SQLite + IPC + Tray + Sidecar) | Claude Sonnet 4.6 | Cargo.toml, tauri.conf.json, schema.sql, lib.rs, state.rs, tray.rs, sidecar.rs, commands/* |
| 2026-05-09 | Prompt Desktop 2 completo: sidecar Node.js com fila, orchestrator e 8 workers (ingest, qc-pre, transcode GPU, audio R128, proxy, thumbnail, qc-post VMAF, delivery) + 6 perfis JSON + tsx + BOM fix | Claude Sonnet 4.6 | sidecar/* (17 ficheiros novos), package.json, src-tauri/src/lib.rs, src-tauri/src/sidecar.rs, tauri.conf.json |
| 2026-05-09 | Prompt Desktop 3 completo: Frontend React 19 com Zustand, Tailwind v4, 3 tabs de navegaÃƒÂ§ÃƒÂ£o, hooks de polling e GPU, DropZone e JobCards. | Google Antigravity (Gemini 3.1 Pro) | src/**/*, package.json, src-tauri/Cargo.toml, src-tauri/src/lib.rs |

---

## Ã°Å¸Å½Â¯ PrÃƒÂ³ximos passos (ordenados por prioridade)

1. [x] ~~Instalar dependÃƒÂªncias~~ Ã¢â‚¬â€ feito
2. [x] ~~Prompt Desktop 1~~ Ã¢â‚¬â€ completo
3. [ ] Criar pasta `sidecar/` e `tests/`
4. [ ] Executar **Prompt Desktop 2** Ã¢â‚¬â€ Sidecar + Workers Node.js
5. [ ] Executar **Prompt Desktop 3** Ã¢â‚¬â€ Frontend React
6. [ ] Executar **Prompt Desktop 4** Ã¢â‚¬â€ Build + Testes
7. [ ] Descarregar binÃƒÂ¡rios: `npm run download:binaries`
8. [ ] Testar: `npm run tauri dev`
9. [ ] Build final + tag + GitHub Release

---

## Ã°Å¸â€œÂ Contexto tÃƒÂ©cnico rÃƒÂ¡pido (para agentes IA)

**Portas em uso (desenvolvimento):**
- 1420 Ã¢â€ â€™ Vite dev server (frontend React)
- Sem servidor HTTP em produÃƒÂ§ÃƒÂ£o (IPC directo Tauri)

**ConvenÃƒÂ§ÃƒÂµes de cÃƒÂ³digo:**
- TypeScript strict mode Ã¢â‚¬â€ sem `any` implÃƒÂ­cito
- Nomes em inglÃƒÂªs no cÃƒÂ³digo, comentÃƒÂ¡rios em portuguÃƒÂªs de Portugal
- Imports absolutos via paths aliases (`@/components/`, `@/hooks/`, etc.)
- Todos os erros sÃƒÂ£o typed (nunca `catch(e: any)`)
- Todos os IDs sÃƒÂ£o UUID v4
- FFmpeg SEMPRE via execFile (NUNCA exec com string concatenada)
- ParÃƒÂ¢metros FFmpeg: sempre arrays, nunca strings

**Limites de recursos:**
- Max jobs simultÃƒÂ¢neos: configurÃƒÂ¡vel (default 2, max 4)
- FFmpeg timeout: 4h (14400000ms)
- SQLite max size: sem limite prÃƒÂ¡tico
- Sidecar: 1 processo Node.js, multi-threaded via worker_threads se necessÃƒÂ¡rio

**RelaÃƒÂ§ÃƒÂ£o com o Server:**
- Mesmos perfis de transcode (JSON iguais)
- Mesmos parÃƒÂ¢metros FFmpeg
- Mesmos thresholds VMAF (85/90/93)
- Mesmos targets LUFS (-23/-14) e True Peak (-1 dBTP)
- CÃƒÂ³digo dos workers reutilizÃƒÂ¡vel (adaptaÃƒÂ§ÃƒÂ£o mÃƒÂ­nima para SQLite/sidecar)

---

*Este ficheiro ÃƒÂ© a fonte de verdade do projecto Desktop.*
*Em caso de dÃƒÂºvida, consulta aqui.*
*ÃƒÅ¡ltima actualizaÃƒÂ§ÃƒÂ£o: 2026-05-09 por Claude Sonnet 4.6*
