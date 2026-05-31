# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.30.8-beta.1] - 2026-05-30

### Added

- docs(session): fechar sessao 40 -- sync.ps1 bugs corrigidos

## [0.30.7-beta.1] - 2026-05-30

### Added

- 2: Console Flash + Tema Claro Completo

## [0.30.6-beta.1] - 2026-05-30

### Added

- 2: Titulo: 4 Bugs UI/UX Sandbox – Update Modal, Thumbnails, Player, Comparador

## [0.30.5-beta.1] - 2026-05-29

### Added

- 2: Fixing media loading, light mode backgrounds, and UpdateModal in Nexora Desktop

## [0.30.4-beta.1] - 2026-05-29

### Added

- 2: Testes Windows Sandbox + Bugs UI

## [0.30.3-beta.1] - 2026-05-29

### Added

- Auto-updater operacional: modal de actualizao no startup com verso actual/nova e notas de release
- Assinatura de instaladores activa (TAURI_SIGNING_PRIVATE_KEY configurado)
- Hooks de sesso Claude Code: SessionStart injec-ta WIP, Stop notifica via Windows toast com debounce de 3 minutos

### Fixed

- Updater endpoint retornava 404 (latest.json em falta) corrigido com novo par de chaves e build com assinatura
- tauri.conf.json: pubkey actualizado para par de chaves regenerado

## [0.30.2-beta.1] - 2026-05-28

### Added

- 2: Fix Nexora Desktop missing video tools and documentation

## [0.30.1] - 2026-05-28

### Added

- fix(dev-optimize): replace WSearch COM approach with NTFS NotContentIndexed attribute

## [0.28.0] - 2026-05-25

### Added

- feat(sync): .env.example documentado com GITHUB_TOKEN e instrucoes de criacao
- feat(sync): Generate-ReleaseNotesFile com cabecalhos em portugues (Resumo / Novas Funcionalidades / Correccoes / Alteracoes / Instaladores)

### Fixed

- fix(sync): opcao 6 usava GET /releases/tags/{tag} que ignora drafts; corrigido para GET /releases com filtragem por tag+draft=true draft do CI (com instaladores) e agora encontrado correctamente
- fix(sync): opcao 6 gera release-notes-vX.md a partir dos commits do range antes de publicar
- fix(sync): opcao 6 apaga release duplicada vazia criada pelo sync.ps1 se o CI ja criou o draft
- fix(sync): caminho -Release nao prefixava o titulo com "v$version corrigido para paridade com opcao 6

## [0.27.0] - 2026-05-24

### Added

- feat(sync): PublishDraft mode actualizar e publicar draft release existente com titulo/corpo ricos do CHANGELOG (opcao 6 no menu interactivo e flag `-PublishDraft`)
- feat: Actualizar README.md onformidade com v0.26.0 + Dev Environment + AI Tools

### Fixed

- fix(sync): PATCH draft release em vez de recriar preserva assets do CI gerados pelo build.yml

## [0.26.0] - 2026-05-24

### Added

- sync.ps1: modo `-PublishDraft` (flag + opcao 6 do menu) actualiza e publica draft release existente com titulo/corpo ricos gerados do CHANGELOG, sem refazer o ciclo completo de release
- sync.ps1: Watch-GitHubActions aguarda e reporta estado dos workflows apos merge para main

### Fixed

- CI Linux: `smb::resolve()` normalizava backslashes com `Path::join()`, que em Linux nao os trata como separadores; corrigido com `.replace('\\', "/")` antes do join
- CI: `test-karpathy.mjs` bugs: crash ENOENT quando SKILL.md nao existe em CI, caminho hardcoded Windows no `resolve()`, `opencode.jsonc` ausente marcado como falha em vez de aviso
- CI: `cargo fmt` formatacao aplicada em `smb.rs`, `logs.rs`, `file_logger.rs`
- CI: Prettier formatacao aplicada em `CHANGELOG.md`, `package.json`, `PROGRESS-DESKTOP.md`, `test-karpathy.mjs`, `tauri.conf.json`
- App: `titleBarStyle: "overlay"` removido do `tauri.conf.json` valor invalido no schema Tauri 2.x impedia o arranque da app
- SMB: path traversal rejeitado em `validate_remote_path()` (componentes `..` proibidos)
- sync.ps1: UTF-8 BOM adicionado sem BOM, PowerShell 5.x (Windows PowerShell) lia o ficheiro como Windows-1252, corrompendo em-dashes e quebrando o parsing

