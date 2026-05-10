# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-10
Agente: Claude Sonnet 4.6

## O que foi feito

### Prompt Desktop 7 — Logging + Métricas + Manual — Concluído

Três funcionalidades novas implementadas, validadas (`cargo check` + `tsc` limpos) e testadas com `tauri dev`:

**1. Sistema de Logging**
- `src-tauri/src/logger.rs`: `NexoraLogger` implementa `log::Log`
  - Escreve em SQLite com conexão WAL separada da AppState
  - Emite evento `log-entry` para o frontend em tempo real
  - Rotação automática: max 2 000 entradas; purga a cada 100 escritas
- `src-tauri/src/commands/logs.rs`: `list_logs` (filtros nível + pesquisa), `clear_logs`, `get_log_stats`, `write_log`
- `src-tauri/src/db/schema.sql`: tabela `logs` + índices `ts DESC` e `level`
- `sidecar/events.ts`: tipo `'log'` adicionado a `SidecarEventType`
- `sidecar/logger.ts`: `nxLog/nxInfo/nxWarn/nxError` emitem eventos `{ type: 'log' }` para stdout
- `sidecar/index.ts`: logs de startup/shutdown/erros não capturados
- `src-tauri/src/sidecar.rs`: eventos `job:started/completed/failed` roteados para `logger::write()`
- `src/hooks/useLogs.ts`: fetch inicial + subscrição evento `log-entry`
- `src/components/LogViewer.tsx`: filtros ALL/ERROR/WARN/INFO, pesquisa, clear, auto-scroll, tempo real
- `src/pages/SettingsPage.tsx`: secção "Registos do Sistema" com `LogViewer`

**2. Métricas em Tempo Real (barra superior)**
- `src-tauri/Cargo.toml`: `sysinfo = "0.32"` com features `system` + `network`
- `src-tauri/src/commands/metrics.rs`: struct `SystemMetrics` (camelCase)
- `src-tauri/src/lib.rs`: thread background emite `system-metrics` a cada 2 s
  - CPU% (2 leituras separadas por 600ms para precisão)
  - RAM usada/total em bytes
  - Rede RX/TX bps agregado de todas as interfaces
- `src/hooks/useSystemMetrics.ts`: subscrição evento `system-metrics`
- `src/components/SystemMetricsBar.tsx`: barra compacta no navbar desktop (≥ xl), mini-barras, cores de alerta

**3. Manual Integrado**
- `src-tauri/src/commands/system.rs`: `get_installed_info` — versão FFmpeg, Node.js, GPU, caminho DB
- `src/components/HelpModal.tsx`: modal com 6 abas
  - Introdução, Como usar (6 passos), Perfis (6 perfis com descrição técnica)
  - Métricas (VMAF/LUFS explicados com escala), Sistema (componentes instalados live), Sobre
- `src/App.tsx`: botão "Manual" no navbar desktop, `HelpModal` condicional

**Fix adicional — PostCSS BOM**
- Sintoma: `SyntaxError: Unexpected token '﻿'` no Vite ao processar `src/index.css`
- Causa: linter Windows adicionou BOM (`EF BB BF`) ao `package.json`; Vite tentava parsear como config PostCSS
- Fix 1: BOM removido de `package.json`
- Fix 2: `postcss.config.js` vazio criado na raiz — impede `cosmiconfig` de procurar em `package.json`

### Prompt Desktop 6 — Bug fixes críticos + Dev tooling — Concluído

**Fix 1 — Sidecar ESM/CJS**: extensão `.cjs` em `package.json` (outfile), `sidecar.rs` (3 paths), `tauri.conf.json`

**Fix 2 — Ecrã branco**: `index.css` boilerplate Vite removido + `DashboardPage.tsx` interface `AppStats` corrigida (snake_case → camelCase)

**Fix 3 — TypeScript**: `job.lufs`, `Download` removido, `getDiskSpace` duplicado, `progress * 100`

