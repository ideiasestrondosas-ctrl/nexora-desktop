## Resumo

Release v0.30.1-beta.1 — 38 alteracoes.

## Novas Funcionalidades

- suporte completo a versoes pre-release (alpha/beta/rc)
- comando reset
- comandos dev-on e dev-off
- setup passos 4-5 — Docker limits + WSL + backup save
- setup passos 1-3 — Defender e WSearch exclusions
- comando status
- scaffold base + comando help
- add isolated Nexora QA Runner subproject
- add DEV-only Beta Testing Guide viewer in HelpModal

## Correccoes

- add WiX numeric version to fix MSI bundling with pre-release tags
- parse pre-release version tags correctly (e.g. 0.30.0-beta.1)
- replace WSearch COM approach with NTFS NotContentIndexed attribute
- PS5.1 compat — requires 5.1 + UTF-8 BOM
- backup inicial antes de step 1 + comentar NeverTouchProcs
- reset — avisa se WSearch falha ao remover exclusão
- dev-off trata JSON corrupto graciosamente
- guardar dockerBefore como objecto não string JSON
- coerce null ExclusionPath para array + fix comentário PT
- status — Docker check + service label précision
- UTF8 encoding + mover canonicalPkg para Invoke-Setup
- add missing HelpModal tab keys in en/base.json + commit 3 README screenshots
- encoding UTF-8 completo — [Console]::InputEncoding + Get-Content -Encoding utf8
- Watch-GitHubActions usa branch em vez de head_sha — detecta novos runs após push de correcção

## Alteracoes

- apply prettier formatting to fix CI check

## Infraestrutura e Documentacao

- v0.30.1-beta.1
- v0.30.1
- bump i18next from 26.1.0 to 26.2.0 (#32)
- bump serde_json from 1.0.149 to 1.0.150 in /src-tauri (#31)
- bump the typescript-eslint group with 2 updates (#28)
- bump window-vibrancy from 0.5.3 to 0.6.0 in /src-tauri (#27)
- bump the testing group with 2 updates (#26)
- bump @tauri-apps/cli in the tauri-plugins group (#24)
- bump log from 0.4.29 to 0.4.30 in /src-tauri (#23)
- add Dev Environment Optimizer section for dev-optimize.ps1
- remove duplicado iCloudCKKS no spec
- plano de implementação dev-optimize.ps1
- design spec para dev-optimize.ps1 — optimização do ambiente de desenvolvimento
- add comprehensive beta testing guides in PT and EN

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