### Changed

- sync.ps1: modo Release usa agora `PATCH /releases/{id}` em vez de apagar e recriar o draft preserva os instaladores ja anexados pelo GitHub Actions
- Seguranca: credenciais cloud armazenadas no keychain do SO (Windows Credential Manager / macOS Keychain) em vez de SQLite plaintext
- Platform UX: hook `usePlatform` com deteccao automatica de SO; atributo `data-platform` aplicado ao `<html>` para CSS condicional por plataforma

## [0.25.0] - 2026-05-22

### Added

- Cloud File Browser: boto Browse em cada perfil cloud nas Definies loud; modal com listagem, navegao em subdirectrios, download e eliminao de ficheiros para FTP, FTPS, SFTP, SMB, S3 e Google Drive (iCloud: mensagem clara de no suportado).
- 18 novas chaves i18n `cloudBrowser.*` em todos os 15 locales.
- 13 testes de componente para CloudFileBrowserModal (spinner, tabela, navegao, breadcrumb, seleco, delete, download, erro, pasta vazia).

### Fixed

- Cloud upload aps processamento: `process_cloud_destinations` nunca era chamado aps `job:completed` ficheiros ficavam sempre locais em vez de serem enviados para FTP/SMB/S3/GDrive.
- Credenciais vazias em `process_cloud_destinations`: creds era objecto vazio, falhando no GDrive (oauth_token ausente). Corrigido para usar `config.clone()`.
- GDrive Browse folder_id no configurado": base_path (nome de pasta) agora resolvido para folder ID via Drive API quando folder_id no estem cache.
- GDrive Browse asta no encontrada": pesquisa sem parent_id agora restrita raiz do My Drive (`'root' in parents`).
- GDrive download: extrado apenas o file ID do remote_path composto (ex: "pasta/FILE_ID").
- GDrive download: bytes jno escritos para disco quando a API retorna erro HTTP.
- SMB: adicionada guarda de path traversal no resolve().
- S3: trim de path e strip_prefix corrigidos para evitar prefixos duplos e remoo incorrecta.
- SFTP: sesso fechada correctamente quando read_dir falha (eliminado leak).
- FTP: conexo fechada correctamente quando LIST falha; suporte adicionado ao formato DOS/Windows.

### Changed

- GDrive upload: upsert usa PATCH se jexiste ficheiro com o mesmo nome (elimina duplicados em reprocessamentos); POST com parents se novo.

## [0.24.0] - 2026-05-20

### Added

- feat: Settings: Apply Live + Cache Display

## [0.23.0] - 2026-05-18

### Added

- Navegao in-app para ficheiros processados: comando Rust `find_asset_by_path`; AssetDetailPage tenta navegar para o asset de output; fallback para `revealItemInDir` se no estiver na biblioteca.
- Popup de reprocessamento em foreground: `QueuePage` usa `createPortal` (react-dom) para renderizar o popup em `document.body` com `position: fixed`, escapando o `overflow-hidden` do container da tabela.
- Pipeline Summary clicvel: badges de contagem tornados `<button>` que expandem painel inline com lista de ficheiros (nome + perfil + seta de navegao para o asset).
- Delete com autorizao explcita para ficheiros: `delete_asset` e `factory_reset` Rust aceitam `delete_files: bool`; frontend apresenta segundo dialog nativo antes de apagar ficheiros do disco.

### Changed

