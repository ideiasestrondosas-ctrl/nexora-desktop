## Resumo

Release v0.30.2-beta.1 — 16 alteracoes.

## Novas Funcionalidades

- add system diagnostics modal and health badge in sidebar
- compile sidecar as SEA binary via pkg, remove Node.js dependency
- add script version tracking (v1.1.0) — shown in menu and help headers

## Correccoes

- add nexora-engine placeholder to ci.yml rust-check job
- cargo fmt + prettier — lib.rs warn! multiline, sidecar.rs if-else block, format all
- replace SVG placeholders with PNG, remove non-existent screens, add dependency panel to Settings
- fix macOS CI stage, remove Node.js check from startup_checks, clean locale startup keys
- correct comparator i18n path, TAB_COUNTS, and add placeholder screenshots
- use make_latest=true instead of prerelease=true in all release payloads

## Alteracoes

- resequence menu (0=Sair last, 4=PublishDraft) + auto-wait CI in Invoke-PublishDraft

## Infraestrutura e Documentacao

- v0.30.2-beta.1
- update SYNC-STATE and PROGRESS for v0.30.2-beta.1 (Sessao 31)
- implementation plan for SEA sidecar + help fixes + diagnostics UI
- SEA sidecar + help manual fixes + dependency checker UI
- 3: screenshots em falta
- 2: Fix Nexora Desktop missing video tools and documentation

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
