# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.24.0] - 2026-05-20

### Added
- feat:  Settings: Apply Live + Cache Display


## [0.23.0] - 2026-05-18

### Added

- NavegaÃ§Ã£o in-app para ficheiros processados: comando Rust `find_asset_by_path`; AssetDetailPage tenta navegar para o asset de output; fallback para `revealItemInDir` se nÃ£o estiver na biblioteca.
- Popup de reprocessamento em foreground: `QueuePage` usa `createPortal` (react-dom) para renderizar o popup em `document.body` com `position: fixed`, escapando o `overflow-hidden` do container da tabela.
- Pipeline Summary clicÃ¡vel: badges de contagem tornados `<button>` que expandem painel inline com lista de ficheiros (nome + perfil + seta de navegaÃ§Ã£o para o asset).
- Delete com autorizaÃ§Ã£o explÃ­cita para ficheiros: `delete_asset` e `factory_reset` Rust aceitam `delete_files: bool`; frontend apresenta segundo dialog nativo antes de apagar ficheiros do disco.

### Changed

- i18n: adicionadas chaves `deleteFilesConfirm`, `deleteFilesTitle`, `factoryResetFilesTitle`, `factoryResetFilesConfirm`, `pipelineSummaryTitle`, `reprocessPortalTitle` em 15 lÃ­nguas.

## [0.22.0] - 2026-05-17

### Added

- MediaInfo no Detalhe de Asset com toggle Original/Processado e banner de caminho do ficheiro processado.
- Caminho do ficheiro visÃ­vel sob o toggle do player (original e processado).
- SHA-256 e TAGS incluÃ­dos na funÃ§Ã£o "Copiar Tudo" do MediaInfoPanel.
- Reprocessar com selector de perfil no Asset Detail.
- BotÃµes explorador separados para original e processado.
- Download de ficheiro processado.
- Fila com navegaÃ§Ã£o para asset.
- Dashboard scrollÃ¡vel com lista de jobs recentes.
- Registo de actividades (activity log) em todos os comandos principais.
- 16 novas chaves i18n.

### Fixed

- DuraÃ§Ã£o dos jobs no histÃ³rico calculada a partir de `started_at`/`finished_at` (nÃ£o hardcoded).
- Data de inÃ­cio no histÃ³rico mostra hora real (nÃ£o sÃ³ a data de criaÃ§Ã£o).
- Caminho do ficheiro processado no histÃ³rico de jobs mostra o path completo com botÃ£o abrir.

## [0.21.0] - 2026-05-17

### Fixed

- Sidecar reconstruÃ­do: fix do proxy "width not divisible by 2" agora activo (pad=ceil(iw/2)\*2)
- output_dir migrado automaticamente de %TEMP% para Videos/Nexora Output em instalaÃ§Ãµes existentes
- max_concurrent_jobs lido da BD pelo queue worker â€” a setting tem agora efeito real
- Race condition na fila eliminada: jobs marcados como 'processing' antes de lanÃ§ar thread
- filename dos assets incluÃ­do na resposta de list_jobs (via LEFT JOIN)
- version.ts sincronizado com 0.21.0
- Feedback de retry/cancel quando job nÃ£o pode ser alterado (toast.warning)
- Log de acÃ§Ãµes em cancel_job, retry_job, approve_job, reject_job, submit_job

### Changed

- list_jobs ordenado por: processing â†’ queued â†’ quarantined â†’ histÃ³rico, limitado a 200 registos
- i18n: adicionadas chaves cannotCancelState, cannotRetryState, retryQueued em 15 lÃ­nguas

## [0.20.0] - 2026-05-17

### Added

- MediaInfo no Detalhe de Asset com toggle Original/Processado e banner de caminho do ficheiro processado
- Caminho do ficheiro visÃƒÂ­vel sob o toggle do player (original e processado)
- SHA-256 e TAGS incluÃƒÂ­dos na funÃƒÂ§ÃƒÂ£o "Copiar Tudo" do MediaInfoPanel
- Videos_Tests/ com 18 samples de vÃƒÂ­deo (5s/10s/15s/20s/30s em 360p/720p/1080p/2160p/H265/VP9)

### Fixed

- output_dir padrÃƒÂ£o aponta para Videos/Nexora Output (nÃƒÂ£o para pasta temp do sistema)
- DuraÃƒÂ§ÃƒÂ£o dos jobs no histÃƒÂ³rico calculada a partir de started_at/finished_at (nÃƒÂ£o hardcoded)
- Data de inÃƒÂ­cio no histÃƒÂ³rico mostra hora real (nÃƒÂ£o sÃƒÂ³ a data de criaÃƒÂ§ÃƒÂ£o)
- Caminho do ficheiro processado no histÃƒÂ³rico de jobs mostra o path completo com botÃƒÂ£o abrir

### Changed

- Limpeza GitHub: eliminaÃƒÂ§ÃƒÂ£o de branches auxiliares, encerramento de 11 PRs Dependabot, remoÃƒÂ§ÃƒÂ£o de 6 releases draft antigas
- RepositÃƒÂ³rio limpo com apenas branches main e dev

## [0.19.0] - 2026-05-17

### Added