- i18n: adicionadas chaves `deleteFilesConfirm`, `deleteFilesTitle`, `factoryResetFilesTitle`, `factoryResetFilesConfirm`, `pipelineSummaryTitle`, `reprocessPortalTitle` em 15 lnguas.

## [0.22.0] - 2026-05-17

### Added

- MediaInfo no Detalhe de Asset com toggle Original/Processado e banner de caminho do ficheiro processado.
- Caminho do ficheiro visvel sob o toggle do player (original e processado).
- SHA-256 e TAGS includos na funo "Copiar Tudo" do MediaInfoPanel.
- Reprocessar com selector de perfil no Asset Detail.
- Botes explorador separados para original e processado.
- Download de ficheiro processado.
- Fila com navegao para asset.
- Dashboard scrollvel com lista de jobs recentes.
- Registo de actividades (activity log) em todos os comandos principais.
- 16 novas chaves i18n.

### Fixed

- Durao dos jobs no histrico calculada a partir de `started_at`/`finished_at` (no hardcoded).
- Data de incio no histrico mostra hora real (no sa data de criao).
- Caminho do ficheiro processado no histrico de jobs mostra o path completo com boto abrir.

## [0.21.0] - 2026-05-17

### Fixed

- Sidecar reconstrudo: fix do proxy "width not divisible by 2" agora activo (pad=ceil(iw/2)\*2)
- output_dir migrado automaticamente de %TEMP% para Videos/Nexora Output em instalaes existentes
- max_concurrent_jobs lido da BD pelo queue worker a setting tem agora efeito real
- Race condition na fila eliminada: jobs marcados como 'processing' antes de lanar thread
- filename dos assets includo na resposta de list_jobs (via LEFT JOIN)
- version.ts sincronizado com 0.21.0
- Feedback de retry/cancel quando job no pode ser alterado (toast.warning)
- Log de aces em cancel_job, retry_job, approve_job, reject_job, submit_job

### Changed

- list_jobs ordenado por: processing queued quarantined histrico, limitado a 200 registos
- i18n: adicionadas chaves cannotCancelState, cannotRetryState, retryQueued em 15 lnguas

## [0.20.0] - 2026-05-17

### Added

- MediaInfo no Detalhe de Asset com toggle Original/Processado e banner de caminho do ficheiro processado
- Caminho do ficheiro visvel sob o toggle do player (original e processado)
- SHA-256 e TAGS includos na funo "Copiar Tudo" do MediaInfoPanel
- Videos_Tests/ com 18 samples de vdeo (5s/10s/15s/20s/30s em 360p/720p/1080p/2160p/H265/VP9)

### Fixed

- output_dir padro aponta para Videos/Nexora Output (no para pasta temp do sistema)
- Durao dos jobs no histrico calculada a partir de started_at/finished_at (no hardcoded)
- Data de incio no histrico mostra hora real (no sa data de criao)
- Caminho do ficheiro processado no histrico de jobs mostra o path completo com boto abrir

### Changed

- Limpeza GitHub: eliminao de branches auxiliares, encerramento de 11 PRs Dependabot, remoo de 6 releases draft antigas
- Repositrio limpo com apenas branches main e dev

## [0.19.0] - 2026-05-17

### Added

- Suporte a codecs H.265/HEVC e VP9 no pipeline de transcodificao
- BatchSubmitModal com estimativas de tempo e tamanho por ficheiro
- Thumbnails automticos gerados pelo worker de thumbnail
- Player inline na Biblioteca para preview do vdeo original
- MediaInfo detalhado no ecrde Detalhe de Asset (GENERAL, VIDEO, AUDIO)
- Navegao clicvel nos cabealhos e nomes de vdeo na Biblioteca (Grid e Lista)
- Ficha tcnica do Asset em abas horizontais modernas (Relatrio QC, Metadados, Histrico)

### Fixed

