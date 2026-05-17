# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-17 18:15
Agente: Claude Code (Sonnet 4.6)

## O que foi feito

### Sessao 2 — v0.21.0 Bug Fixes + Performance + UX — CONCLUIDO

**Sessao 1 (anterior):**

- B1: Migração `output_dir` de %TEMP% → `Videos/Nexora Output`
- B2: `max_concurrent_jobs` lido dinamicamente da BD (era hardcoded 2)
- B3: `cancel_job` mata processo Node.js via `active_pids` HashMap (taskkill no Windows)
- B4: `list_jobs` inclui LEFT JOIN `a.filename` — filenames visiveis na QueuePage
- B5: Logging de acções em cancel/retry/approve/reject/submit
- B7: Race condition na fila corrigida (UPDATE status antes de drop(db))
- B8: version.ts actualizado para 0.21.0
- F4: Retry/cancel dão feedback via toast quando retornam false
- P2: Novo comando `list_assets_slim` sem campo metadata pesado
- i18n: Adicionadas chaves `cannotCancelState`, `cannotRetryState`, `retryQueued` (15 linguas)

**Sessao 2 (esta sessao):**

- P1: QueuePage passa de polling 2s para 30s + `listen('sidecar:event', fetchData)` (push events)
- P1: DashboardPage idem — 30s polling + push events
- F3: QueuePage recebe `onSelectAsset` prop — filenames clicaveis navegam para AssetDetail
- F3: App.tsx passa `onSelectAsset={handleSelectAsset}` a QueuePage
- F5: Tooltips em LibraryPage (grid/list toggles, ExternalLink, Play, Trash2)
- F5: Tooltip no botao Play overlay em AssetDetailPage
- i18n: Adicionadas chaves em falta em 15 linguas: `rejected`, `step`, `gpuNvenc`, `rejectedManual`, `openProcessedFile`, `viewAsset`, `gridView`, `listView`
- Corrigidos valores errados (inglês) no locale `pt` para `rejected`/`rejectedManual`

---

## Estado de compilacao

- `tsc --noEmit`: **OK** (0 erros)
- `cargo check`: **OK** (0 erros — v0.21.0)
- `vitest run`: **OK** (24 testes)
- Validacao JSON i18n: **OK** (15 linguas completas)

---

## Estado das branches

- `dev`: changes not yet committed — fazer commit + push
- `main`: commit anterior (v0.20.0 area)
- Remote: apenas `main` e `dev`

---

## Proximos passos (Sessao 3 — UX + Performance)

| Tarefa                                                              | Prioridade | Plan item |
| ------------------------------------------------------------------- | ---------- | --------- |
| Empty state Dashboard quando totalAssets === 0                      | Alta       | UX3       |
| Mensagens startup mais amigaveis para utilizadores normais          | Media      | UX1       |
| Perfis com `label_friendly` (broadcast-hd → Alta Qualidade, etc.)   | Media      | UX2       |
| Pipeline: 3 fases visuais em vez de 8 passos tecnicos               | Media      | UX4       |
| Lazy loading com React.lazy (DashboardPage, LogsPage, ProfilesPage) | Baixa      | P3        |
| Actualizar screenshots (Sessao 4)                                   | Baixa      | -         |
| Auditoria i18n 15 linguas (Sessao 4)                                | Baixa      | -         |

---

## Notas tecnicas para o proximo agente

- **Sidecar dist nao esta no git** — correr `npm run sidecar:build` antes de cada `tauri dev`
- **15 linguas i18n completas** — ao adicionar texto novo, traduzir SEMPRE todos os 15 locales em `src/i18n/locales/`
- **FFmpeg execFile** — NUNCA usar `exec` com string; sempre `execFile` com array de argumentos
- **VMAF model escaping no Windows** — no filtergraph `-lavfi`, os caminhos absolutos como `C:/path` no Windows geram erro. Substituir sempre por `C\:/path` no `libvmaf=model='path=...'`.
- **active_pids** — `AppState` tem `active_pids: Mutex<HashMap<String, u32>>` para matar processos Node.js ao cancelar
- **list_assets_slim** — usar em listagens (Dashboard, LibraryPage) em vez de `list_assets` para evitar metadata JSON pesado
- **sidecar:event** — QueuePage e DashboardPage ouvem este evento para actualizacoes em tempo real; polling e fallback a 30s
- **tauri-plugin-store** — settings persistem em ficheiro nativo; nao usar localStorage
- **Videos_Tests/** — ja no git; 18 samples de video de teste
