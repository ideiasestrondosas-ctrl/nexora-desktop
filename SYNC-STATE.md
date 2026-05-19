# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-18
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 6 — v0.23.0 UX Fixes — CONCLUIDO

**5 melhorias UX implementadas:**

1. **Item 1 — "Abrir ficheiro processado" navega in-app**: novo comando Rust `find_asset_by_path` em `assets.rs`; `AssetDetailPage` tenta navegar para o asset de output; fallback para `revealItemInDir` se não estiver na biblioteca.

2. **Item 2 — Job history filtrado por asset**: confirmado que já estava correcto (`list_jobs` já filtrava por `asset_id`). Sem alterações de código necessárias.

3. **Item 3 — Reprocess popup em foreground**: `QueuePage` usa `createPortal` (react-dom) para renderizar o popup em `document.body` com `position: fixed`, escapando o `overflow-hidden` do container da tabela.

4. **Item 4 — Pipeline Summary clicável**: badges de contagem tornados `<button>` que expandem painel inline com lista de ficheiros (nome + perfil + seta de navegação para o asset).

5. **Item 5 — Delete com autorização explícita para ficheiros**: `delete_asset` e `factory_reset` Rust aceitam `delete_files: bool`; frontend apresenta segundo dialog nativo antes de apagar.

**Ficheiros alterados:** `assets.rs`, `system.rs`, `lib.rs`, `App.tsx`, `AssetDetailPage.tsx`, `LibraryPage.tsx`, `SettingsPage.tsx`, `PipelineSummary.tsx`, `QueuePage.tsx`, 15 locales i18n.

**Commits v0.23.0 (10 commits, branch dev):**

- `0a6fc13` feat(i18n): 6 novas chaves para v0.23.0
- `4412bd2` feat(queue): portal para popup de reprocessamento
- `0a8204a` feat(pipeline-summary): painel expansível inline
- `fca036f` feat(settings): factory reset com autorização de ficheiros
- `fea4162` feat(library): delete com autorização de ficheiros
- `949165d` feat(asset-detail): navegação in-app + delete 2 passos
- `e5827b9` feat(app): pass onSelectAsset to AssetDetailPage
- `2d459cb` + `a8cd47e` + `67d5354` Rust commands

**Verificação:** lint ✅ · tsc ✅ · 24/24 testes ✅ · cargo build ✅

---

### Sessao 5 — Correção CI/CD (format:check, cargo clippy, placeholders) — CONCLUIDO

**Problema:** GitHub Actions `ci.yml` e `build.yml` com erros em TODAS as plataformas.

**Diagnóstico:**

- `lint-and-test` (Ubuntu): `format:check` falhava — 63 ficheiros não formatados com Prettier
- `rust-check` (Windows/macOS): `cargo clippy` falhava — `tauri_build::build()` exige binários `externalBin` (FFmpeg/FFprobe) que não existem no CI (estão no `.gitignore`)
- `rust-check` (Linux): `cargo fmt --check` falhava — código Rust nunca formatado com `cargo fmt`
- `rust-check` (macOS/Linux): `libc` não declarado em `Cargo.toml` — código Unix usava `libc::kill()` sem a crate
- `build.yml`: usava `npm install` em vez de `npm ci`; tinha input inválido `includeUpdaterJson`; `bundle.targets: "all"` tentava `.rpm` no Linux sem tooling

**Correcções aplicadas:**

1. `npm run format` + `cargo fmt` — formatados todos os ficheiros (63 Prettier + ~15 Rust)
2. `ci.yml` — adicionado step "Create resource placeholders" no job `rust-check` (cria ficheiros vazios para FFmpeg/FFprobe + sidecar antes do `cargo clippy`)
3. Código Rust — corrigidos 7 erros de Clippy:
   - `drop(state)` removido (`State` não implementa `Drop`)
   - `n % 100 == 0` → `n.is_multiple_of(100)`
   - `.max(1).min(8)` → `.clamp(1, 8)`
   - `#[allow(clippy::type_complexity)]` no tipo `Vec<(...11 tipos...)>`
   - `#[allow(clippy::too_many_arguments)]` na função `run_job` (13 args)
   - `nets.iter().map(|(_, n)| ...)` → `nets.values().map(...)` (2 ocorrências)
4. `Cargo.toml` — adicionada dependência condicional `[target.'cfg(not(target_os = "windows"))'.dependencies] libc = "0.2"`
5. `build.yml` — `npm install` → `npm ci`; removido `includeUpdaterJson: true`
6. `tauri.conf.json` — `bundle.targets: "all"` → `["deb", "appimage", "msi", "nsis", "dmg", "app"]`