**Dev tooling**: `scripts/06-run-dev.ps1` reescrito com menu interactivo e parâmetros `-Dev/-Clean/-Full/-Nuclear/-Sidecar/-TypeCheck/-Test/-Info`

### Prompts Desktop 1–5 — Concluídos (ver histórico git)

---

## Estado de compilação

- `cargo check`: OK
- `npm run typecheck`: OK — 0 erros
- `npm run sidecar:check`: OK
- `npm test` (vitest): OK — 24 testes passam
- `npm run tauri dev`: OK — arranca limpo, sem erros PostCSS ou ESM
- `node sidecar/dist/nexora-sidecar.cjs`: OK (sem erro ESM)
- Branch `dev` sincronizado com `origin/dev` ✓

---

## Próximos passos

| Tarefa | Prioridade |
|---|---|
| Implementar `get_changelog` em `system.rs` (SettingsPage consome-o) | Média |
| Verificar `list_jobs` aceita filtro `asset_id` (AssetDetailModal passa-o) | Média |
| Teste end-to-end: ingest → processamento → histórico → detalhe | Alta |
| Auto-updater Tauri (ADR D009) | Baixa |

---

## Ficheiros criados/modificados (sessão actual — Prompt Desktop 7)

```
src-tauri/src/logger.rs                 (novo — NexoraLogger, WAL, rotação)
src-tauri/src/commands/logs.rs          (novo — list_logs, clear_logs, get_log_stats, write_log)
src-tauri/src/commands/metrics.rs       (novo — SystemMetrics struct)
src-tauri/src/commands/mod.rs           (pub mod logs; pub mod metrics)
src-tauri/src/commands/system.rs        (get_installed_info)
src-tauri/src/db/schema.sql             (tabela logs + índices)
src-tauri/src/lib.rs                    (logger::init, thread métricas, novos handlers)
src-tauri/src/sidecar.rs               (routing job events → logger::write)
src-tauri/Cargo.toml                    (sysinfo 0.32 + features system/network)
sidecar/events.ts                       (tipo 'log' em SidecarEventType)
sidecar/logger.ts                       (novo — nxLog/nxInfo/nxWarn/nxError)
sidecar/index.ts                        (startup/shutdown logs)
src/hooks/useSystemMetrics.ts           (novo — subscrição evento system-metrics)
src/hooks/useLogs.ts                    (novo — fetch + subscrição log-entry)
src/components/SystemMetricsBar.tsx     (novo — CPU/RAM/Rede no navbar)
src/components/LogViewer.tsx            (novo — viewer com filtros e tempo real)
src/components/HelpModal.tsx            (novo — manual 6 abas)
src/pages/SettingsPage.tsx              (secção LogViewer)
src/App.tsx                             (SystemMetricsBar + botão Manual + HelpModal)
package.json                            (BOM removido)
postcss.config.js                       (novo — vazio, evita busca em package.json)
```

## Notas técnicas para o próximo agente

- **Logger**: usa conexão SQLite separada da AppState (WAL mode) — não há lock contention
- **Rotação de logs**: purga automática a cada 100 escritas; limite de 2 000 entradas
- **sysinfo Networks**: requires feature `"network"` no Cargo.toml — sem ela `Networks` não existe
- **CPU%**: precisa de 2 leituras separadas por tempo; thread inicia com `refresh_cpu_usage()` + 600ms antes do loop
- **SystemMetricsBar**: só visível em `xl` breakpoint (≥1280px) para não sobrecarregar o navbar
- **postcss.config.js**: manter na raiz — previne erro BOM se linter voltar a tocar em `package.json`
- **sidecar .cjs**: extensão obrigatória — `.js` com `"type":"module"` causa erro ESM
- **AppStats / SystemMetrics**: `#[serde(rename_all = "camelCase")]` em todos os structs Rust → frontend usa camelCase
- **ProgressBar**: espera 0–100; `job.progress` na DB é 0.0–1.0 → `* 100`
- **Versão**: `0.5.0` em `tauri.conf.json`, `Cargo.toml` e `package.json`
