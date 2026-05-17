# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-17 18:40
Agente: Claude Code (Sonnet 4.6)

## O que foi feito

### Sessao 4 — v0.21.0 Validação + i18n Audit — CONCLUIDO

**Sessao 4 (esta sessao):**

- i18n: Auditoria completa — detectadas 153 chaves em falta em 14 locales (vs pt reference)
- i18n: Propagadas 153 chaves × 14 locales = 2142 entradas adicionadas; todos os locales têm agora 663 chaves
- Sidecar: Reconstruído (`npm run sidecar:build`) — dist actualizado com todos os fixes v0.19-v0.21
- Verificado: B5 (LIMIT 200 em list_jobs) já estava implementado em sessao anterior
- Plano v0.21.0 completo — todas as sessoes 1-4 concluidas

### Sessao 3 — v0.21.0 UX + Performance — CONCLUIDO

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

**Sessao 2 (anterior):**

- P1: QueuePage passa de polling 2s para 30s + `listen('sidecar:event', fetchData)` (push events)
- P1: DashboardPage idem — 30s polling + push events
- F3: QueuePage recebe `onSelectAsset` prop — filenames clicaveis navegam para AssetDetail
- F3: App.tsx passa `onSelectAsset={handleSelectAsset}` a QueuePage
- F5: Tooltips em LibraryPage (grid/list toggles, ExternalLink, Play, Trash2)
- F5: Tooltip no botao Play overlay em AssetDetailPage
- i18n: Adicionadas chaves em falta em 15 linguas

**Sessao 3 (esta sessao):**

- UX1: Mensagens de startup amigaveis — sem referencias a PATH/npm; i18n `startup.*` em 15 linguas
- UX2: Campo `labelFriendly` em todos os 8 profiles JSON; `TranscodeProfile` interface actualizada; Rust `Profile` struct com `label_friendly: Option<String>`; ProfilesPage mostra label amigavel como titulo principal
- UX3: Empty state no Dashboard quando `totalAssets === 0` — Upload icon, mensagem, botao "Adicionar Video"; i18n `dashboard.emptyTitle/emptyHint/addFirstVideo` em 15 linguas
- UX4: Pipeline 3 fases visuais (`PIPELINE_PHASES`) em vez de 8 passos independentes — "A analisar", "A converter", "A verificar e guardar"; StepIcon removido; i18n `queue.phaseAnalyse/phaseConvert/phaseVerify` em 15 linguas
- P3: React.lazy + Suspense para DashboardPage, LogsPage, ProfilesPage em App.tsx

---

## Estado de compilacao

- `tsc --noEmit`: **OK** (0 erros)
- `cargo check`: **OK** (0 erros — v0.21.0)
- `vitest run`: **OK** (24 testes)
- Validacao JSON i18n: **OK** (15 linguas completas)

---

## Estado das branches

- `dev`: Sessoes 1-4 committed e pushed — em sincronia com remote
- `main`: commit anterior (v0.20.0 area)
- Remote: apenas `main` e `dev`

---

## Proximos passos (v0.22.0 ou seguinte)

| Tarefa                                                              | Prioridade | Plan item |
| ------------------------------------------------------------------- | ---------- | --------- |
| B6: dedup startup_checks — cachear resultado em AppState            | Baixa      | B6        |
| Traducao profissional dos locales nao-pt (fallback em pt por agora) | Media      | -         |
| Screenshots / documentacao visual actualizada                       | Baixa      | -         |
| tauri dev golden path — testar drag-drop end-to-end                 | Alta       | -         |

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
