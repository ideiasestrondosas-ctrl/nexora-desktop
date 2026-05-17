# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.21.0] - 2026-05-17

### Added
- feat: 0.20.0


## [0.20.0] - 2026-05-17

### Added

- MediaInfo no Detalhe de Asset com toggle Original/Processado e banner de caminho do ficheiro processado
- Caminho do ficheiro visÃ­vel sob o toggle do player (original e processado)
- SHA-256 e TAGS incluÃ­dos na funÃ§Ã£o "Copiar Tudo" do MediaInfoPanel
- Videos_Tests/ com 18 samples de vÃ­deo (5s/10s/15s/20s/30s em 360p/720p/1080p/2160p/H265/VP9)

### Fixed

- output_dir padrÃ£o aponta para Videos/Nexora Output (nÃ£o para pasta temp do sistema)
- DuraÃ§Ã£o dos jobs no histÃ³rico calculada a partir de started_at/finished_at (nÃ£o hardcoded)
- Data de inÃ­cio no histÃ³rico mostra hora real (nÃ£o sÃ³ a data de criaÃ§Ã£o)
- Caminho do ficheiro processado no histÃ³rico de jobs mostra o path completo com botÃ£o abrir

### Changed

- Limpeza GitHub: eliminaÃ§Ã£o de branches auxiliares, encerramento de 11 PRs Dependabot, remoÃ§Ã£o de 6 releases draft antigas
- RepositÃ³rio limpo com apenas branches main e dev

## [0.19.0] - 2026-05-17

### Added

- Suporte a codecs H.265/HEVC e VP9 no pipeline de transcodificaÃ§Ã£o
- BatchSubmitModal com estimativas de tempo e tamanho por ficheiro
- Thumbnails automÃ¡ticos gerados pelo worker de thumbnail
- Player inline na Biblioteca para preview do vÃ­deo original
- MediaInfo detalhado no ecrÃ£ de Detalhe de Asset (GENERAL, VIDEO, AUDIO)
- NavegaÃ§Ã£o clicÃ¡vel nos cabeÃ§alhos e nomes de vÃ­deo na Biblioteca (Grid e Lista)
- Ficha tÃ©cnica do Asset em abas horizontais modernas (RelatÃ³rio QC, Metadados, HistÃ³rico)

### Fixed

- Corrigido parsing e escala VMAF no Windows (paths com `:` no filtergraph substituÃ­dos por `\:`)
- Corrigido loop de loading infinito no ecrÃ£ AssetDetailPage
- Corrigido mock sÃ­ncrono do mÃ³dulo nativo `fs` em workers.test.ts (Vitest)
- Corrigido emit duplicado de `job:started` â€” gerido agora apenas pelo Orchestrator
- Corrigido problema de bloqueio de ficheiros no Windows no script sync.ps1

## [0.18.0] - 2026-05-16

### Fixed

- Drag-and-drop de ficheiros agora funciona via evento nativo `tauri://drag-drop` (T03/T04)
- Activos deixam de ficar em estado "pending" â€” `submit_job` chamado automaticamente apÃ³s ingest (T04)
- Sidecar arranca correctamente via `Command::new("node")` com path dinÃ¢mico (T05)
- VersÃ£o da aplicaÃ§Ã£o lida dinamicamente via `getVersion()` de `@tauri-apps/api/app` (T06)

### Security

- CSP estrita substituiu `"csp": null` com polÃ­tica granular por directiva (T07)
- Capabilities reduzidas a permissÃµes explÃ­citas (least-privilege) em vez de `*:default` (T08)

### Changed

- Sidecar agora completamente stateless â€” `sidecar/db.ts` e `NexoraSimpleQueue.ts` eliminados (T09)
- Hooks `useJobStatus` e `useDiskSpace` migrados de polling para eventos Tauri (`listen()`) (T10)
- Settings persistentes via `tauri-plugin-store` em vez de `localStorage` (T11)
- Logging unificado via `tauri-plugin-log` com targets stdout, ficheiro e webview (T12)
- Toasts migrados de `react-hot-toast` para `sonner` (T14)
- `HelpModal` migrado para Radix Dialog com focus trap e ARIA correcto (T15)
- `LibraryPage` com virtualizaÃ§Ã£o via `@tanstack/react-virtual` para listas grandes (T16)
- Dashboard com grÃ¡ficos VMAF (BarChart) e mÃ©tricas CPU/RAM (AreaChart) via recharts (T17)

### Added

- ESLint flat config + Prettier com scripts `lint`, `format`, `build:analyze` (T18)
- Husky pre-commit hook com lint-staged (T19)
- Bundle analyzer com `rollup-plugin-visualizer` e manual chunk splitting (T20)
- Testes de componentes com vitest + jsdom + Testing Library (T21)
- Dependabot config para npm, cargo e GitHub Actions (T22)
- DocumentaÃ§Ã£o do processo de release e code signing em `docs/RELEASE.md` (T23)
- Toggle de telemetria opt-in (desactivado por defeito) nas definiÃ§Ãµes (T24)

## [0.17.0] - 2026-05-14

### Added

- feat: Replicar projeto principal Nexora Desktop

## [0.16.0] - 2026-05-13

### Added

- feat: Versao para teste

## [0.15.0] - 2026-05-13

### Added

- feat: AnÃƒÆ’Ã‚Â¡lise workspace aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e regras

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

- fix: Race condition na fila ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â claimNextJob() atÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³mico (SELECT+UPDATE numa transacÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o SQLite)
- feat: Tabela `profiles` no schema para perfis personalizados
- feat: Tauri command `get_queue_stats` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â estatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas da fila (queued/processing/done/error hoje)
- feat: Tauri command `retry_job` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â re-enfileira jobs com erro ou cancelados
- feat: Tauri commands `create_profile`, `update_profile`, `delete_profile` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â CRUD de perfis custom
- feat: Tauri command `export_logs` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â exporta logs para ficheiro .txt
- feat: Tauri command `get_changelog` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â devolve CHANGELOG.md compilado no binÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio
- docs: ANTIGRAVITY-GUIA.md ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â guia passo a passo para utilizador nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o-tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cnico gerar ecrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£s

## [0.6.0] - 2026-05-10

### Added

- feat: Problemas encontrados e corrigidos durante o teste

## [0.5.0] - 2026-05-10

### Added

- feat: Prompt Desktop Bug fixes + Gap Analysis ConcluÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o

## [0.4.1] - 2026-05-10

### Added

-

## [0.4.0] - 2026-05-10

### Added

- feat: CorrecÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes para releases

## [0.3.0] - 2026-05-09

### Added

- feat: PROMPT 3 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Frontend React

## [0.2.0] - 2026-05-09

### Added

- feat: PROMPT 2 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Sidecar + Queue + Workers

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