- Corrigido parsing e escala VMAF no Windows (paths com `:` no filtergraph substitudos por `\:`)
- Corrigido loop de loading infinito no ecrssetDetailPage
- Corrigido mock sncrono do mdulo nativo `fs` em workers.test.ts (Vitest)
- Corrigido emit duplicado de `job:started` gerido agora apenas pelo Orchestrator
- Corrigido problema de bloqueio de ficheiros no Windows no script sync.ps1

## [0.18.0] - 2026-05-16

### Fixed

- Drag-and-drop de ficheiros agora funciona via evento nativo `tauri://drag-drop` (T03/T04)
- Activos deixam de ficar em estado "pending" submit_job` chamado automaticamente aps ingest (T04)
- Sidecar arranca correctamente via `Command::new("node")` com path dinmico (T05)
- Verso da aplicao lida dinamicamente via `getVersion()` de `@tauri-apps/api/app` (T06)

### Security

- CSP estrita substituiu `"csp": null` com poltica granular por directiva (T07)
- Capabilities reduzidas a permisses explcitas (least-privilege) em vez de `*:default` (T08)

### Changed

- Sidecar agora completamente stateless sidecar/db.ts`e`NexoraSimpleQueue.ts` eliminados (T09)
- Hooks `useJobStatus` e `useDiskSpace` migrados de polling para eventos Tauri (`listen()`) (T10)
- Settings persistentes via `tauri-plugin-store` em vez de `localStorage` (T11)
- Logging unificado via `tauri-plugin-log` com targets stdout, ficheiro e webview (T12)
- Toasts migrados de `react-hot-toast` para `sonner` (T14)
- `HelpModal` migrado para Radix Dialog com focus trap e ARIA correcto (T15)
- `LibraryPage` com virtualizao via `@tanstack/react-virtual` para listas grandes (T16)
- Dashboard com grficos VMAF (BarChart) e mtricas CPU/RAM (AreaChart) via recharts (T17)

### Added

- ESLint flat config + Prettier com scripts `lint`, `format`, `build:analyze` (T18)
- Husky pre-commit hook com lint-staged (T19)
- Bundle analyzer com `rollup-plugin-visualizer` e manual chunk splitting (T20)
- Testes de componentes com vitest + jsdom + Testing Library (T21)
- Dependabot config para npm, cargo e GitHub Actions (T22)
- Documentao do processo de release e code signing em `docs/RELEASE.md` (T23)
- Toggle de telemetria opt-in (desactivado por defeito) nas definies (T24)

## [0.17.0] - 2026-05-14

### Added

- feat: Replicar projeto principal Nexora Desktop

## [0.16.0] - 2026-05-13

### Added

- feat: Versao para teste

## [0.15.0] - 2026-05-13

### Added

- feat: Anlise workspace aplicao e regras

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

- fix: Race condition na fila claimNextJob() atmico (SELECT+UPDATE numa transaco SQLite)
- feat: Tabela `profiles` no schema para perfis personalizados
- feat: Tauri command `get_queue_stats` estatsticas da fila (queued/processing/done/error hoje)
- feat: Tauri command `retry_job` re-enfileira jobs com erro ou cancelados
- feat: Tauri commands `create_profile`, `update_profile`, `delete_profile` de perfis custom
- feat: Tauri command `export_logs` exporta logs para ficheiro .txt
- feat: Tauri command `get_changelog` devolve CHANGELOG.md compilado no binrio
- docs: ANTIGRAVITY-GUIA.md guia passo a passo para utilizador no-tcnico gerar ecrs

## [0.6.0] - 2026-05-10

### Added

- feat: Problemas encontrados e corrigidos durante o teste

## [0.5.0] - 2026-05-10

### Added

- feat: Prompt Desktop Bug fixes + Gap Analysis Concluo

## [0.4.1] - 2026-05-10

### Added

-

## [0.4.0] - 2026-05-10

### Added

- feat: Correces para releases

## [0.3.0] - 2026-05-09

### Added

- feat: PROMPT 3 rontend React

## [0.2.0] - 2026-05-09

### Added

- feat: PROMPT 2 idecar + Queue + Workers

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
