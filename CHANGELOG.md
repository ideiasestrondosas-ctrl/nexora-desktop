# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

<<<<<<< HEAD
=======
## [0.17.0] - 2026-05-14

### Added
- feat: Replicar projeto principal Nexora Desktop


>>>>>>> dev
## [0.16.0] - 2026-05-13

### Added
- feat: Versao para teste


## [0.15.0] - 2026-05-13

### Added
<<<<<<< HEAD
- feat: AnÃ¡lise workspace aplicaÃ§Ã£o e regras
=======
- feat: AnÃƒÂ¡lise workspace aplicaÃƒÂ§ÃƒÂ£o e regras
>>>>>>> dev


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
<<<<<<< HEAD
- fix: Race condition na fila ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â claimNextJob() atÃƒÆ’Ã‚Â³mico (SELECT+UPDATE numa transacÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o SQLite)
- feat: Tabela `profiles` no schema para perfis personalizados
- feat: Tauri command `get_queue_stats` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â estatÃƒÆ’Ã‚Â­sticas da fila (queued/processing/done/error hoje)
- feat: Tauri command `retry_job` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â re-enfileira jobs com erro ou cancelados
- feat: Tauri commands `create_profile`, `update_profile`, `delete_profile` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â CRUD de perfis custom
- feat: Tauri command `export_logs` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â exporta logs para ficheiro .txt
- feat: Tauri command `get_changelog` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â devolve CHANGELOG.md compilado no binÃƒÆ’Ã‚Â¡rio
- docs: ANTIGRAVITY-GUIA.md ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â guia passo a passo para utilizador nÃƒÆ’Ã‚Â£o-tÃƒÆ’Ã‚Â©cnico gerar ecrÃƒÆ’Ã‚Â£s
=======
- fix: Race condition na fila ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â claimNextJob() atÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³mico (SELECT+UPDATE numa transacÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o SQLite)
- feat: Tabela `profiles` no schema para perfis personalizados
- feat: Tauri command `get_queue_stats` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â estatÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sticas da fila (queued/processing/done/error hoje)
- feat: Tauri command `retry_job` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â re-enfileira jobs com erro ou cancelados
- feat: Tauri commands `create_profile`, `update_profile`, `delete_profile` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â CRUD de perfis custom
- feat: Tauri command `export_logs` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â exporta logs para ficheiro .txt
- feat: Tauri command `get_changelog` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â devolve CHANGELOG.md compilado no binÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
- docs: ANTIGRAVITY-GUIA.md ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â guia passo a passo para utilizador nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o-tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©cnico gerar ecrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£s
>>>>>>> dev

## [0.6.0] - 2026-05-10

### Added
- feat: Problemas encontrados e corrigidos durante o teste


## [0.5.0] - 2026-05-10

### Added
<<<<<<< HEAD
- feat: Prompt Desktop Bug fixes + Gap Analysis ConcluÃƒÆ’Ã‚Â£o
=======
- feat: Prompt Desktop Bug fixes + Gap Analysis ConcluÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o
>>>>>>> dev


## [0.4.1] - 2026-05-10

### Added
- 


## [0.4.0] - 2026-05-10

### Added
<<<<<<< HEAD
- feat: CorrecÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para releases
=======
- feat: CorrecÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes para releases
>>>>>>> dev


## [0.3.0] - 2026-05-09

### Added
<<<<<<< HEAD
- feat: PROMPT 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Frontend React
=======
- feat: PROMPT 3 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Frontend React
>>>>>>> dev


## [0.2.0] - 2026-05-09

### Added
<<<<<<< HEAD
- feat: PROMPT 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Sidecar + Queue + Workers
=======
- feat: PROMPT 2 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Sidecar + Queue + Workers
>>>>>>> dev


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
