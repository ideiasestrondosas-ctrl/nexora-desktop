## Resumo

Release v0.31.4-beta.1 — 17 alteracoes.

## Novas Funcionalidades

- add filename field to Job interface

## Correccoes

- regex BtbN exacto para não apanhar gpl-shared em vez de gpl static
- stash/pop automático em Invoke-MergeToMain para Cargo.lock modificado
- validar binarios media por execucao em todos os niveis
- rejeitar stubs de 1 byte ao resolver ffmpeg/ffprobe em dev
- job:quarantined event sets qc_quarantined status (not cancelled)
- use GitHub API to resolve BtbN FFmpeg asset URL
- migrate QueuePage to useJobsStore — jobs now visible immediately after submission

## Alteracoes

- cargo fmt — reformatar condição if em sidecar.rs

## Infraestrutura e Documentacao

- v0.31.4-beta.1
- sessao 53b — validacao binarios media 4 niveis + merge dev->main local
- actualizar estado sessao 53 — fix pipeline ffprobe/ffmpeg
- actualizar SYNC-STATE sessao 52 -- QueuePage store migration + FFmpeg fix
- QueuePage store migration + FFmpeg dev fix implementation plan
- design QueuePage → useJobsStore + FFmpeg dev fix
- corrigir release-notes v0.31.3 + SYNC-STATE + PROGRESS Fase 27
- 2: QueuePage Store Migration + FFmpeg Dev Fix, Fix spawn UNKNOWN ffprobe/ffmpeg em dev, fix media-binary failures in Nexora Desktop. validated ffmpeg/ffprobe by execution across 4 levels

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
