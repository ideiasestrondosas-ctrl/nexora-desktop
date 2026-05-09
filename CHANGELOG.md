# Changelog

Todas as alteracoes relevantes do Nexora Desktop sao documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionamento em [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
