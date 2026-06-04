## Resumo

Release v0.33.0-beta.1 — 45 alteracoes.

## Novas Funcionalidades

- migrate_cloud_v3 — adicionar 'mega' ao CHECK constraint
- provider MEGA — tipo, label, fields, help
- delete_files — por handle, falhas acumuladas
- download via tokio compat writer
- list_files — navega por handle, mapeia Node->RemoteFile
- upload via tokio compat reader
- test_connection — login + verifica pasta base
- MegaProvider struct + new() + unit tests
- help text para todos os providers (FTP/SFTP/SMB/S3/iCloud)
- feedback visual verde ao copiar código GDrive Device Flow
- UI OAuth partilhada para GDrive e Dropbox — PKCE connect + Device Flow fallback
- adicionar Dropbox a CloudProviderType, labels e fields
- provider Dropbox com upload session para ficheiros >150MB
- comando oauth_connect (PKCE) + refresh automático em load_profile_provider
- oauth.rs — PKCE, listener localhost, exchange_code, refresh_if_needed

## Correccoes

- client_secret no refresh GDrive + modal scrollável
- bloquear Escape/clique fora do modal durante e após OAuth
- adicionar dropbox e gdrive_personal ao CHECK constraint cloud_profiles
- keyring v3 requer features explícitas para backend nativo
- corrigir race condition oauth_token Dropbox no teste
- Dropbox porta fixa 8475 + icon ? tema claro + GDrive help
- merge creds no update + fix Dropbox redirect URI + help icons
- fallback keychain→config + layout bg-bg-primary nos modais cloud
- restaurar GDrive Device Flow + separar gdrive_personal PKCE + seleção por cards
- PublishDraft detecta Build runs em branches de tag
- fallback GITHUB_TOKEN via gh CLI se .env nao tiver token

## Alteracoes

- remover full_path nao utilizado em producao
- extrair credentials para cloud/credentials.rs e corrigir load_profile_provider

## Infraestrutura e Documentacao

- v0.33.0-beta.1
- adicionar testes para email e password vazios
- adicionar mega e tokio-util para provider MEGA.nz
- fim sessao 67 — documentacao cloud completa
- adicionar documentação e testes para todos os providers cloud
- actualizar manual e guia de testes — MEGA.nz cloud provider
- fim sessao 66 — MEGA provider testado manualmente OK
- actualizar ficheiros fim de sessao 66 — MEGA provider implementado
- WIP sessao 65 — plano MEGA pronto, aguarda execucao
- plano de implementação MEGA.nz cloud provider
- design MEGA.nz cloud provider (sessão 65)
- actualizar ficheiros fim de sessao 64 — OAuth cloud concluido
- plano de implementação Google Drive PKCE + Dropbox
- Google Drive OAuth PKCE + Dropbox — design Fase 1
- sessao 63 — release v0.32.0-beta.1 publicada, sync.ps1 v1.4.2
- sessao 63 final — sync.ps1 v1.4.2 + git credential
- sessao 63 — release v0.32.0-beta.1 publicada

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
