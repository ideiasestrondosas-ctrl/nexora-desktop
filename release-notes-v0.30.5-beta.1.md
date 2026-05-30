## Resumo

Release v0.30.5-beta.1 — 17 alteracoes.

## Novas Funcionalidades

- parse CHANGELOG section for real release notes in latest.json
- emit mica-status event after apply_mica/apply_vibrancy
- ThumbnailImg shared component with IPC base64 fallback
- add read_thumbnail_base64 IPC command

## Correccoes

- tauri.conf.json versao numerica 0.30.5
- lint-staged apanha ficheiros JSON/MD/MJS em subdirectorios
- prettier — formatar ficheiros do release v0.30.5-beta.1
- cargo fmt
- stale closure em progress bar + transição CSS
- solid background fallback when Mica/Vibrancy unavailable
- ThumbnailImg useCallback dep array — use ref instead of captured state
- onError logging in video player + comparator; ThumbnailImg in detail view
- wider assetProtocol scope + base64 dep

## Infraestrutura e Documentacao

- v0.30.5-beta.1
- media loading + light mode + UpdateModal implementation plan
- media loading + light mode fallback + UpdateModal — v0.30.5
- 2: Fixing media loading, light mode backgrounds, and UpdateModal in Nexora Desktop

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
