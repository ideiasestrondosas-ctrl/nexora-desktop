# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.19.0] - 2026-05-17

### Added

- Suporte a codecs H.265/HEVC e VP9 no pipeline de transcodificação
- BatchSubmitModal com estimativas de tempo e tamanho por ficheiro
- Thumbnails automáticos gerados pelo worker de thumbnail
- Player inline na Biblioteca para preview do vídeo original
- MediaInfo detalhado no ecrã de Detalhe de Asset (GENERAL, VIDEO, AUDIO)
- Navegação clicável nos cabeçalhos e nomes de vídeo na Biblioteca (Grid e Lista)
- Ficha técnica do Asset em abas horizontais modernas (Relatório QC, Metadados, Histórico)

### Fixed

- Corrigido parsing e escala VMAF no Windows (paths com `:` no filtergraph substituídos por `\:`)
- Corrigido loop de loading infinito no ecrã AssetDetailPage
- Corrigido mock síncrono do módulo nativo `fs` em workers.test.ts (Vitest)
- Corrigido emit duplicado de `job:started` — gerido agora apenas pelo Orchestrator
- Corrigido problema de bloqueio de ficheiros no Windows no script sync.ps1

## [0.18.0] - 2026-05-16

### Fixed

- Drag-and-drop de ficheiros agora funciona via evento nativo `tauri://drag-drop` (T03/T04)
- Activos deixam de ficar em estado "pending" — `submit_job` chamado automaticamente após ingest (T04)
- Sidecar arranca correctamente via `Command::new("node")` com path dinâmico (T05)
- Versão da aplicação lida dinamicamente via `getVersion()` de `@tauri-apps/api/app` (T06)

### Security

- CSP estrita substituiu `"csp": null` com política granular por directiva (T07)
- Capabilities reduzidas a permissões explícitas (least-privilege) em vez de `*:default` (T08)

### Changed

- Sidecar agora completamente stateless — `sidecar/db.ts` e `NexoraSimpleQueue.ts` eliminados (T09)
- Hooks `useJobStatus` e `useDiskSpace` migrados de polling para eventos Tauri (`listen()`) (T10)
- Settings persistentes via `tauri-plugin-store` em vez de `localStorage` (T11)
- Logging unificado via `tauri-plugin-log` com targets stdout, ficheiro e webview (T12)
- Toasts migrados de `react-hot-toast` para `sonner` (T14)
- `HelpModal` migrado para Radix Dialog com focus trap e ARIA correcto (T15)
- `LibraryPage` com virtualização via `@tanstack/react-virtual` para listas grandes (T16)
- Dashboard com gráficos VMAF (BarChart) e métricas CPU/RAM (AreaChart) via recharts (T17)

### Added

- ESLint flat config + Prettier com scripts `lint`, `format`, `build:analyze` (T18)
- Husky pre-commit hook com lint-staged (T19)
- Bundle analyzer com `rollup-plugin-visualizer` e manual chunk splitting (T20)
- Testes de componentes com vitest + jsdom + Testing Library (T21)
- Dependabot config para npm, cargo e GitHub Actions (T22)
- Documentação do processo de release e code signing em `docs/RELEASE.md` (T23)
- Toggle de telemetria opt-in (desactivado por defeito) nas definições (T24)

## [0.17.0] - 2026-05-14

### Added

- feat: Replicar projeto principal Nexora Desktop

## [0.16.0] - 2026-05-13

### Added

- feat: Versao para teste

## [0.15.0] - 2026-05-13

### Added

- feat: AnÃƒÂ¡lise workspace aplicaÃƒÂ§ÃƒÂ£o e regras

## [0.14.0] - 2026-05-13

### Added

- feat: atualizacoes gerais

## [0.13.0] - 2026-05-13

### Added

- feat: Resolving Nexora Desktop Issues

## [0.12.0] - 2026-05-11

### Added

- feat: Controlling Automated Development Execution

## [0.11.0] - 2026-05-11

### Added

- feat: Validating Antigravity Backend Integration

## [0.10.0] - 2026-05-11

### Added

- feat: Validating Antigravity Backend Integration

## [0.9.0] - 2026-05-11

### Added

- feat: Refactoring Nexora Desktop Interface & Fixing Failing Nexora Tests

## [0.8.0] - 2026-05-11

### Added

- feat: Refactoring Nexora Desktop Interface & Fixing Failing Nexora Tests

## [0.7.0] - 2026-05-11

### Added

- feat: Reestruturacao do projecto

## [0.7.0] - 2026-05-11

### Added

- fix: Race condition na fila ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â claimNextJob() atÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³mico (SELECT+UPDATE numa transacÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o SQLite)
- feat: Tabela `profiles` no schema para perfis personalizados
- feat: Tauri command `get_queue_stats` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â estatÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sticas da fila (queued/processing/done/error hoje)
- feat: Tauri command `retry_job` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â re-enfileira jobs com erro ou cancelados
- feat: Tauri commands `create_profile`, `update_profile`, `delete_profile` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â CRUD de perfis custom
- feat: Tauri command `export_logs` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â exporta logs para ficheiro .txt
- feat: Tauri command `get_changelog` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â devolve CHANGELOG.md compilado no binÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
- docs: ANTIGRAVITY-GUIA.md ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â guia passo a passo para utilizador nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o-tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©cnico gerar ecrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£s

## [0.6.0] - 2026-05-10

### Added

- feat: Problemas encontrados e corrigidos durante o teste

## [0.5.0] - 2026-05-10

### Added

- feat: Prompt Desktop Bug fixes + Gap Analysis ConcluÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o

## [0.4.1] - 2026-05-10

### Added

-

## [0.4.0] - 2026-05-10

### Added

- feat: CorrecÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes para releases

## [0.3.0] - 2026-05-09

### Added

- feat: PROMPT 3 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Frontend React

## [0.2.0] - 2026-05-09

### Added

- feat: PROMPT 2 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Sidecar + Queue + Workers

## [0.1.0] - 2026-05-09

### Added

- Scaffold Tauri 2 + React 19 + TypeScript
- Configuracao completa do ambiente de desenvolvimento (scripts 01-05)
- Estrutura Rust: db, migrations, commands, tray, sidecar, state
- SQLite schema completo (assets, jobs, settings, audit_log)
- Auto-migration no startup
- Tauri Commands: ingest_asset, list_assets, get_asset
- Tauri Commands: submit_job, cancel_job, get_job_status, list_jobs
- Tauri Commands: get_settings, update_settings
- Tauri Commands: detect_gpu, get_disk_space, get_app_version
- System tray com menu contextual (Mostrar / Sair)
- Gestao do processo Node.js sidecar
- GitHub Actions workflows (CI + build multiplataforma)
- Scripts de sincronizacao Git (sync.ps1 + sync.sh)
