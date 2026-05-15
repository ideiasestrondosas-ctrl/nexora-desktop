# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
