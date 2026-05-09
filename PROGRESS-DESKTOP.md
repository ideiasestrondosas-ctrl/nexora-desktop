# Nexora Media Processing — Desktop Nativo — Estado do Projecto

> **⚠️ LEITURA OBRIGATÓRIA PARA TODOS OS AGENTES IA**
>
> Este ficheiro DEVE ser lido ANTES de qualquer trabalho no módulo Desktop.
> DEVE ser actualizado no FIM de cada sessão de desenvolvimento.
> Existe para reduzir tokens, evitar retrabalho, e manter consistência.
>
> **Documento de referência:** `nexora-desktop-documento.md`

---

## 📋 Identidade

| Campo | Valor |
|---|---|
| **Nome** | Nexora Media Processing — Desktop Nativo |
| **Versão** | 0.1.0 |
| **IDE** | Google Antigravity (fork VS Code com Gemini, Claude, ChatGPT) |
| **Stack Shell** | Tauri 2.x (Rust) |
| **Stack Frontend** | React 19 + TypeScript + Tailwind CSS + Zustand |
| **Stack Sidecar** | Node.js 20 + TypeScript + esbuild |
| **Base de dados** | SQLite via better-sqlite3 |
| **Media tools** | FFmpeg · FFprobe · MediaInfo · BS1770GAIN · MediaConch · HandBrakeCLI |
| **Build** | GitHub Actions (Tauri Action) |
| **Plataformas alvo** | Windows x64 · macOS Universal (Intel+ARM) · Linux x64 |
| **Relação com Server** | Módulo separado, mesma base de qualidade e standards |

---

## ✅ O que está concluído

### Fase 0 — Documentação e Arquitectura
- [x] Documento de especificação Desktop criado (nexora-desktop-documento.md)
- [x] PROGRESS-DESKTOP.md criado
- [x] ADRs Desktop definidos (ADR-D001 a ADR-D012)
- [x] Estrutura de directórios definida
- [x] Prompts Desktop 1-4 redigidos
- [x] Checklist de aceitação definida
- [x] Mapeamento funcional Cloud → Desktop documentado

### Fase 1 — Setup do Ambiente
- [ ] Script nexora-desktop-setup.sh/ps1 executado formalmente
- [x] Node.js 20 instalado e verificado
- [x] Rust (stable) instalado e verificado
- [x] Git instalado e verificado
- [ ] FFmpeg instalado e verificado (para testes)
- [x] Dependências Tauri instaladas (VS Build Tools no Windows)

### Fase 2 — Estrutura do Projecto
- [x] Projecto Tauri criado (npm create tauri-app)
- [x] Dependências npm instaladas (zustand, better-sqlite3, esbuild, concurrently, tailwindcss)
- [ ] Pastas criadas (sidecar/, src-tauri/binaries/, tests/) — faltam sidecar/ e tests/
- [x] tauri.conf.json configurado (janela 1280×800, bundle, productName)
- [x] Path aliases @/ configurados (vite.config.ts + tsconfig.json)
- [x] tsc --noEmit: OK · cargo check: OK · tauri build --debug: OK

### Fase 3 — Prompt Desktop 1 (Tauri + SQLite + IPC) ✅ COMPLETO
- [x] tauri.conf.json completo com bundle, icons, productName, janela min/max
- [x] schema.sql criado com todas as tabelas (assets, jobs, settings, audit_log + índices)
- [x] migrations.rs implementado (auto-migration no startup via include_str!)
- [x] commands/assets.rs (ingest_asset, list_assets, get_asset)
- [x] commands/jobs.rs (submit_job, cancel_job, get_job_status, list_jobs)
- [x] commands/settings.rs (get_settings, update_settings + defaults)
- [x] commands/system.rs (detect_gpu NVENC/AMF/QSV/CPU, get_disk_space, get_app_version)
- [x] tray.rs (system tray: Mostrar Nexora / Sair + clique no ícone)
- [x] sidecar.rs (spawn graceful + leitura JSON stdout + emit Tauri events)
- [x] state.rs (AppState com Mutex<Connection> + sidecar_pid)
- [x] lib.rs completo (setup: db + tray + sidecar; invoke_handler com todos os commands)
- [x] cargo check: OK · tsc --noEmit: OK

