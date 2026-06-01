## Resumo

Release v0.31.3-beta.1 — 8 alteracoes.

## Correccoes

- read jobs from useJobsStore instead of duplicate invoke
- add submitted job to useJobsStore so dashboard updates immediately
- read release-notes file as fallback for latest.json notes + fill CHANGELOG v0.31.2
- update modal wider + markdown rendering for release notes
- add qc_quarantined and qc_rejected to Job status union

## Infraestrutura e Documentacao

- actualizar SYNC-STATE sessao 50 -- 3 bugfixes UI/pipeline/dashboard
- implementation plan update modal + pipeline notes + dashboard jobs
- design update modal + pipeline notes + dashboard jobs

---

## Instaladores

| Plataforma | Ficheiro                                |
| ---------- | --------------------------------------- |
| Windows    | .msi ou .exe (NSIS)                     |
| macOS      | .dmg (Universal: Intel + Apple Silicon) |
| Linux      | .deb (Debian/Ubuntu) ou .AppImage       |

Consulta o [CHANGELOG.md](CHANGELOG.md) para detalhes das alteracoes.
