## Resumo

Release v0.31.4-beta.1 — 12 alteracoes.

## Novas Funcionalidades

- add filename field to Job interface

## Correccoes

- validar binarios media por execucao em todos os niveis
- rejeitar stubs de 1 byte ao resolver ffmpeg/ffprobe em dev
- job:quarantined event sets qc_quarantined status (not cancelled)
- use GitHub API to resolve BtbN FFmpeg asset URL
- migrate QueuePage to useJobsStore — jobs now visible immediately after submission

## Infraestrutura e Documentacao

- sessao 53b — validacao binarios media 4 niveis + merge dev->main local
- actualizar estado sessao 53 — fix pipeline ffprobe/ffmpeg
- actualizar SYNC-STATE sessao 52 -- QueuePage store migration + FFmpeg fix
- QueuePage store migration + FFmpeg dev fix implementation plan
- design QueuePage → useJobsStore + FFmpeg dev fix
- corrigir release-notes v0.31.3 + SYNC-STATE + PROGRESS Fase 27

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
