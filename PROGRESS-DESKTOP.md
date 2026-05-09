# Nexora Media Processing â€” Desktop Nativo â€” Estado do Projecto

> **âš ï¸ LEITURA OBRIGATÃ“RIA PARA TODOS OS AGENTES IA**
>
> Este ficheiro DEVE ser lido ANTES de qualquer trabalho no mÃ³dulo Desktop.
> DEVE ser actualizado no FIM de cada sessÃ£o de desenvolvimento.
> Existe para reduzir tokens, evitar retrabalho, e manter consistÃªncia.
>
> **Documento de referÃªncia:** `arquitetura/nexora-desktop-documento.md`

---

## ðŸ“‹ Identidade

| Campo | Valor |
|---|---|
| **Nome** | Nexora Media Processing â€” Desktop Nativo |
| **VersÃ£o** | 0.1.0 |
| **IDE** | Google Antigravity (fork VS Code com Gemini, Claude, ChatGPT) |
| **Stack Shell** | Tauri 2.x (Rust) |
| **Stack Frontend** | React 18 + TypeScript + Tailwind CSS + Zustand |
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
- [ ] Script nexora-desktop-setup.sh/ps1 executado
- [ ] Node.js 20 instalado e verificado
- [ ] Rust (stable) instalado e verificado
- [ ] Git instalado e verificado
- [ ] FFmpeg instalado e verificado (para testes)
- [ ] DependÃªncias Tauri instaladas (libwebkit2gtk no Linux, Xcode CLI no macOS, VS Build Tools no Windows)

### Fase 2 â€” Estrutura do Projecto
- [ ] Projecto Tauri criado (npm create tauri-app)
- [ ] DependÃªncias npm instaladas (zustand, better-sqlite3, esbuild, concurrently)
- [ ] Pastas criadas (sidecar/, src-tauri/binaries/, tests/)
- [ ] tauri.conf.json configurado

### Fase 3 â€” Prompt Desktop 1 (Tauri + SQLite + IPC)
- [ ] tauri.conf.json completo com bundle, icons, externalBin
- [ ] schema.sql criado com todas as tabelas
- [ ] migrations.rs implementado (auto-migration no startup)
- [ ] commands/assets.rs (ingest_asset, list_assets, get_asset)
- [ ] commands/jobs.rs (submit_job, cancel_job, get_job_status)
- [ ] commands/settings.rs (get_settings, update_settings)
- [ ] commands/system.rs (detect_gpu, get_disk_space, get_app_version)
- [ ] tray.rs (system tray com menu contextual)
- [ ] sidecar.rs (gestÃ£o do processo Node.js)

### Fase 4 â€” Prompt Desktop 2 (Sidecar + Queue + Orchestrator + Workers)
- [ ] NexoraSimpleQueue implementado (memÃ³ria + SQLite, prioridades, retry)
- [ ] NexoraDesktopOrchestrator implementado (idempotente, step-by-step)
- [ ] ingest-worker.ts
- [ ] qc-pre-worker.ts
- [ ] transcode-worker.ts (GPU auto-detect, todos os perfis)
- [ ] audio-worker.ts (two-pass R128 + BS1770GAIN verificaÃ§Ã£o)
- [ ] proxy-worker.ts
- [ ] thumbnail-worker.ts
- [ ] qc-post-worker.ts (VMAF, SHA-256, MediaConch)
- [ ] delivery-worker.ts (mover + notificaÃ§Ã£o + audit log)
- [ ] 6 perfis de transcode JSON criados
- [ ] ComunicaÃ§Ã£o sidecar â†” Tauri via stdout/JSON funcional

### Fase 5 â€” Prompt Desktop 3 (Frontend React)
- [ ] App.tsx com navegaÃ§Ã£o por tabs (Processar, HistÃ³rico, DefiniÃ§Ãµes)
- [ ] DropZone.tsx (drag-and-drop + file dialog)
- [ ] JobCard.tsx + ProgressBar.tsx
- [ ] NexoraStatusBadge.tsx + VMAFGauge.tsx
- [ ] ProcessPage.tsx (drop zone + jobs activos)
- [ ] HistoryPage.tsx (assets processados + filtros)
- [ ] SettingsPage.tsx (todas as definiÃ§Ãµes)
- [ ] useTauriCommand.ts hook
- [ ] useJobStatus.ts hook (polling 1s)
- [ ] useNotification.ts hook
- [ ] useGPU.ts hook
- [ ] Stores Zustand (jobs, settings, assets)
- [ ] Tema claro/escuro funcional
- [ ] Paleta Nexora aplicada (#1A6FD4, #4FB8A0)

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
Data:          ___________
Agente:        ___________
A trabalhar em: ___________
Bloqueios:     ___________
```

---

## ðŸ“ Estrutura de ficheiros actual

```
nexora-desktop/           â† actualiza Ã  medida que cresce
â”œâ”€â”€ (scaffold inicial a criar â€” ver Fase 2)
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

---

## ðŸŽ¯ PrÃ³ximos passos (ordenados por prioridade)

1. [ ] Executar script de setup: `bash scripts/nexora-desktop-setup.sh` (ou `.ps1` no Windows)
2. [ ] Criar projecto Tauri: `npm create tauri-app@latest nexora-desktop -- --template react-ts`
3. [ ] Instalar dependÃªncias: `npm install zustand better-sqlite3 esbuild concurrently`
4. [ ] Executar **Prompt Desktop 1** (agente: Claude/Gemini) â€” Tauri + SQLite + IPC
5. [ ] Executar **Prompt Desktop 2** (agente: Claude) â€” Sidecar + Workers
6. [ ] Executar **Prompt Desktop 3** (agente: Claude/Gemini) â€” Frontend React
7. [ ] Executar **Prompt Desktop 4** (agente: Claude) â€” Build + Testes
8. [ ] Descarregar binÃ¡rios: `npm run download:binaries`
9. [ ] Testar: `npm run dev`
10. [ ] Build final + tag + GitHub Release

---

## ðŸ“ Contexto tÃ©cnico rÃ¡pido (para agentes IA)

> LÃª isto antes de gerar cÃ³digo para nÃ£o introduzir inconsistÃªncias.

**Portas em uso (desenvolvimento):**
- 1420 â†’ Vite dev server (frontend React)
- Sem servidor HTTP em produÃ§Ã£o (IPC directo Tauri)

**ConvenÃ§Ãµes de cÃ³digo:**
- TypeScript strict mode â€” sem `any` implÃ­cito
- Nomes em inglÃªs no cÃ³digo, comentÃ¡rios em portuguÃªs
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
*Ãšltima actualizaÃ§Ã£o: 2026-05-02 por Claude Opus*
