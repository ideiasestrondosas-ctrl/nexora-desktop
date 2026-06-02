# Design Spec — Auditoria de Segurança Defensiva → v0.32.0-beta.1

**Data:** 2026-06-02
**Estado:** Implementado
**Release:** 0.32.0-beta.1
**Relatório:** `docs/SECURITY_AUDIT_REPORT_0.32.0-beta.1.md`
**Âmbito vivo:** `SECURITY_SCOPE.md`

## Problema

O Nexora Desktop nunca tinha sido auditado em segurança. O utilizador pediu uma
análise defensiva exaustiva (base: `docs/SECURITY_AUDIT_PROMPT_V4.md`), a correção
de **todos** os achados (Critical → Low) e um relatório profissional, tudo a sair
numa release 0.32.0-beta.1.

## Princípio orientador (modelo de ameaça)

App **desktop local** — sem servidor exposto, frontend bundled, `script-src 'self'`,
sem `dangerouslySetInnerHTML`. Os vectores reais são: (A) atacante de rede nos
uploads cloud, (B) supply-chain no build, (C) defesa-em-profundidade, (D) máquina
multi-utilizador. A severidade de cada achado foi **ajustada ao contexto** (vários
achados marcados High por ferramentas genéricas são, na prática, Low — ex.:
`create_windows_shortcut` usa `current_exe()`, `open_path` usa `.arg()` sem shell).

## Decisões de design

1. **C1 (SFTP host key):** TOFU com **confirmação de fingerprint na 1ª ligação**,
   persistida em SQLite (`ssh_known_hosts`); mismatch → ligação rejeitada. Alternativa
   rejeitada: pré-distribuir host keys (inviável para uploads ad-hoc do utilizador).
2. **H2 (asset scope):** scope **estático** aos dirs do utilizador (remover `**`);
   enforcement real delegado em M1 (validação de path).
3. **H1 (binários):** checksum SHA-256 com lock file versionado; falhar build em
   mismatch. Assinatura GPG do FFmpeg considerada mas o BtbN não a publica de forma
   estável → checksum é o controlo pragmático.
4. **M4 (redacção):** redigir só a **password** em URLs `scheme://user:pass@host`,
   sem dependência nova (string-based) — preserva diagnóstico (scheme/user/host).
5. **L1 (CSP style-src):** **risco aceite** — Radix injecta estilos inline; remover
   partiria a UI; `script-src 'self'` fecha o vector perigoso.
6. **M3 (SHA-pin):** **risco aceite** — só actions oficiais por major tag; churn
   supera o ganho. Reavaliar se entrarem actions de terceiros.

## Execução

- 1 commit por achado, cada um com teste de regressão que falha antes e passa depois.
- Alterações mínimas e cirúrgicas (Karpathy): sem refactors fora do âmbito.

## Achados e correções (resumo)

| ID    | Sev      | Correção                                      | Commit    |
| ----- | -------- | --------------------------------------------- | --------- |
| C1    | Critical | TOFU host key SFTP + confirmação              | `d4604ba` |
| H1    | High     | Checksum SHA-256 dos binários média           | `bf544b7` |
| H2    | High     | Remover `**` do assetProtocol scope           | `bb4d90d` |
| M1    | Medium   | base64 só de assets registados                | `4c69226` |
| M2    | Medium   | Escapar `\` na query GDrive                   | `712f79b` |
| M3    | Medium   | Least-privilege no CI/CD                      | `6207061` |
| M4    | Medium   | Redigir credenciais nos exports de logs       | `77f4149` |
| L2    | Low      | Aspas no Exec do `.desktop`                   | `dde36af` |
| L3    | Low      | 0o600 na BD SQLite (Unix)                     | `dde36af` |
| L1    | Low      | CSP style-src — risco aceite                  | (doc)     |
| L4/I1 | Low/Info | SECURITY_SCOPE.md criado; pkg/SBOM no roadmap | (doc)     |
| R1    | Rec      | Rotação preventiva do PAT (sem fuga no repo)  | (doc)     |

## Critérios de sucesso (verificados)

- `cargo test` 44 ✅ · `cargo clippy -D warnings` ✅
- `npm test` 52 ✅ · `npm run lint --max-warnings 0` ✅ · `npm audit` 0 vuln ✅
- Bump 0.32.0-beta.1 coerente (package.json, Cargo.toml, tauri.conf.json, lockfiles)
- Relatório + SECURITY_SCOPE.md presentes

## Fora de âmbito (documentado)

- Substituir `@yao-pkg/pkg` (roadmap).
- SBOM automático no CI (roadmap).
- Rotação efectiva do PAT (ação do utilizador).
- Publicação do release (feita pelo utilizador via `sync.ps1`).