### Fase 4 — Prompt Desktop 2 (Sidecar + Queue + Orchestrator + Workers)
- [ ] NexoraSimpleQueue implementado (memória + SQLite, prioridades, retry)
- [ ] NexoraDesktopOrchestrator implementado (idempotente, step-by-step)
- [ ] ingest-worker.ts
- [ ] qc-pre-worker.ts
- [ ] transcode-worker.ts (GPU auto-detect, todos os perfis)
- [ ] audio-worker.ts (two-pass R128 + BS1770GAIN verificação)
- [ ] proxy-worker.ts
- [ ] thumbnail-worker.ts
- [ ] qc-post-worker.ts (VMAF, SHA-256, MediaConch)
- [ ] delivery-worker.ts (mover + notificação + audit log)
- [ ] 6 perfis de transcode JSON criados
- [ ] Comunicação sidecar ↔ Tauri via stdout/JSON funcional

### Fase 5 — Prompt Desktop 3 (Frontend React)
- [ ] App.tsx com navegação por tabs (Processar, Histórico, Definições)
- [ ] DropZone.tsx (drag-and-drop + file dialog)
- [ ] JobCard.tsx + ProgressBar.tsx
- [ ] NexoraStatusBadge.tsx + VMAFGauge.tsx
- [ ] ProcessPage.tsx (drop zone + jobs activos)
- [ ] HistoryPage.tsx (assets processados + filtros)
- [ ] SettingsPage.tsx (todas as definições)
- [ ] useTauriCommand.ts hook
- [ ] useJobStatus.ts hook (polling 1s)
- [ ] useNotification.ts hook
- [ ] useGPU.ts hook
- [ ] Stores Zustand (jobs, settings, assets)
- [ ] Tema claro/escuro funcional
- [ ] Paleta Nexora aplicada (#1A6FD4, #4FB8A0)

### Fase 6 — Prompt Desktop 4 (Build + Testes + Distribuição)
- [ ] build-desktop.yml (GitHub Actions 3 plataformas)
- [ ] download-media-binaries.js funcional
- [ ] generate-fixtures.sh (ficheiros de teste)
- [ ] queue.test.ts
- [ ] orchestrator.test.ts
- [ ] workers.test.ts
- [ ] package.json com todos os scripts
- [ ] README-DESKTOP.md
- [ ] Auto-updater configurado

### Fase 7 — Integração e Validação Final
- [ ] Testar localmente (tauri dev) — funcional em 3 plataformas
- [ ] Testes unitários passam (>80% cobertura)
- [ ] Build funciona para Windows (.exe)
- [ ] Build funciona para macOS (.dmg universal)
- [ ] Build funciona para Linux (.AppImage + .deb)
- [ ] Checklist de aceitação completa (PARTE 11 do documento)
- [ ] GitHub Release criado com artefactos das 3 plataformas

---

## 🔄 Em progresso agora

```
Data:          2026-05-09
Agente:        Claude Sonnet 4.6
A trabalhar em: —
Bloqueios:     Nenhum
```

---

## 📁 Estrutura de ficheiros actual

```
nexora-desktop/
├── src/                        ← React boilerplate (ainda por implementar)
│   ├── App.tsx, App.css, main.tsx
│   └── vite-env.d.ts
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              ← Setup completo (db + tray + sidecar + commands)
│   │   ├── main.rs
│   │   ├── state.rs            ← AppState
│   │   ├── tray.rs             ← System tray
│   │   ├── sidecar.rs          ← Gestão do processo sidecar
│   │   ├── db/
│   │   │   ├── mod.rs          ← open() com WAL
│   │   │   ├── migrations.rs   ← Auto-migration
│   │   │   └── schema.sql      ← Tabelas completas
│   │   └── commands/
│   │       ├── mod.rs
│   │       ├── assets.rs       ← ingest, list, get
│   │       ├── jobs.rs         ← submit, cancel, status, list
│   │       ├── settings.rs     ← get, update
│   │       └── system.rs       ← gpu, disk, version
│   ├── Cargo.toml              ← + rusqlite, uuid, chrono, anyhow, notification
│   ├── tauri.conf.json         ← Configurado
│   └── capabilities/
│       └── default.json        ← + notification:default
├── package.json                ← React 19 + todas as deps
├── vite.config.ts              ← Tailwind + alias @/
├── tsconfig.json               ← paths @/* → src/*
└── scripts/                   ← Scripts de setup/sync
```

---

## ⚠️ Problemas conhecidos

| Data | Problema | Estado |
|---|---|---|
| — | Nenhum registado | — |

---

## 🏗️ ADRs Desktop (Imutáveis)

| ADR | Decisão | Justificação |
|---|---|---|
| ADR-D001 | Tauri 2.x como shell nativa | Instalador 10x menor, RAM 6x menor que Electron |
| ADR-D002 | Node.js sidecar para lógica media | Reutiliza workers do Server sem duplicação |
| ADR-D003 | SQLite como única base de dados | Zero configuração, ficheiro local, backup trivial |
| ADR-D004 | Fila em memória + SQLite | Substituição simples do BullMQ+Redis |
| ADR-D005 | Orchestrator local step-by-step | Substituição simples do Temporal.io |
| ADR-D006 | Binários media incluídos no instalador | Zero dependências para o utilizador |
| ADR-D007 | GPU auto-detectada no startup | NVENC/AMF/QSV sem config manual |
| ADR-D008 | Notificações nativas do SO | Substituição de webhooks HTTP |
| ADR-D009 | Auto-updater via Tauri built-in | Updates automáticos |
| ADR-D010 | Mesmos parâmetros FFmpeg que Server | Compatibilidade de outputs |
| ADR-D011 | IPC via Tauri Commands | Sem servidor HTTP local |
| ADR-D012 | Deep links nexora:// | Integração nativa com SO |

---

## 📅 Histórico de sessões

> Nunca apagar linhas antigas. Adicionar sempre no final.

| Data | O que foi feito | Agente usado | Ficheiros criados/modificados |
|---|---|---|---|
| 2026-05-02 | Documentação Desktop criada, PROGRESS-DESKTOP.md criado, ADRs definidos, Prompts 1-4 redigidos | Claude Opus | nexora-desktop-documento.md, PROGRESS-DESKTOP.md |
| 2026-05-09 | Deps npm instaladas, Tailwind + aliases configurados, Prompt Desktop 1 completo (SQLite + IPC + Tray + Sidecar) | Claude Sonnet 4.6 | Cargo.toml, tauri.conf.json, schema.sql, lib.rs, state.rs, tray.rs, sidecar.rs, commands/* |

---

## 🎯 Próximos passos (ordenados por prioridade)

1. [x] ~~Instalar dependências~~ — feito
2. [x] ~~Prompt Desktop 1~~ — completo
3. [ ] Criar pasta `sidecar/` e `tests/`
4. [ ] Executar **Prompt Desktop 2** — Sidecar + Workers Node.js
5. [ ] Executar **Prompt Desktop 3** — Frontend React
6. [ ] Executar **Prompt Desktop 4** — Build + Testes
7. [ ] Descarregar binários: `npm run download:binaries`
8. [ ] Testar: `npm run tauri dev`
9. [ ] Build final + tag + GitHub Release

---

## 📝 Contexto técnico rápido (para agentes IA)

**Portas em uso (desenvolvimento):**
- 1420 → Vite dev server (frontend React)
- Sem servidor HTTP em produção (IPC directo Tauri)

**Convenções de código:**
- TypeScript strict mode — sem `any` implícito
- Nomes em inglês no código, comentários em português de Portugal
- Imports absolutos via paths aliases (`@/components/`, `@/hooks/`, etc.)
- Todos os erros são typed (nunca `catch(e: any)`)
- Todos os IDs são UUID v4
- FFmpeg SEMPRE via execFile (NUNCA exec com string concatenada)
- Parâmetros FFmpeg: sempre arrays, nunca strings

**Limites de recursos:**
- Max jobs simultâneos: configurável (default 2, max 4)
- FFmpeg timeout: 4h (14400000ms)
- SQLite max size: sem limite prático
- Sidecar: 1 processo Node.js, multi-threaded via worker_threads se necessário

**Relação com o Server:**
- Mesmos perfis de transcode (JSON iguais)
- Mesmos parâmetros FFmpeg
- Mesmos thresholds VMAF (85/90/93)
- Mesmos targets LUFS (-23/-14) e True Peak (-1 dBTP)
- Código dos workers reutilizável (adaptação mínima para SQLite/sidecar)

---

*Este ficheiro é a fonte de verdade do projecto Desktop.*
*Em caso de dúvida, consulta aqui.*
*Última actualização: 2026-05-09 por Claude Sonnet 4.6*