**Verificação local:**

- `npm run format:check`: OK
- `npm run lint`: OK
- `cargo fmt --check`: OK
- `cargo clippy -- -D warnings`: OK

**Verificação GitHub Actions (run #92):**

- `lint-and-test` (Ubuntu): ✅ OK
- `rust-check` Windows: ✅ OK
- `rust-check` macOS: ✅ OK
- `rust-check` Linux: ✅ OK
- Todas as plataformas passaram

---

### Sessão 7 — v0.23.0 Sincronização e Documentação — CONCLUÍDO

**Tarefas realizadas:**

1. Bump de versão para 0.23.0 em package.json, Cargo.toml, tauri.conf.json, version.ts
2. Actualização do CHANGELOG.md com entradas v0.22.0 e v0.23.0
3. Actualização do USER_MANUAL.md:
   - Navegação in-app para ficheiros processados
   - Popup de reprocessamento em foreground (portal)
   - Pipeline Summary clicável com painel expansível
   - Delete e factory reset com autorização explícita de ficheiros
4. Actualização do SCREEN_GUIDE.md:
   - Versão, sidebar version badge
   - Pipeline Summary clicável / painel inline
   - Reprocess popup (portal)
   - MediaInfo tabs
   - Two-step delete dialog
   - Two-step factory reset
5. Actualização do FUNCTIONS.md:
   - `find_asset_by_path`, `list_assets_slim`, `scan_directory`
   - Assinaturas corrigidas: `delete_asset` (hard delete + delete_files), `factory_reset` (delete_files)
   - Persistence: `tauri-plugin-store` (não localStorage)
   - Evento `sidecar:event`
6. Actualização do INSTALL.md e RELEASE.md com versão 0.23.0
7. **Screenshots capturados manualmente** — todos os 10 screenshots (6 existentes + 4 novos v0.23.0) capturados em 2026-05-18 a 1280×800, light mode. Índice em `docs/screenshots/README.md`, histórico de captura em `docs/screenshots/PENDING_CAPTURE.md`.
8. Actualização do PROGRESS-DESKTOP.md

**Verificação:** lint ✅ · tsc ✅ · 24/24 testes ✅ · cargo build ✅

---

## Estado das branches

- `dev`: v0.23.0 UX fixes committed (Sessao 6) — NÃO pushed para remote ainda
- `main`: commit anterior (v0.20.0 area)
- Remote: apenas `main` e `dev`

---

### Sessao 8 — v0.23.0 HelpModal Remodelado — CONCLUIDO

**Melhorias no HelpModal.tsx:**

1. **Sidebar vertical remodelada**: w-48 (180px) com items empilhados verticalmente, indicador de activo com borda azul esquerda + fundo azul claro.
2. **Badges numéricos na sidebar**: Tabs com múltiplos cards mostram contagem (Queue=3, Library=2, Settings=2).
3. **Dimensões fixas do modal**: `h-[85vh]` + `min-h-[600px]` para evitar saltos entre tabs.
4. **`openFullGuide` corrigido**: Toast de erro com botão "Copiar URL" via `tauri-plugin-clipboard-manager` (plugin nativo, não navigator.clipboard).
5. **Tips nos 4 novos cards v0.23.0**: Delete Confirm, Pipeline Summary, Reprocess Popup, Factory Reset Confirm — todos com tips informativos descritivos.

**Plugin instalado:**

- `tauri-plugin-clipboard-manager` v2.3.2 (cargo + npm)
- Registado em `lib.rs` (`tauri_plugin_clipboard_manager::init()`)
- Permissão `clipboard-manager:allow-write-text` em `capabilities/default.json`

**Ficheiros alterados:** `HelpModal.tsx`, `lib.rs`, `default.json`, `Cargo.toml`, `Cargo.lock`, `package.json`, `package-lock.json`.

**Verificação:** lint ✅ · tsc ✅ · 24/24 testes ✅ · cargo check ✅

---

## Proximos passos (v0.24.0 ou seguinte)

| Tarefa                                                              | Prioridade | Estado    |
| ------------------------------------------------------------------- | ---------- | --------- |
| Push dev + merge/PR para main (v0.23.0)                             | Alta       | Pronto    |
| B6: dedup startup_checks — cachear resultado em AppState            | Baixa      | Pendente  |
| Traducao profissional dos locales nao-pt (fallback em pt por agora) | Media      | Pendente  |
| Screenshots / documentacao visual actualizada                       | Baixa      | Concluido |
| tauri dev golden path — testar drag-drop end-to-end                 | Alta       | Pendente  |

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
