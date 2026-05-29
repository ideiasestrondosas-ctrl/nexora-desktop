## Resumo

Release v0.30.3-beta.1 — 12 alteracoes.

## Novas Funcionalidades

- auto-update modal on startup + signing keys + session hooks

## Correccoes

- nova pubkey — chave regenerada com password vazia explicita
- tauri signer sign sem --private-key — CLI decode path com \_ como base64
- re-assinar bundles sobreviventes pos-tauri-action para latest.json
- caminho exacto do bundle sem glob — ficheiros com espacos nao expandem
- usar bash glob em vez de find — evita find.exe Windows no PATH
- gerar latest.json manualmente — tauri-action nao suporta Tauri v2 updater
- tauri.conf.json versao numerica 0.30.3 (MSI nao aceita semver pre-release)
- Watch-GitHubActions monitors all branches, ignores old runs, adds timeout

## Infraestrutura e Documentacao

- bump para v0.30.3-beta.1 — auto-updater + signing keys
- bump version to 1.2.0
- update SYNC-STATE and PROGRESS for v0.30.2-beta.1 CI fixes + build

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
