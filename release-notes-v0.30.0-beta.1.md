## Resumo

Release v0.30.0-beta.1 — 17 alteracoes.

## Novas Funcionalidades

- botão Processar Selecionados abre BatchSubmitModal
- VisualComparatorPlayer split-screen + tab Comparador no AssetDetail

## Correccoes

- window mouseup cleanup + try/catch no togglePlay
- actualizar APP_VERSION para 0.30.0-beta.1 + histórico completo 0.26-0.30
- remover trigger duplicado de process_cloud_destinations no frontend
- disk thread verifica shutdown a cada 1s (não 10s)
- graceful shutdown via AtomicBool + WatchCmd::Shutdown + ExitRequested handler
- synchronous=NORMAL e wal_autocheckpoint=1000 na conexão SQLite
- purge pending/ingested ao remover pasta + guard contra re-pending
- debounce de tamanho 3s + deduplicação via ingested set

## Alteracoes

- cargo fmt — alinhar com rustfmt do CI

## Infraestrutura e Documentacao

- bump versões para 0.30.0-beta.1 / 0.30.0
- Fix 4 verificado — useLogs usa event-driven listen('log-entry') + fallback 60s
- HelpModal Comparator tab + i18n 15 langs + screenshots + USER_MANUAL/SCREEN_GUIDE v0.30.0-beta.1
- actualizar PROGRESS-DESKTOP e SYNC-STATE com sessao 28 — beta-stability v0.30.0-beta.1
- plano de implementação beta-stability-comparator v0.30.0-beta.1
- beta stability + visual comparator design (v0.30.0-beta.1)

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
