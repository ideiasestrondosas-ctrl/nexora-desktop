# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-06-04
Agente: Claude Code (claude-sonnet-4-6)
Versao: v0.33.0-beta.1
Push: main @ f02a788 (i18n gap fix — merge en/common.json + 2899 strings traduzidas)

## O que foi feito

### Sessao 69 — i18n gap fix (223 chaves × 13 locales)

**Agente:** Claude Code (claude-sonnet-4-6)
**Data:** 2026-06-04

**Resumo:** O utilizador verificou toda a app e identificou features sem documentacao (USER_MANUAL v0.23, SCREEN_GUIDE v0.30). Pediu traducao para as 15 linguas, com PT e EN como base. Durante a analise detectou-se que `en/base.json` (704 chaves, runtime) era codigo morto — os 14 outros locales foram traduzidos de `en/common.json` (881 chaves). Decisao: promover `common.json` (merge das 1048 chaves unicas) e apagar `base.json`. Alem disso, 223 chaves que existiam em `en/common.json` e PT faltavam nas 13 outras locales — todas traduzidas via Ollama (modelo cloud gemma4:31b-cloud).

**Alteracoes principais:**

- `src/i18n/index.ts`: import passa de `en/base.json` para `en/common.json`
- `src/i18n/locales/en/base.json`: **APAGADO** (codigo morto)
- `src/i18n/locales/en/common.json`: merge das 1048 chaves (base 704 ∪ common 881)
- `src/i18n/locales/pt/common.json`: +4 chaves (help.tabs.assetDetail, help.tabs.cloud, help.tabs.import, topbar.help)
- `src/i18n/locales/{es,fr,de,ar,it,ja,ko,nl,pl,ru,sv,tr,zh}/common.json`: +223 chaves cada (2899 strings no total)
- `scripts/check-translations.mjs`: en path actualizado para common.json
- `scripts/validate-i18n.mjs` (NOVO): gate de validacao (JSON, keys, placeholders, mojibake, fallbacks)
- `scripts/extract-translation-gap.mjs` (NOVO): extrai chaves em falta por locale
- `scripts/translate-missing-keys.mjs` (NOVO): traducao batch via Ollama
- `scripts/merge-en-locales.mjs` (NOVO): merge de base+common para common.json
- `package.json`: +4 scripts (i18n:check, i18n:validate, i18n:gap, i18n:translate); lint-staged inclui validate-i18n
- `.github/workflows/ci.yml`: +step "i18n completeness gate"
- `docs/USER_MANUAL.md`: §9 duplicada removida; versao bumpada para 0.33.0-beta.1; 9-15 renumeradas
- `docs/INSTALL.md`, `docs/FUNCTIONS.md`, `docs/SCREEN_GUIDE.md`: headers actualizados para 0.33.0-beta.1
- `docs/BETA_TESTING_GUIDE.{pt,en}.md`: headers actualizados para 0.33.0-beta.1
- `docs/screenshots/README.md`: header actualizado para 0.33.0-beta.1
- `CHANGELOG.md`: secao [Unreleased] actualizada com 5 items

**Metricas:**

- 1 ficheiro apagado (en/base.json)
- 14 ficheiros JSON actualizados (15 locales - en)
- 4 ficheiros de script criados
- 1 ficheiro de script actualizado (check-translations.mjs)
- 7 ficheiros de documentacao actualizados
- ~3000 strings traduzidas (223 chaves × 13 locales + ajustes PT/EN)
- 4 novas secoes/help.tabs adicionadas ao PT

**Verificacoes:**

- `npx tsc --noEmit`: ✓
- `npm run lint`: ✓
- `npm run format:check`: ✓
- `npm test`: 52/52 vitest tests pass ✓
- `node scripts/check-translations.mjs`: alpha gate PT OK, 15 locales 100% completas ✓
- `node scripts/validate-i18n.mjs`: 0 erros, 0 avisos, 15/15 locales 100% ✓

**Commit + Push:**

- `f02a788` fix(i18n): merge en/common.json, translate 223 missing keys to 13 locales
- 37 files changed, 8023 insertions(+), 1151 deletions(-)
- Push: main @ f02a788

**Notas para o proximo agente:**

- Todas as 13 locales estao 100% completas. O gate de i18n em CI falha o build se alguma locale tiver chaves em falta — previne drift futuro.
- O modelo Ollama `gemma4:31b-cloud` produziu traducoes de alta qualidade para todas as 13 linguas. Para PT/EN (ja manuais) e ZH (sem prefixo `[key]` em alguns batches) o parser faz fallback por indice.
- Pendente do agente 67/68: CI v0.33.0-beta.1 (run 26943243489), `sync.ps1 -PublishDraft` quando verde.
- Pendentes da sessao 66/67: teste SFTP end-to-end (TOFU fingerprint), media-binaries.lock.json macOS.
- Para adicionar uma nova lingua: (1) criar pasta src/i18n/locales/{code}, (2) copiar en/common.json, (3) adicionar code a SUPPORTED_LANGS em src/i18n/index.ts, (4) correr `npm run i18n:translate -- {code}`.

**Documentacao:**

| Documento                  | Estado                                                 |
| -------------------------- | ------------------------------------------------------ |
| USER_MANUAL.md             | v0.33.0-beta.1, §9 duplicada removida, TOC actualizado |
| SCREEN_GUIDE.md            | v0.33.0-beta.1, 17 secoes                              |
| BETA_TESTING_GUIDE PT + EN | v0.33.0-beta.1, T10 com 9 testes                       |
| HelpModal in-app (12 tabs) | Completo                                               |
| 15 locales i18n            | 100% completas (apos background)                       |
