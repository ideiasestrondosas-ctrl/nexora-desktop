## Resumo

Release v0.29.0-alpha.1 — 22 alteracoes.

## Novas Funcionalidades

- traducoes PT para onboarding, bugReport, watchFolders, privacidade, erros pipeline
- BugReportModal com log anexado — clipboard, GitHub Issue, ficheiro
- registo local opt-in de eventos + painel Privacidade em Settings
- modal 4 passos no primeiro arranque com output dir e telemetria opt-in
- mensagens de erro de pipeline categorizadas e accionaveis
- frontend React — tab Settings, listener evento, integração fila
- backend Rust — notify crate, comandos Tauri, watcher thread
- adicionar tabelas watch_folders e telemetry_events
- script check-translations para auditar chaves EN vs todas as linguas

## Correccoes

- prettier em check-translations.mjs
- versao numerica no tauri.conf.json para compatibilidade MSI
- cargo fmt em logs.rs, watch_folders.rs e lib.rs
- usar n.clamp(1, 500) em get_last_n_logs_text
- error handling em handlers async — BugReportModal e telemetry toggle
- TOTAL_STEPS constante, error handling em handlers, STORAGE_KEY exportada
- remover import nao utilizado de join em check-translations.mjs

## Infraestrutura e Documentacao

- v0.29.0-alpha.1
- actualizar PROGRESS-DESKTOP e SYNC-STATE com sessao 27
- ALPHA-TESTING.md — guia de instalacao e 22 accoes de teste para alpha testers
- plano de implementacao Alpha Instrumentada v0.29.0 — 11 tasks
- spec Alpha Instrumentada v0.29.0 — 7 componentes para alpha fechada
- actualizar SYNC-STATE, PROGRESS-DESKTOP e CHANGELOG — Sessao 26

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
