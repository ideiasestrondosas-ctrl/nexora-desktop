# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
- fix: Race condition na fila â€” claimNextJob() atÃ³mico (SELECT+UPDATE numa transacÃ§Ã£o SQLite)
- feat: Tabela `profiles` no schema para perfis personalizados
- feat: Tauri command `get_queue_stats` â€” estatÃ­sticas da fila (queued/processing/done/error hoje)
- feat: Tauri command `retry_job` â€” re-enfileira jobs com erro ou cancelados
- feat: Tauri commands `create_profile`, `update_profile`, `delete_profile` â€” CRUD de perfis custom
- feat: Tauri command `export_logs` â€” exporta logs para ficheiro .txt
- feat: Tauri command `get_changelog` â€” devolve CHANGELOG.md compilado no binÃ¡rio
- docs: ANTIGRAVITY-GUIA.md â€” guia passo a passo para utilizador nÃ£o-tÃ©cnico gerar ecrÃ£s

## [0.6.0] - 2026-05-10

### Added
- feat: Problemas encontrados e corrigidos durante o teste


## [0.5.0] - 2026-05-10

### Added
- feat: Prompt Desktop Bug fixes + Gap Analysis ConcluÃ£o


## [0.4.1] - 2026-05-10

### Added
- 


## [0.4.0] - 2026-05-10

### Added
- feat: CorrecÃ§Ãµes para releases


## [0.3.0] - 2026-05-09

### Added
- feat: PROMPT 3 â€” Frontend React


## [0.2.0] - 2026-05-09

### Added
- feat: PROMPT 2 â€” Sidecar + Queue + Workers


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
