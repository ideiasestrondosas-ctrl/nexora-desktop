# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-16 18:00
Agente: Claude Code (Sonnet 4.6)

## O que foi feito

### Sessao Actual — Auditoria v0.18.0 (T01–T25) + Correcao de Bugs — CONCLUIDO

**Auditoria completa T01–T25 (`chore/audit-v0.18`):**

1. **T01–T06 (Bugs criticos):** drag-drop config, handler DropZone, spawn sidecar, versao dinamica
2. **T07–T08 (Seguranca):** CSP granular, capabilities least-privilege
3. **T09–T12 (Arquitectura):** SQLite unico no Rust, eventos vs polling, settings via tauri-plugin-store, logging unificado
4. **T13–T14 (Dependencias):** sonner, Radix, recharts; migrar toasts
5. **T15–T17 (UX):** HelpModal Radix Dialog, virtualizacao LibraryPage, graficos recharts
6. **T18–T19 (Qualidade):** ESLint flat config, Prettier, Husky + lint-staged
7. **T20 (Bundle):** rollup-plugin-visualizer
8. **T21 (Testes):** vitest + Testing Library, DropZone.test.tsx (8 testes)
9. **T22 (CI):** GitHub Actions lint+test+rust-check + Dependabot
10. **T23 (Docs):** docs/RELEASE.md (code signing)
11. **T24 (Telemetria):** opt-in Sentry desactivado por defeito
12. **T25 (Release):** bump v0.18.0 em package.json, Cargo.toml, tauri.conf.json, CHANGELOG.md

**Bugs corrigidos apos auditoria:**

- **Biblioteca preta:** `h-full` → `flex-1 min-h-0` em LibraryPage root; App wrapper `flex flex-col overflow-hidden` para tab library
- **Drag-drop Dashboard ignorado:** Listener global `tauri://drag-drop` em App.tsx com `activeTabRef` para guard por tab
- **Sidecar code 1:** `JobInput` interface incompleta em `sidecar/index.ts`; IngestWorker nao actualizava `ctx` apos ffprobe; orchestrator emitia `job:started` duplicado

**Limpeza final:**

- Tipos `any` residuais substituidos em `AssetDetailModal.tsx`, `useTauriCommand.ts`
- eslint-disable anotacoes em `DropZone.tsx`, `ProfilesPage.tsx`
- `.prettierignore` criado

---

## Estado de compilacao

- `tsc --noEmit`: **OK** (0 erros)
- `cargo check`: **OK** (0 erros)
- `npm run lint`: **OK** (0 warnings)
- `npm run sidecar:build`: **OK** (31.7kb)
- Validacao JSON i18n: **OK** (15 linguas completas)

---

## Proximos passos (v0.19.0 — proxima sessao)

Aguarda validacao manual do utilizador antes de comecar v0.19.0.

| Tarefa                                                    | Prioridade |
| --------------------------------------------------------- | ---------- |
| Testar fluxo real: tauri dev + drag-drop + processamento  | Critica    |
| Fazer merge de `chore/audit-v0.18` → `main` (se validado) | Alta       |
| **v0.19.0-A:** Codecs H.265/HEVC e VP9                    | Media      |
| **v0.19.0-B:** AnalyzeWorker (FFprobe como MediaInfo)     | Media      |
| **v0.19.0-C:** Scan recursivo de diretorias               | Media      |
| **v0.19.0-D:** BatchSubmitModal + estimativas             | Baixa      |

---

## Branch actual

`chore/audit-v0.18` — nao merged ainda

## Ficheiros chave modificados (v0.18.0)

```
MODIFICADOS (auditoria):
src-tauri/tauri.conf.json       — dragDrop, CSP, versao 0.18.0
src-tauri/capabilities/default.json — drag-drop + least-privilege
src-tauri/Cargo.toml            — versao 0.18.0
src/App.tsx                     — versao dinamica, drag-drop global
src/pages/LibraryPage.tsx       — flex-1 min-h-0
src/store/settings.ts           — telemetry opt-in + tauri-plugin-store
src/pages/SettingsPage.tsx      — toggle telemetria
src/lib/version.ts              — APP_VERSION 0.18.0
package.json                    — v0.18.0, husky, lint-staged, deps
vite.config.ts                  — visualizer, manual chunks
CHANGELOG.md                    — entrada v0.18.0

MODIFICADOS (bugs):
sidecar/index.ts                — JobInput interface completa
sidecar/workers/ingest-worker.ts — ctx actualizado apos ffprobe
sidecar/orchestrator/NexoraDesktopOrchestrator.ts — sem job:started duplo

NOVOS:
.husky/pre-commit
.prettierignore
.github/workflows/ci.yml
.github/dependabot.yml
docs/RELEASE.md
tests/setup.ts
tests/components/DropZone.test.tsx
vitest.config.ts
```

---

## Notas tecnicas para o proximo agente

- **Sidecar dist nao esta no git** — correr `npm run sidecar:build` antes de cada `tauri dev`
- **15 linguas i18n completas** — ao adicionar texto novo, traduzir SEMPRE todos os 15 locales em `src/i18n/locales/`
- **FFmpeg execFile** — NUNCA usar `exec` com string; sempre `execFile` com array de argumentos
- **JobContext propagation** — IngestWorker DEVE actualizar `ctx.*` apos ffprobe (ja corrigido); workers downstream dependem disto
- **QCPreWorker** — lanca erro se `!ctx.assetVideoCodec` (null/undefined); o IngestWorker garante que esta preenchido apos o passo 0
- **tauri-plugin-store** — settings persistem em ficheiro nativo; nao usar localStorage
- **Ollama para traducoes** — script `scripts/translate-all.cjs` suporta resume automatico