- Suporte a codecs H.265/HEVC e VP9 no pipeline de transcodificaÃƒÂ§ÃƒÂ£o
- BatchSubmitModal com estimativas de tempo e tamanho por ficheiro
- Thumbnails automÃƒÂ¡ticos gerados pelo worker de thumbnail
- Player inline na Biblioteca para preview do vÃƒÂ­deo original
- MediaInfo detalhado no ecrÃƒÂ£ de Detalhe de Asset (GENERAL, VIDEO, AUDIO)
- NavegaÃƒÂ§ÃƒÂ£o clicÃƒÂ¡vel nos cabeÃƒÂ§alhos e nomes de vÃƒÂ­deo na Biblioteca (Grid e Lista)
- Ficha tÃƒÂ©cnica do Asset em abas horizontais modernas (RelatÃƒÂ³rio QC, Metadados, HistÃƒÂ³rico)

### Fixed

- Corrigido parsing e escala VMAF no Windows (paths com `:` no filtergraph substituÃƒÂ­dos por `\:`)
- Corrigido loop de loading infinito no ecrÃƒÂ£ AssetDetailPage
- Corrigido mock sÃƒÂ­ncrono do mÃƒÂ³dulo nativo `fs` em workers.test.ts (Vitest)
- Corrigido emit duplicado de `job:started` Ã¢â‚¬â€ gerido agora apenas pelo Orchestrator
- Corrigido problema de bloqueio de ficheiros no Windows no script sync.ps1

## [0.18.0] - 2026-05-16

### Fixed

- Drag-and-drop de ficheiros agora funciona via evento nativo `tauri://drag-drop` (T03/T04)
- Activos deixam de ficar em estado "pending" Ã¢â‚¬â€ `submit_job` chamado automaticamente apÃƒÂ³s ingest (T04)
- Sidecar arranca correctamente via `Command::new("node")` com path dinÃƒÂ¢mico (T05)
- VersÃƒÂ£o da aplicaÃƒÂ§ÃƒÂ£o lida dinamicamente via `getVersion()` de `@tauri-apps/api/app` (T06)

### Security

- CSP estrita substituiu `"csp": null` com polÃƒÂ­tica granular por directiva (T07)
- Capabilities reduzidas a permissÃƒÂµes explÃƒÂ­citas (least-privilege) em vez de `*:default` (T08)

### Changed

- Sidecar agora completamente stateless Ã¢â‚¬â€ `sidecar/db.ts` e `NexoraSimpleQueue.ts` eliminados (T09)
- Hooks `useJobStatus` e `useDiskSpace` migrados de polling para eventos Tauri (`listen()`) (T10)
- Settings persistentes via `tauri-plugin-store` em vez de `localStorage` (T11)
- Logging unificado via `tauri-plugin-log` com targets stdout, ficheiro e webview (T12)
- Toasts migrados de `react-hot-toast` para `sonner` (T14)
- `HelpModal` migrado para Radix Dialog com focus trap e ARIA correcto (T15)
- `LibraryPage` com virtualizaÃƒÂ§ÃƒÂ£o via `@tanstack/react-virtual` para listas grandes (T16)
- Dashboard com grÃƒÂ¡ficos VMAF (BarChart) e mÃƒÂ©tricas CPU/RAM (AreaChart) via recharts (T17)

### Added

- ESLint flat config + Prettier com scripts `lint`, `format`, `build:analyze` (T18)
- Husky pre-commit hook com lint-staged (T19)
- Bundle analyzer com `rollup-plugin-visualizer` e manual chunk splitting (T20)
- Testes de componentes com vitest + jsdom + Testing Library (T21)
- Dependabot config para npm, cargo e GitHub Actions (T22)
- DocumentaÃƒÂ§ÃƒÂ£o do processo de release e code signing em `docs/RELEASE.md` (T23)
- Toggle de telemetria opt-in (desactivado por defeito) nas definiÃƒÂ§ÃƒÂµes (T24)

## [0.17.0] - 2026-05-14

### Added

- feat: Replicar projeto principal Nexora Desktop

## [0.16.0] - 2026-05-13

### Added

- feat: Versao para teste

## [0.15.0] - 2026-05-13

### Added

- feat: AnÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lise workspace aplicaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o e regras

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

- fix: Race condition na fila ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â claimNextJob() atÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³mico (SELECT+UPDATE numa transacÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o SQLite)
- feat: Tabela `profiles` no schema para perfis personalizados
- feat: Tauri command `get_queue_stats` ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â estatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas da fila (queued/processing/done/error hoje)
- feat: Tauri command `retry_job` ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â re-enfileira jobs com erro ou cancelados
- feat: Tauri commands `create_profile`, `update_profile`, `delete_profile` ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â CRUD de perfis custom
- feat: Tauri command `export_logs` ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â exporta logs para ficheiro .txt
- feat: Tauri command `get_changelog` ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â devolve CHANGELOG.md compilado no binÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio
- docs: ANTIGRAVITY-GUIA.md ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â guia passo a passo para utilizador nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o-tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cnico gerar ecrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£s

## [0.6.0] - 2026-05-10

### Added

- feat: Problemas encontrados e corrigidos durante o teste

## [0.5.0] - 2026-05-10

### Added

- feat: Prompt Desktop Bug fixes + Gap Analysis ConcluÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o

## [0.4.1] - 2026-05-10

### Added

-

## [0.4.0] - 2026-05-10

### Added

- feat: CorrecÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes para releases

## [0.3.0] - 2026-05-09

### Added

- feat: PROMPT 3 ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Frontend React

## [0.2.0] - 2026-05-09

### Added

- feat: PROMPT 2 ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Sidecar + Queue + Workers

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
