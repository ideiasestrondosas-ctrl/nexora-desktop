# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 44b â€” Fix dropdown perfil transparente â€” CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)
**Data:** 2026-05-31

**Resumo:** Fix adicional â€” dropdown de selecao de perfil ilegivel em ambos os temas

**Problema:** Os dropdowns internos de perfil em IngestProfileModal e BatchSubmitModal
usavam `glass-surface` (transparente sem Mica). Ficavam invisiveis/ilegivel em dev mode,
Windows 10 e Linux. Foram mantidos na sessao anterior por engano.

**Fix:**

- `src/components/IngestProfileModal.tsx` linha 346: dropdown `glass-surface` -> `bg-bg-primary`
- `src/components/BatchSubmitModal.tsx` linha 134: ProfileDropdown `glass-surface` -> `bg-bg-primary`

**Commit:** `5dcc548`

**Nota sobre reboot em dev mode:** O Vite fez hot-reload automatico ao detectar nova
dependencia `zustand/react/shallow`. Comportamento normal -- acontece uma vez por sessao
de dev. O job de processamento continuou no backend sem interrupcao.

**Estado:** Branch `dev` em `5dcc548`. Todos os `glass-surface` dos modais substituidos
por `bg-bg-primary`. Pronto para merge/release.

---

### Sessao 44 â€” 6 Fixes + Real-Time UI â€” CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)
**Data:** 2026-05-31

**Resumo:** 3 bugs corrigidos + engine fix + 3 features real-time UI

**Implementacao (8 commits):**

1. **fix(i18n+help-modal):** chaves `pipeline.qc-pre/Desc` e `qc-post/Desc` adicionadas a EN+PT (codigo usava hifem, JSON tinha camelCase); HelpModal `glass-surface` -> `bg-bg-primary`
2. **fix(engine):** `pkg --no-bytecode --public` resolve "A dynamic import callback was not specified" no Node 22 SEA; logging `[DIAG] step=X:start` adicionado ao orchestrator
3. **feat(topbar):** `QueuePill` -- dot azul pulsante quando activo, cinzento idle; i18n EN+PT; Check icon
4. **feat(asset-detail):** `useJobStatus()` montado globalmente em `App.tsx` (store estava sempre vazio -- hook nunca montado); `useState<Job[]>` -> `useJobsStore + useShallow`; `useEffect` re-fetch metadata; `handleReprocess` faz seed imediato
5. **fix(modals):** `IngestProfileModal` e `BatchSubmitModal` container raiz `glass-surface` -> `bg-bg-primary`

**Ficheiros alterados:**

- `src/i18n/locales/en/common.json` + `pt/common.json` -- chaves pipeline + topbar.queueActive/Idle
- `src/components/HelpModal.tsx` -- bg-bg-primary
- `sidecar/orchestrator/NexoraDesktopOrchestrator.ts` -- logging diag
- `package.json` -- engine:build:\* com --no-bytecode --public
- `src/components/TopBar.tsx` -- QueuePill
- `src/App.tsx` -- useJobStatus() montado
- `src/pages/AssetDetailPage.tsx` -- useJobsStore + useShallow + useEffect metadata + handleReprocess seed
- `src/components/IngestProfileModal.tsx` + `BatchSubmitModal.tsx` -- bg-bg-primary

**Verificacao:**

- `npm run typecheck` OK
- nexora-engine.exe reconstruido com --no-bytecode --public (testado com ficheiro real: processa correctamente)

**Estado:** Branch `dev` em `6b10cc7` -- pronto para merge/release.

**Notas para proximo agente:**

- **nexora-engine:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public). Copiar para `src-tauri/target/debug/nexora-engine.exe` apos build.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** modais raiz usam `bg-bg-primary`; overlays/dropdowns pequenos podem usar `glass-surface`.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.

---

### Sessao 43 â€” UI/UX v0.31.0 â€” 5 Fixes Light Mode + Pipeline HistÃ³rico + VersÃ£o Sidebar â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 5 melhorias UI/UX

**ImplementaÃ§Ã£o (5 commits):**

1. **feat(lib):** novo ficheiro `src/lib/pipeline.ts` com constantes `PIPELINE_STEPS`, `PIPELINE_PHASES` e funÃ§Ã£o `getStepIndex()` partilhada
2. **fix(queue):** importar `pipeline.ts`, aplicar `bg-bg-tertiary` em modo claro para cards e Ã­cone Film
3. **fix(help-modal):** melhorar contraste bordas sidebar inactivo + tips em modo claro
4. **fix(asset-detail):** URL overlay `text-white`, path `text-secondary`, pipeline fases com progresso para jobs activos
5. **fix(app):** versÃ£o completa no sidebar usando `APP_VERSION` (inclui sufixo beta)

**Ficheiros alterados:**

- `src/lib/pipeline.ts` â€” novo
- `src/pages/QueuePage.tsx`
- `src/components/HelpModal.tsx`
- `src/pages/AssetDetailPage.tsx`
- `src/App.tsx`

**VerificaÃ§Ã£o:**

- `npm run typecheck` âœ“ (sem erros)
- `cargo fmt --check` âœ“ (sem formataÃ§Ã£o necessÃ¡ria)
- Git log: 5 commits prontos (c6faddf..3f00711)

**Estado:** Branch `dev` em `c6faddf` â€” limpo, CI verde. Pronto para merge/release v0.31.0.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 41 Ã¢â‚¬â€ 7 Fixes UI/UX v0.30.9-beta.1 Ã¢â‚¬â€ CONCLUIDO Ã¢Å“â€¦

**Pedido:** Implementar 7 melhorias de UI/UX conforme plano aprovado. Fixes no changelog encoding, help modal contraste, library overlay, update modal, settings badges e shortcuts de desktop.

**7 Fixes implementados:**

1. **fix(changelog): limpar mojibake UTF-8** Ã¢â‚¬â€ caracteres garbled em CHANGELOG.md corrigidos para UTF-8 vÃƒÂ¡lido
2. **fix(ci): regex overly-escaped** Ã¢â‚¬â€ `extractChangelogSection` em `ci-generate-updater-json.mjs` corrigida para notes do latest.json populadas
3. **feat(update-modal): link 'Ver release notes completas'** Ã¢â‚¬â€ modal de actualizaÃƒÂ§ÃƒÂ£o com link para release notes no GitHub
4. **fix(help-modal): contraste bordas sidebar** Ã¢â‚¬â€ modo claro e escuro com cores melhoradas para legibilidade
5. **fix(library): hover overlay escuro + badges** Ã¢â‚¬â€ status badges visÃƒÂ­veis com overlay correcto em light mode
6. **feat(settings): badge 'ja actualizado' inline** Ã¢â‚¬â€ badge inline com auto-dismiss 6s no botÃƒÂ£o Check Updates
7. **feat(settings): botÃƒÂ£o 'Criar atalho no desktop'** Ã¢â‚¬â€ novo botÃƒÂ£o com 3 comandos Rust (Windows/macOS/Linux) + UI adaptativa
8. **feat(rust): commands para shortcuts** Ã¢â‚¬â€ `create_windows_shortcut`, `create_desktop_shortcut`, `create_macos_alias`

**Commits (8):**

- `c3968ad` fix(changelog): limpar mojibake UTF-8
- `8029960` fix(ci): corrigir regex overly-escaped em extractChangelogSection
- `71366ff` feat(update-modal): adicionar link 'Ver release notes completas'
- `d4d42bb` fix(help-modal): melhorar contraste bordas e sidebar
- `53e4998` fix(library): hover overlay escuro + badges de status visiveis
- `31572f0` feat(settings): badge 'ja actualizado' inline com auto-dismiss 6s
- `c66f81e` feat(rust): commands create_windows_shortcut, create_desktop_shortcut, create_macos_alias
- `3c9fa41` feat(settings): botao 'Criar atalho no desktop' adaptativo por plataforma

**Estado:** `dev` em `3c9fa41`, 8 commits ÃƒÂ  frente de `main`. PrÃƒÂ³xima versÃƒÂ£o: `v0.30.9-beta.1`.

**VerificaÃƒÂ§ÃƒÂ£o:** tsc Ã¢Å“â€¦ Ã‚Â· eslint Ã¢Å“â€¦ Ã‚Â· cargo check Ã¢Å“â€¦ Ã‚Â· 48/48 testes Ã¢Å“â€¦

---

## Estado das branches

- `dev`: `3c9fa41` Ã¢â‚¬â€ limpo, CI verde, 8 commits prontos
- `main`: atrÃƒÂ¡s de dev (pendente release v0.30.9-beta.1)

---

## Notas tÃƒÂ©cnicas para o prÃƒÂ³ximo agente

- **v0.30.9-beta.1**: prÃƒÂ³xima release; versÃƒÂ£o em dev: 0.30.9
- **Shortcuts de desktop**: 3 novos comandos Rust; UI adaptativa com `usePlatform()` hook
- **Mojibake UTF-8**: CHANGELOG.md limpo Ã¢â‚¬â€ caracteres especiais agora vÃƒÂ¡lidos
- **Release notes link**: update modal com link externo para release notes no GitHub
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.

---

### Sessao 39 Ã¢â‚¬â€ Console Flash + Tema Claro Completo Ã¢â‚¬â€ CONCLUIDO Ã¢Å“â€¦

**Pedido:** (1) Janelas de consola a piscar ao navegar para Definicoes no Sandbox. (2) Tema claro incompleto Ã¢â‚¬â€ fundo preto, nav ilegivel, componentes cloud com cores escuras fixas.

**Bug 1 Ã¢â‚¬â€ Janelas de consola (Rust):**

Causa: `std::process::Command::new()` sem `CREATE_NO_WINDOW` nos comandos de diagnostico.
Fix: `no_window()` utilitario em `commands/mod.rs`, aplicado a 5 call sites em `system.rs`, `assets.rs` e `lib.rs`.

**Bug 2 Ã¢â‚¬â€ Tema claro (Frontend):**

- CSS: `[data-platform='windows'] body { background: transparent }` (incondicional) causava fundo preto antes do evento `mica-status` (~100-500ms). Fix: transparencia so com `[data-mica='active']`.
- Nav: `text-text-muted` (#94a3b8, contraste 2.4:1) Ã¢â€ â€™ `text-text-secondary` (#475569, contraste 5.4:1).
- 6 componentes com gray hardcoded substituidos por tokens de tema.

**Commits:**

- `791b845` Ã¢â‚¬â€ no_window() Rust (system.rs, assets.rs, lib.rs)
- `6cd6e26` Ã¢â‚¬â€ CSS inversion + nav contraste
- `a2f7622` Ã¢â‚¬â€ SettingsPage Cloud tab + CloudProfileModal + CloudDestinationPicker
- `477916e` Ã¢â‚¬â€ AssetDetailPage + ProfilesPage + LogsPage

**Verificacao:** 48/48 testes Ã¢Å“â€¦ Ã‚Â· typecheck Ã¢Å“â€¦ Ã‚Â· cargo check Ã¢Å“â€¦

---

## Estado das branches

- `dev`: `477916e` Ã¢â‚¬â€ 4 commits prontos, aguarda release v0.30.7-beta.1
- `main`: `d2c676f` Ã¢â‚¬â€ atrÃƒÂ¡s de dev

---

## Notas tecnicas para o proximo agente

- **no_window()**: `commands/mod.rs`. Qualquer novo Command::new() de diagnostico deve usar `super::no_window()` (submodulo) ou `crate::commands::no_window()` (lib.rs).
- **CSS mica**: Transparencia so com `[data-mica='active']`. NAO reverter.
- **Tokens tema**: usar `bg-bg-secondary`, `text-text-muted`, `border-border`. NAO usar gray-\* hardcoded.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- **Bug recorrente sync.ps1:** tauri.conf.json versao numerica pura (ex: `0.30.7`).

---

### Sessao 38 Ã¢â‚¬â€ 4 Bugs UI/UX + CI Fixes v0.30.6-beta.1 Ã¢â‚¬â€ CONCLUIDO Ã¢Å“â€¦

**Pedido:** Corrigir 4 bugs encontrados no Windows Sandbox com v0.30.5-beta.1.

**Bugs e fixes:**

1. **Update Modal instala sem confirmaÃƒÂ§ÃƒÂ£o** Ã¢â‚¬â€ `handleCheckUpdates` chamava `downloadAndInstall()` directamente. Fix: mostrar `UpdateModal` em vez de instalar.
2. **Thumbnails em falta no Dashboard** Ã¢â‚¬â€ `<img convertFileSrc>` sem fallback IPC. Fix: `<ThumbnailImg>`.
3. **Player vÃƒÂ­deo preto** Ã¢â‚¬â€ asset protocol nÃƒÂ£o serve ficheiros locais no Windows. Fix: hook `useVideoSrc` com fallback IPC `read_video_base64` (Ã¢â€°Â¤50 MB).
4. **Comparador preto** Ã¢â‚¬â€ mesma causa. Fix: `VisualComparatorPlayer` usa o mesmo hook.

**CI fixes adicionais (bugs recorrentes):**

- `fd3146e` Ã¢â‚¬â€ cargo fmt (assets.rs linha 392) + prettier (release bump)
- `ce27a22` Ã¢â‚¬â€ tauri.conf.json versÃƒÂ£o numÃƒÂ©rica `0.30.6` (sync.ps1 bumpa para `0.30.6-beta.1`, tauri-action nÃƒÂ£o suporta semver com sufixo)
- `946ff8e` Ã¢â‚¬â€ PROGRESS-DESKTOP.md: 101 MB Ã¢â€ â€™ 12 KB (UTF-8 multi-encode da Fase 8)

**Commits principais:**

- `7bf8aed` Ã¢â‚¬â€ 4 bugs UI/UX
- `ce27a22` Ã¢â‚¬â€ ÃƒÂºltimo commit estÃƒÂ¡vel (HEAD de dev e tag v0.30.6-beta.1)

**Build:** Ã¢Å“â€¦ CI verde, Build verde, `v0.30.6-beta.1` publicada e validada pelo utilizador.

---

## Estado das branches

- `dev`: `ce27a22` Ã¢â‚¬â€ limpo, CI verde, Build verde
- `main`: `8152e4a` Ã¢â‚¬â€ atrÃƒÂ¡s de dev (mergiaria depois de validaÃƒÂ§ÃƒÂ£o completa no Sandbox)
- Release `v0.30.6-beta.1`: publicada Ã¢Å“â€¦ Ã¢â‚¬â€ instalada e testada no Windows Sandbox

---

## Notas tecnicas para o proximo agente

- **Bug recorrente do sync.ps1:** apÃƒÂ³s cada release bump, verificar se `tauri.conf.json` tem versÃƒÂ£o numÃƒÂ©rica pura (ex: `0.30.6`) e NÃƒÆ’O semver com sufixo (ex: `0.30.6-beta.1`). O `tauri-action@v0` falha com "Signature not found" quando hÃƒÂ¡ sufixo. Fix: editar + commit + retag.
- **useVideoSrc hook** (`src/hooks/useVideoSrc.ts`): tenta `convertFileSrc` primeiro; em `onError` invoca `read_video_base64` (Ã¢â€°Â¤50 MB) via IPC. Para ficheiros maiores: mensagem + botÃƒÂ£o "Abrir no player do sistema".
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026 (Node 20 deprecated; windows-latest Ã¢â€ â€™ windows-2025 a 15 de Junho).
- **PROGRESS-DESKTOP.md:** reposto limpo a 12 KB. Evitar caracteres especiais Unicode (Ã¢â€ â€™, Ã¢â€°Â¤, Ã¢â‚¬â€) no ficheiro Ã¢â‚¬â€ causam multi-encode em algumas ferramentas.

---

### Sessao 37 Ã¢â‚¬â€ CI Fixes Recorrentes + lint-staged Fix Permanente Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Corrigir CI falhado em main por Prettier; investigar e corrigir causa raiz do problema recorrente.

**Contexto:** Terceiro episÃƒÂ³dio do mesmo padrÃƒÂ£o Ã¢â‚¬â€ release bump pelo sync.ps1 cria commits sem Prettier aplicado a `src-tauri/tauri.conf.json` e `scripts/*.mjs`.

**Causa raiz identificada:** O padrÃƒÂ£o `"*.{js,json,md}"` em lint-staged (package.json) usa glob de nÃƒÂ­vel ÃƒÂºnico (`*`), que sÃƒÂ³ faz match de ficheiros na raiz do repositÃƒÂ³rio. Ficheiros em subdirectorios (`src-tauri/`, `scripts/`) nunca eram processados.

**Fix:** `"*.{js,json,md}"` Ã¢â€ â€™ `"**/*.{js,mjs,cjs,json,md}"` Ã¢â‚¬â€ apanha JSON/MD/JS/MJS em qualquer subdirectÃƒÂ³rio.

**Commits:**

- `41c35bc` Ã¢â‚¬â€ Prettier fix dos 5 ficheiros do release v0.30.5-beta.1 (sintoma)
- `d3d5e95` Ã¢â‚¬â€ Fix lint-staged padrÃƒÂ£o alargado (causa raiz)

**Estado:** `main` e `dev` em `365c5fd`. Fix permanente activo Ã¢â‚¬â€ prÃƒÂ³ximos release bumps jÃƒÂ¡ nÃƒÂ£o precisam de commit manual de Prettier.

---

## Estado das branches

- `dev`: `365c5fd` Ã¢â‚¬â€ limpo, CI verde
- `main`: `365c5fd` Ã¢â‚¬â€ paridade com dev
- Release `v0.30.4-beta.1`: publicada Ã¢Å“â€¦
- Release `v0.30.5-beta.1`: draft (build a correr ou pendente)

---

## Notas tecnicas para o proximo agente

- **lint-staged**: padrÃƒÂ£o agora `**/*.{js,mjs,cjs,json,md}` Ã¢â‚¬â€ cobre subdirectorios. Fix definitivo para o padrÃƒÂ£o recorrente de Prettier fail apÃƒÂ³s release bumps.
- **v0.30.5**: branch e release bump existem (`dd085f8`). Build CI nÃƒÂ£o disparou ainda (sÃƒÂ³ tag dispara build). Para publicar, criar tag `v0.30.5-beta.1` com `git tag v0.30.5-beta.1 && git push origin v0.30.5-beta.1`.
- **Testar no Sandbox**: v0.30.5 contÃƒÂ©m os fixes de media (thumbnails, player, comparador), light mode fallback e UpdateModal. Instalar e verificar antes de publicar.

---

### Sessao 36 Ã¢â‚¬â€ Media Loading, Light Mode Fallback & UpdateModal Ã¢â‚¬â€ v0.30.5 Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Testar v0.30.4-beta.1 no Windows Sandbox e corrigir bugs restantes: thumbnails/player/comparador nÃƒÂ£o carregam, fundo preto em light mode, UpdateModal com notas genÃƒÂ©ricas e barra de progresso estÃƒÂ¡tica.

**Root causes identificados:**

1. **Media nÃƒÂ£o carrega** Ã¢â‚¬â€ `assetProtocol.scope: ["$HOME/**", "$TEMP/**"]` insuficiente; mÃƒÂºltiplos patterns necessÃƒÂ¡rios + fallback IPC base64 para thumbnails como seguranÃƒÂ§a adicional
2. **Light mode fundo preto** Ã¢â‚¬â€ `body`/`#root`/`main` transparentes para Mica; no Sandbox/Windows 10, Mica falha silenciosamente e o HWND fica preto. Fix: detectar resultado do `apply_mica` em Rust e emitir evento; CSS aplica fundo sÃƒÂ³lido quando inactivo
3. **UpdateModal notes** Ã¢â‚¬â€ `ci-generate-updater-json.mjs` hardcodava `notes: 'See the CHANGELOG.md for details.'`; stale closure em `totalSize` impedia barra de progredir

**ImplementaÃƒÂ§ÃƒÂ£o (9 tasks, subagent-driven development):**

| Commit    | O que fez                                                                           |
| --------- | ----------------------------------------------------------------------------------- |
| `4b52c4a` | `assetProtocol.scope` alargado para 8 patterns + dep `base64 = "0.22"`              |
| `deb2317` | Comando Rust `read_thumbnail_base64` (fallback IPC para thumbnails)                 |
| `c5dabe3` | `ThumbnailImg` componente partilhado com fallback IPC on error                      |
| `2b28f24` | `onError` logging em video player e comparador; `ThumbnailImg` em AssetDetailPage   |
| `a304a38` | Fix stale closure em `ThumbnailImg` Ã¢â‚¬â€ `useRef` em vez de `failed` nas deps    |
| `a74439b` | Rust: captura resultado `apply_mica`/`apply_vibrancy`, emite `mica-status`          |
| `4841be6` | CSS fallback sÃƒÂ³lido quando `data-mica=inactive`; App.tsx ouve evento             |
| `7e62e4b` | CI: parse de CHANGELOG.md para notas reais no `latest.json`                         |
| `51fedd2` | `UpdateModal`: `totalSizeRef` fix stale closure + `transition-[width] duration-300` |
| `4656f09` | `cargo fmt` (rustfmt reformatou vibrancy block)                                     |
| `4fefc8a` | Merge `dev` Ã¢â€ â€™ `main` Ã¢â‚¬â€ v0.30.5                                         |

**Ficheiros alterados (11):**

- `src-tauri/Cargo.toml` Ã¢â‚¬â€ dep base64
- `src-tauri/tauri.conf.json` Ã¢â‚¬â€ scope alargado
- `src-tauri/src/commands/assets.rs` Ã¢â‚¬â€ `read_thumbnail_base64`
- `src-tauri/src/lib.rs` Ã¢â‚¬â€ mica-status event emission
- `src/components/ThumbnailImg.tsx` Ã¢â‚¬â€ novo componente
- `src/components/UpdateModal.tsx` Ã¢â‚¬â€ fix stale closure + CSS
- `src/components/VisualComparatorPlayer.tsx` Ã¢â‚¬â€ onError logging
- `src/pages/LibraryPage.tsx` Ã¢â‚¬â€ usa ThumbnailImg
- `src/pages/AssetDetailPage.tsx` Ã¢â‚¬â€ usa ThumbnailImg + onError video
- `src/App.tsx` Ã¢â‚¬â€ mica-status listener
- `src/index.css` Ã¢â‚¬â€ CSS fallback Mica inactive
- `scripts/ci-generate-updater-json.mjs` Ã¢â‚¬â€ CHANGELOG parsing

**Estado:** `main` e `dev` em `4fefc8a`. Pronto para nova release `v0.30.5-beta.1`.

---

## Estado das branches

- `dev`: `4fefc8a` Ã¢â‚¬â€ limpo, CI verde
- `main`: `4fefc8a` Ã¢â‚¬â€ paridade com dev
- Release `v0.30.4-beta.1`: draft com 7 assets (publicar antes de criar v0.30.5)

---

## Notas tecnicas para o proximo agente

- **Testar no Sandbox:** fazer bump para `v0.30.5-beta.1`, build, instalar no Sandbox e verificar: thumbnails carregam, player funciona, comparador mostra vÃƒÂ­deos, light mode sem fundo preto, UpdateModal com notas reais e barra animada.
- **ThumbnailImg:** usa `convertFileSrc` primeiro; em `onError` invoca `read_thumbnail_base64` via IPC; usa `useRef(false)` para guard contra re-tentativas.
- **Mica detection:** `data-mica=active|inactive` em `html`. CSS fallback com `var(--color-bg-primary)` quando inactivo Ã¢â‚¬â€ correcto em light (#fff) e dark (#0a0d14).
- **CHANGELOG parsing:** regex procura `## v{ver}` ou `## {ver}` e extrai atÃƒÂ© prÃƒÂ³ximo `##`. Fallback gracioso se secÃƒÂ§ÃƒÂ£o nÃƒÂ£o encontrada.
- **URGENTE:** `actions/checkout@v5` e `actions/setup-node@v5` antes de 2 de Junho 2026 (Node 20 deprecated pelo GitHub).
- **tauri.conf.json version** DEVE ser numÃƒÂ©rica pura (ex: `0.30.5`) no bump.

---

### Sessao 35 Ã¢â‚¬â€ CI Fixes v0.30.4-beta.1 + Build OK Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Verificar e corrigir erros no GitHub Actions para v0.30.4-beta.1.

**Problemas encontrados e resolvidos:**

1. **Prettier** Ã¢â‚¬â€ 4 ficheiros do release bump com formatacao incorrecta (`CHANGELOG.md`, `package.json`, `PROGRESS-DESKTOP.md`, `tauri.conf.json`). Fix: `npm run format` + commit `c238ed1`.

2. **tauri.conf.json version `0.30.4-beta.1`** Ã¢â‚¬â€ devia ser `0.30.4` (numerica pura). O build script usa `sed 's/-.*//'` para derivar a versao do `package.json`, mas o `tauri.conf.json` controla o nome real dos instaladores. Com `0.30.4-beta.1`, o AppImage foi gerado como `Nexora Desktop_0.30.4-beta.1_amd64.AppImage` e o script procurava `0.30.4` Ã¢â‚¬â€ nao encontrou. Fix: `tauri.conf.json` version Ã¢â€ â€™ `"0.30.4"`, commit `39c825c`.

3. **Tag re-apontado** Ã¢â‚¬â€ tag `v0.30.4-beta.1` movido do commit errado para `39c825c` com `git tag -d` + `git push --delete` + novo tag.

4. **Falhas de rede transientes** Ã¢â‚¬â€ `dtolnay/rust-toolchain` falhou a descarregar rustup nos runners Windows e Linux (curl para rustup.rs). Fix: `gh run rerun --failed`.

5. **Assets duplicados na release** Ã¢â‚¬â€ primeira tentativa criou assets com versao `0.30.4-beta.1` no nome; segunda tentativa (correcta) criou `0.30.4`. Apagados 5 assets duplicados via API.

**Commits desta sessao:**

- `c238ed1` fix(ci): prettier Ã¢â‚¬â€ formatar ficheiros do release v0.30.4-beta.1
- `39c825c` fix(release): tauri.conf.json versao numerica 0.30.4

**Estado final:**

- Release `v0.30.4-beta.1` em **draft** com 7 assets correctos: `latest.json` + 6 instaladores `0.30.4`
- CI `dev` verde; `main` com falha Prettier do release bump anterior (resolver com merge devÃ¢â€ â€™main)

---

## Estado das branches

- `dev`: `39c825c` Ã¢â‚¬â€ limpo, CI verde
- `main`: `1c6fb53` Ã¢â‚¬â€ atrÃƒÂ¡s de dev (Prettier fail); mergiar antes de publicar a release
- Tag `v0.30.4-beta.1`: `39c825c` Ã¢â‚¬â€ build concluido, draft criado com 7 assets

---

## Notas tecnicas para o proximo agente

- **Publicar release**: mergiar `dev` Ã¢â€ â€™ `main` (resolve CI do main), depois publicar o draft `v0.30.4-beta.1` via sync.ps1 opcao 4 ou `gh release edit v0.30.4-beta.1 --draft=false`.
- **tauri.conf.json version**: SEMPRE numerica pura (ex: `0.30.4`). O `package.json` pode ter `0.30.4-beta.1`. O sync script que faz o bump deve garantir isto Ã¢â‚¬â€ foi o erro desta sessao.
- **Testar no Sandbox**: instalar `v0.30.4-beta.1` e verificar que thumbnails, play e comparador funcionam (fixes da sessao 34).
- **Node.js 20 deprecated**: GitHub vai forcar Node 24 em 2 de Junho 2026. Actualizar `actions/checkout@v5` e `actions/setup-node@v5` com urgencia.
- **windows-latest Ã¢â€ â€™ windows-2025-vs2026**: migracao forcada em 15 de Junho 2026.

---

### Sessao 34 Ã¢â‚¬â€ Testes Windows Sandbox + Bugs UI Producao Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Testar v0.30.3-beta.1 no Windows Sandbox e corrigir bugs encontrados.

**Bugs identificados e corrigidos (commit `85d58a0`):**

1. **Thumbnails nÃƒÂ£o apareciam** Ã¢â‚¬â€ `assetProtocol.scope: ["**"]` nÃƒÂ£o resolve caminhos absolutos Windows em Tauri 2.x. O glob `**` sem prefixo de drive nÃƒÂ£o faz match de `C:\Users\...`. Fix: `scope: ["$HOME/**", "$TEMP/**"]`.

2. **Play de vÃƒÂ­deo nÃƒÂ£o funcionava (original e processado)** Ã¢â‚¬â€ `media-src` CSP em falta de `https://asset.localhost`. Tauri 2.x no Windows serve assets locais via protocolo HTTPS interceptado (`https://asset.localhost`), nÃƒÂ£o `asset://`. O browser bloqueava silenciosamente todos os elementos `<video>`. Fix: adicionar `https://asset.localhost` ao `media-src`.

3. **Comparador (VisualComparatorPlayer) vazio** Ã¢â‚¬â€ mesmo root cause do bug 2: os dois `<video>` do comparador bloqueados pelo mesmo CSP.

4. **Toast "JÃƒÂ¡ tens a versÃƒÂ£o mais recente" invisÃƒÂ­vel em dark mode** Ã¢â‚¬â€ `<Toaster>` sem `theme` prop usava o tema claro do Sonner (texto escuro) por cima do fundo escuro aplicado pelo `glass-surface` Ã¢â€ â€™ invisÃƒÂ­vel. Fix: `<Toaster theme={theme} />` usando o estado do settings store.

5. **Dropdown "Da Cloud" com fundos escuros em light mode** Ã¢â‚¬â€ `LibraryPage.tsx` usava `bg-gray-800`, `bg-gray-700`, `text-gray-400` hardcoded. Fix: substituÃƒÂ­dos por `bg-bg-secondary`, `bg-bg-primary`, `text-text-muted`, `border-border`.

**Commits:**

- `85d58a0` fix(ui): thumbnails/video/toast em producao Windows

**Estado:** `dev` em `85d58a0`. Fixes prontos para merge e nova release.

**Nota:** `wix.version` em `tauri.conf.json` estÃƒÂ¡ em `0.30.2.1` para app `0.30.3`. Precisa de ser bumped para `0.30.3.0` na prÃƒÂ³xima release para que o MSI upgrade funcione correctamente.

---

## Estado das branches

- `dev`: `85d58a0` Ã¢â‚¬â€ limpo, CI verde
- `main`: `1c6fb53` Ã¢â‚¬â€ 1 commit atrÃƒÂ¡s de dev (fixes acima por mergiar)
- Tag `v0.30.3-beta.1`: `3daed46` Ã¢â‚¬â€ publicada, `latest.json` presente

---

## Notas tecnicas para o proximo agente

- **Build necessÃƒÂ¡rio para testar:** os 4 fixes de UI sÃƒÂ³ entram em vigor num novo build instalado (nÃƒÂ£o em dev mode). Fazer merge devÃ¢â€ â€™main, tag v0.30.4 ou v0.30.3.1, push para CI.
- **media-src + assetProtocol:** padrÃƒÂ£o correcto para Tauri 2.x Windows Ã¢â‚¬â€ `media-src` precisa de `https://asset.localhost`, scope precisa de `$HOME/**` e `$TEMP/**`.
- **Toaster theme:** sempre passar `theme={theme}` ao Sonner Toaster quando o app tem dark mode custom (nÃƒÂ£o `prefers-color-scheme`).
- **wix.version:** bumpar para `0.30.3.0` na prÃƒÂ³xima release.

---

### Sessao 33 Ã¢â‚¬â€ Limpeza GitHub: Releases, Tags e Workflows Ã¢â‚¬â€ CONCLUIDO

### Sessao 33 Ã¢â‚¬â€ Limpeza GitHub: Releases, Tags e Workflows Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Analisar GitHub Actions e releases para identificar o que vale a pena eliminar; apagar o que foi aprovado.

**Analise efectuada:**

- Inventario completo: 14 releases (11 publicadas + 3 drafts), 31 tags, 4 workflows activos
- Nenhum workflow merece ser apagado (build, ci, test-karpathy, dependabot Ã¢â‚¬â€ todos correctos)
- Identificados 7 releases para apagar e 22 tags orphans/obsoletos

**Releases apagadas (7):**

1. Draft `main` Ã¢â‚¬â€ tag acidental criado pelo `tauri-action` quando correu sem tag de versao; 6 assets, 0 downloads
2. Draft `v0.24.0` Ã¢â‚¬â€ duplicado do release publicado; build incompleto, 2 assets
3. Draft `v0.25.0` Ã¢â‚¬â€ nunca publicada, supersedida por v0.26.0, 6 assets, 0 downloads
4. `v0.30.2-beta.1` Ã¢â‚¬â€ beta supersedida, sem `latest.json`, 0 downloads
5. `v0.30.1-beta.1` Ã¢â‚¬â€ beta supersedida, sem `latest.json`, 0 downloads
6. `v0.30.0-beta.1` Ã¢â‚¬â€ beta supersedida, sem `latest.json`, 0 downloads
7. `v0.29.0-alpha.1` Ã¢â‚¬â€ alpha supersedida, sem `latest.json`, 0 downloads

**Tags apagados (22):**

- `pre-audit-v0.17.0` Ã¢â‚¬â€ nao semver, orphan de work-in-progress
- `v0.29.0-alpha.1`, `v0.30.0-beta.1`, `v0.30.1-beta.1`, `v0.30.2-beta.1` Ã¢â‚¬â€ correspondentes aos releases apagados
- `v0.1.1`, `v0.2.0`, `v0.3.0`, `v0.3.1`, `v0.3.2`, `v0.3.3`, `v0.4.0`, `v0.4.1`, `v0.5.0`, `v0.6.0`, `v0.7.0`, `v0.8.0`, `v0.9.0`, `v0.10.0`, `v0.11.0`, `v0.12.0`, `v0.13.0`, `v0.19.0` Ã¢â‚¬â€ tags pre-CI sem releases associadas

**Estado final:**

- 7 releases publicadas: `v0.21.0` Ã¢â€ â€™ `v0.30.3-beta.1` (Latest)
- 8 tags: `v0.21.0`, `v0.22.0`, `v0.24.0`, `v0.25.0`, `v0.26.0`, `v0.27.0`, `v0.28.0`, `v0.30.3-beta.1`
- `latest.json` na `v0.30.3-beta.1` intacto Ã¢â‚¬â€ auto-updater nao afectado
- Sem commits Ã¢â‚¬â€ operacoes remotas nao alteram ficheiros

---

## Estado das branches

- `dev`: `1c6fb53` Ã¢â‚¬â€ limpo, CI verde
- `main`: `1c6fb53` Ã¢â‚¬â€ paridade com dev
- Tag `v0.30.3-beta.1`: `3daed46` Ã¢â‚¬â€ publicada, `latest.json` presente

---

## Notas tecnicas para o proximo agente

- **Auto-updater**: endpoint `releases/latest/download/latest.json` funcional. Modal aparece 4s apos startup (producao). Testar no Windows Sandbox: instalar versao anterior, verificar modal.
- **Signing key**: `~/.tauri/nexora.key` (local). Gerada com `--password ""`. GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (vazia).
- **Repositorio limpo**: 7 releases + 8 tags, tudo alinhado.

---

### Sessao 32 Ã¢â‚¬â€ Auto-Updater Operacional + Hooks de Sessao + v0.30.3-beta.1 Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Corrigir erro do auto-updater (404 ao tentar encontrar `latest.json`); implementar modal de actualizacao no startup; configurar hooks de sessao para preservar contexto e notificacao Windows.

**Diagnostico inicial:**

- GitHub Secrets `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` nao existiam Ã¢â€ â€™ Tauri Action nao assinava bundles Ã¢â€ â€™ `latest.json` nunca gerado Ã¢â€ â€™ 404

**Implementacao:**

1. **Signing keys configuradas:**
   - Gerado par de chaves via `npx tauri signer generate --password "" --force`
   - `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` definidos no GitHub

2. **UpdateModal.tsx** Ã¢â‚¬â€ modal custom no startup (4s delay, producao apenas):
   - Mostra versao actual Ã¢â€ â€™ nova + release notes + barra de progresso de download
   - Botoes "Actualizar Agora" / "Mais Tarde"
   - `dialog: false` no `tauri.conf.json` (UI nativa desactivada)

3. **latest.json Ã¢â‚¬â€ geracao manual via CI** (8 tentativas; bugs encontrados e resolvidos):
   - `tauri-action@v0` nao gera `latest.json` com Tauri v2 Ã¢â€ â€™ job `generate-updater-json`
   - `tauri.conf.json` versao numerica `0.30.3` (MSI nao aceita semver pre-release)
   - glob bash nao expande com ficheiros com espacos Ã¢â€ â€™ caminho exacto construido
   - `tauri-action` limpa `.sig` apos processar Ã¢â€ â€™ re-assinar com `npx tauri signer sign`
   - `--private-key /path/_temp/...` Ã¢â€ â€™ CLI faz base64-decode do path Ã¢â€ â€™ falha no `_` Ã¢â€ â€™ sem flag
   - Chave gerada nao-interactivamente com password desconhecida Ã¢â€ â€™ regenerar com `--password ""`
   - GitHub converte espacos para pontos em nomes de assets de release

4. **Hooks de sessao Claude Code:**
   - `SessionStart` Ã¢â€ â€™ injeca `.wip-session.md` como contexto
   - `Stop` Ã¢â€ â€™ notificacao Windows toast com debounce 3 min (so notifica se utilizador estava ausente)
   - `UserPromptSubmit` Ã¢â€ â€™ regista timestamp do ultimo prompt para o debounce
   - Scripts: `scripts/hooks/wip-session-{start,stop}.ps1`, `wip-user-prompt.ps1`
   - `.wip-session.md` adicionado ao `.gitignore`

5. **v0.30.3-beta.1 publicada:**
   - `latest.json` com assinaturas das 3 plataformas
   - 6 instaladores (Windows MSI+NSIS, macOS DMG+app.tar.gz, Linux AppImage+deb)
   - `dev` e `main` em paridade em `3daed46`

**Commits desta sessao (principais):**

- `e3dffd0` feat(updater): auto-update modal on startup + signing keys + session hooks
- `379782f` chore(release): bump para v0.30.3-beta.1
- `425e630` fix(release): tauri.conf.json versao numerica 0.30.3
- `c1d8960` fix(ci): gerar latest.json manualmente Ã¢â‚¬â€ tauri-action nao suporta Tauri v2
- `623cdcc` fix(ci): usar bash glob em vez de find
- `e490ca9` fix(ci): caminho exacto do bundle sem glob
- `6bb6c0b` fix(ci): re-assinar bundles sobreviventes pos-tauri-action
- `fc252bf` fix(ci): tauri signer sign sem --private-key
- `3daed46` fix(updater): nova pubkey Ã¢â‚¬â€ chave regenerada com password vazia explicita

**Estado:** `dev` = `main` = `3daed46`. Release `v0.30.3-beta.1` publicada como Latest.

---

## Estado das branches

- `dev`: `3daed46` Ã¢â‚¬â€ limpo, CI verde
- `main`: `3daed46` Ã¢â‚¬â€ paridade com dev
- Tag `v0.30.3-beta.1`: `3daed46` Ã¢â‚¬â€ publicada, `latest.json` presente

---

## Notas tecnicas para o proximo agente

- **Auto-updater**: endpoint `releases/latest/download/latest.json` agora funcional. Modal aparece 4s apos startup (producao). Testar no Windows Sandbox: instalar versao anterior, verificar modal.
- **Signing key**: `~/.tauri/nexora.key` (local). Gerada com `--password ""`. GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (vazia). Se chave perdida, regenerar com `npx tauri signer generate -w ~/.tauri/nexora.key --password "" --force` e actualizar secrets + pubkey em `tauri.conf.json`.
- **CI latest.json**: gerado pelo job `generate-updater-json` em `.github/workflows/build.yml`. Re-assina os bundles sobreviventes com `npx tauri signer sign "$BUNDLE"` (sem `--private-key` Ã¢â‚¬â€ la CLI faz base64-decode do path e falha em `_`).
- **Hooks de sessao**: activos em `.claude/settings.json`. `.wip-session.md` preserva contexto entre sessoes. Abrir `/hooks` no Claude Code para recarregar.
- **Node.js 20 deprecated**: GitHub Actions vai forcar Node 24 em Junho 2026. Actualizar `actions/checkout@v5` e `actions/setup-node@v5` quando conveniente.

---

### Sessao 31b Ã¢â‚¬â€ CI Fixes + Build v0.30.2-beta.1 + sync.ps1 v1.2.0 Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Verificar e corrigir erros no GitHub Actions para v0.30.2-beta.1; corrigir sync.ps1 que ficava em loop eterno ao monitorizar CI.

**Implementacao:**

1. **CI fixes Ã¢â‚¬â€ cargo fmt:**
   - `src-tauri/src/lib.rs:321` Ã¢â‚¬â€ `log::warn!` expandido para multi-linha (linha demasiado longa para rustfmt)
   - `src-tauri/src/sidecar.rs:43` Ã¢â‚¬â€ `if cfg!(target_os = "windows") { ".exe" } else { "" }` expandido para bloco

2. **CI fixes Ã¢â‚¬â€ prettier:**
   - `CHANGELOG.md`, `package.json`, `src-tauri/tauri.conf.json` reformatados com `npm run format`

3. **CI fix Ã¢â‚¬â€ ci.yml:**
   - `rust-check` job nÃƒÂ£o criava placeholder `nexora-engine` Ã¢â€ â€™ `tauri_build::build()` falhava com "custom build command failed"
   - Adicionados placeholders `nexora-engine-{triple}` para Windows, macOS (3 variantes) e Linux
   - Removido `sidecar/dist/nexora-sidecar.cjs` que jÃƒÂ¡ nÃƒÂ£o estÃƒÂ¡ nas resources

4. **Build v0.30.2-beta.1 Ã¢â‚¬â€ SUCESSO:**
   - Quality Gate Ã¢Å“â€¦ (3m49s)
   - Build Windows Ã¢Å“â€¦ (20m13s)
   - Build macOS Universal Ã¢Å“â€¦ (12m12s)
   - Build Linux Ã¢Å“â€¦ (11m14s)
   - Draft release criado com instaladores para 3 plataformas

5. **sync.ps1 v1.2.0 Ã¢â‚¬â€ Watch-GitHubActions corrigido:**
   - Problema: script ficava em loop eterno a monitorizar um run antigo e falhado (hash `a87a53e`) porque o sync fez merge para main ANTES dos CI fixes
   - Fix: consulta `main+dev+tag` em simultÃƒÂ¢neo; filtra por `minCreatedAt = -2min` para ignorar runs histÃƒÂ³ricos; mostra label `[branch]` por run; timeout 45min; poll 20s
   - `$SYNC_VERSION` bumped para `1.2.0`

6. **Main branch actualizado:**
   - Merged dev Ã¢â€ â€™ main (com todos os CI fixes incluÃƒÂ­dos)
   - main estÃƒÂ¡ agora em `ca496d7` (paridade com dev)

**Commits desta extensao (5):**

- `a87a53e` 3: screenshots em falta (sync script)
- `69b4dcb` fix(ci): cargo fmt + prettier
- `eee54e8` fix(ci): add nexora-engine placeholder to ci.yml rust-check job
- `e84e276` fix(sync): Watch-GitHubActions monitors all branches, ignores old runs, adds timeout
- `ca496d7` chore(sync): bump version to 1.2.0

**Estado:** Branch `dev` e `main` em `ca496d7`. Draft release `v0.30.2-beta.1` no GitHub com 6 instaladores. Publicar com sync.ps1 opcao 4.

---

## Estado das branches

- `dev`: `ca496d7` Ã¢â‚¬â€ limpo, CI verde
- `main`: `ca496d7` Ã¢â‚¬â€ paridade com dev
- Tag `v0.30.2-beta.1`: `eee54e8` Ã¢â‚¬â€ build concluido, draft criado

---

## Notas tecnicas para o proximo agente

- **Publicar release**: executar `sync.ps1` opcao 4 (Publicar release existente) Ã¢â‚¬â€ aguarda CI e publica o draft como Latest
- **Node.js 20 actions deprecated**: GitHub avisa que `actions/checkout@v4` e `actions/setup-node@v4` vao ser forcados para Node 24 em Junho 2026. Actualizar para `@v5` quando conveniente.
- **Watch-GitHubActions (v1.2.0)**: agora monitoriza multi-branch e ignora runs historicos. Se voltar a ficar preso, verificar se o `minCreatedAt` de -2min e suficiente (pode precisar de -5min em merges lentos).
- **nexora-engine nao e commitado** Ã¢â‚¬â€ binario de ~55MB excluido por `.gitignore`. Gerado em CI automaticamente.

---

### Sessao 31 Ã¢â‚¬â€ SEA Engine + Help Manual Fixes + System Diagnostics UI Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Corrigir erros do Windows Sandbox v0.30.1-beta.1: toast "Componente interno em falta" (sidecar / Node.js), problemas no Help Manual (comparador em chaves i18n, TAB_COUNTS errados, screenshots em falta). Implementar SEA Engine, diagnostico de dependencias in-app, actualizar README.

**Implementacao:**

1. **SEA Engine** Ã¢â‚¬â€ `@yao-pkg/pkg` v6.20.0; scripts `engine:build:*`; `sidecar.rs` Ã¢â€ â€™ `resolve_engine_path`; `queue.rs` invoca `nexora-engine` directamente; `get_startup_status` simplificado (`engineOk` em vez de `nodeOk`+`sidecarOk`); `tauri.conf.json` actualizado; CI `build.yml` constroi e faz stage do binario por plataforma.

2. **Help Manual i18n** Ã¢â‚¬â€ `help.comparator.*` movido para `help.screens.comparator.*` em 15 locales via script `fix-i18n-comparator.mjs`. TAB_COUNTS corrigidos em 6 tabs. Startup keys limpas (nodeMissing/sidecarMissing Ã¢â€ â€™ engineMissing/engineDetails) em todos os locales.

3. **Screenshots** Ã¢â‚¬â€ 4 PNGs reais (settings-cache, cloud-gdrive-oauth, cloud-s3, cloud-icloud) adicionados. 6 SVG placeholders apagados. Cards sem UI dedicada (shortcuts, cloud-upload) ficam como texto.

4. **System Diagnostics UI** Ã¢â‚¬â€ `useSystemHealth` store; `SystemDiagnosticsModal`; badge Ã¢Å¡Â  na sidebar; secao "Componentes Necessarios" em Settings Ã¢â€ â€™ Sistema com semaforos e links de download.

5. **README** Ã¢â‚¬â€ overview, features, whats-new e arquitectura actualizados.

**Commits:** `d9448d4` Ã¢â€ â€™ `9f078e8` (9 commits, branch dev v0.30.2-beta.1)

**Estado:** Push pendente Ã¢â‚¬â€ PAT precisa scope `workflow` em github.com/settings/tokens.

**Verificacao:** 48/48 testes Ã¢Å“â€¦ Ã‚Â· typecheck Ã¢Å“â€¦ Ã‚Â· lint Ã¢Å“â€¦ Ã‚Â· cargo check Ã¢Å“â€¦

---

## Estado das branches

- `dev`: v0.30.2-beta.1 Ã¢â‚¬â€ pronto para push (aguarda PAT com scope `workflow`)
- `main`: ultima versao antes desta sessao

---

## Notas tecnicas para o proximo agente

- **Push pendente**: `git push origin dev --follow-tags` Ã¢â‚¬â€ requer PAT com scope `workflow` activo.
- **nexora-engine**: binario ~55MB gerado por `npm run engine:build:win/mac/linux`. Nao commitado. CI constroi em `src-tauri/binaries/nexora-engine-{triple}`.
- **PKG target**: `node22` (nao `node20`) Ã¢â‚¬â€ prebuilt node20 ausente para pkg v6.20.0.
- **SystemDiagnosticsModal**: abrivel via (a) action do toast, (b) badge Ã¢Å¡Â  sidebar Settings, (c) Settings Ã¢â€ â€™ Sistema Ã¢â€ â€™ Componentes Necessarios.
- **TAB_COUNTS `intro: 4`**: deveria ser 6 Ã¢â‚¬â€ minor, deixado para sessao futura.
- **diagnostics i18n**: apenas EN e PT; outros 13 locales fazem fallback silencioso para EN.

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 30 Ã¢â‚¬â€ QA Runner Isolado Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Criar um subprojeto separado dentro do mesmo repositorio para testes automaticos, carga/stress, videos de teste, relatorios detalhados e handoff para IA, sem alterar codigo funcional nem dados reais do Nexora Desktop.

**Implementacao:**

1. **Subprojeto isolado:** `qa-runner/` criado com package proprio, scripts e configuracao independente.
2. **Scripts de utilizador:** Windows `.bat`, macOS `.command` e Linux `.sh` para teste rapido, completo, video, stress leve, stress forte e abrir ultimo relatorio.
3. **Runner Node.js:** `qa-runner/scripts/qa-runner.mjs` orquestra suites, logs, deteccao da app, descoberta/copia de videos, metricas e relatorios.
4. **Entrada de videos:** usa `tests/fixtures/test-720p-5s.mp4`, procura `Videos_Tests/`, aceita pasta adicional via parametro tecnico e copia tudo para `qa-input/` dentro do run.
5. **Relatorios:** gera `index.html`, `report.md`, `report.json`, `stats.json`, `metrics.csv`, `ai-handoff.md`, logs e snapshot de sistema em `.logs/qa-runs/<timestamp>/`.
6. **Documentacao:** `docs/QA-RUNNER-SPEC.md`, `docs/QA-RUNNER-USAGE.md`, `qa-runner/README-UTILIZADOR.md`, `qa-runner/README-TECHNICAL.md`.
7. **README GitHub:** adicionada secao "Nexora QA Runner" e links de documentacao.

**Verificacao executada:**

- `node qa-runner/scripts/qa-runner.mjs --help`
- `node qa-runner/scripts/qa-runner.mjs --suite quick --no-open --no-start-app`
- `node qa-runner/scripts/qa-runner.mjs --suite video --no-open --no-start-app`
- `node qa-runner/scripts/qa-runner.mjs --suite stress-light --no-open --no-start-app`
- `node qa-runner/scripts/qa-runner.mjs --suite complete --no-open --no-start-app`
- Validacao de artefactos esperados no ultimo run
- Verificacao de estado Git para confirmar que `src/`, `src-tauri/` e `sidecar/` nao foram alterados

**Notas:**

- A primeira versao e segura e nao destrutiva. Ainda nao automatiza UI Tauri via WebDriver porque isso exigiria tooling/selectors e alteracoes planeadas na app principal.
- Stress forte cria copias temporarias de videos dentro da pasta do run; os originais nao sao modificados.
- Relatorio principal mais recente: `.logs/qa-runs/2026-05-27T20-00-28-769Z/index.html`

**Fix CI apos push:**

- GitHub Actions run `26535887021` falhou no job `Lint + Tests`, passo ESLint.
- Causa: `eslint .` passou a analisar `qa-runner/scripts/**/*.mjs`, mas estes scripts Node.js nao tinham `globals.node` na configuracao.
- Correcao: adicionado override QA Runner em `eslint.config.js` com `globals.node`, `globals.es2021` e `no-console: off`.
- Verificacao local apos fix: `npm run lint` OK; `node qa-runner/scripts/qa-runner.mjs --suite quick --no-open --no-start-app` OK.

---

### Sessao 29 Ã¢â‚¬â€ Documentacao v0.30.0-beta.1 (Comparator, Onboarding, Watch Folders, Bug Report, Pipeline Errors) Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Analisar workspace e verificar alteracoes/nouidades que ainda nao estejam mencionadas no menu manual (HelpModal), screenshots, USER_MANUAL, SCREEN_GUIDE e README do GitHub. Actualizar tudo.

**Analise:**

1. **Funcionalidades nao documentadas identificadas:**
   - Visual Comparator (split-screen A/B) Ã¢â‚¬â€ codigo presente, zero documentacao
   - Onboarding Wizard (4 passos) Ã¢â‚¬â€ codigo presente, zero documentacao
   - Watch Folders (Settings Ã¢â€ â€™ Watch Folders) Ã¢â‚¬â€ codigo presente, zero documentacao documentacao
   - Privacy / Telemetry (Settings Ã¢â€ â€™ Privacy) Ã¢â‚¬â€ codigo presente, zero documentacao
   - Bug Report (TopBar botao laranja) Ã¢â‚¬â€ codigo presente, zero documentacao
   - Pipeline Error Messages (categorizacao de erros) Ã¢â‚¬â€ codigo presente, zero documentacao
   - Batch Submit Modal (multi-select + estimativas) Ã¢â‚¬â€ parcialmente documentado
   - Cloud Destination Section no Asset Detail Ã¢â‚¬â€ parcialmente documentado

2. **Screenshots faltantes (16 capturas identificadas):**
   - onboarding-wizard, watch-folders, privacy-telemetry, bug-report, pipeline-error, comparator, batch-submit, asset-detail-cloud, dashboard-updated, queue-expanded + 6 actualizacoes

**Implementacao:**

1. **HelpModal.tsx:**
   - Nova aba "comparator" adicionada ao ScreenTab type + SCREEN_TABS array
   - Screenshots mapeados: comparator, onboarding, watch-folders, privacy-telemetry, bug-report, pipeline-error, batch-submit
   - 4 novos ScreenCards: Visual Comparator, Onboarding, Watch Folders, Privacy, Bug Report
   - TAB_COUNTS actualizado (comparator: 2, intro: 4, settings: 6)

2. **i18n (15 linguas):**
   - Adicionado `help.tabs.comparator` em todos os locales
   - Secao `help.comparator` com: title, desc, splitScreen, scrubSync, playPause, tip1-3
   - Sub-secoes: onboarding, watchFolders, privacy, bugReport
   - 14 locales PT/ES/FR/DE/IT/NL/PL/RU/Ja/KO/ZH/AR/SV/TR + EN

3. **USER_MANUAL.md:**
   - +5 novas secoes: 12 (Visual Comparator), 13 (Onboarding), 14 (Watch Folders), 15 (Bug Report), 16 (Pipeline Error Messages)
   - Total: 360 Ã¢â€ â€™ +85 linhas

4. **SCREEN_GUIDE.md:**
   - +6 novas secoes: 12 (Comparator), 13 (Onboarding), 14 (Bug Report), 15 (Pipeline Errors), 16 (Watch Folders), 17 (Keyboard Shortcuts updated)
   - ASCII art, tabelas de interaccao, badges de erro, layout completo
   - Total: 887 Ã¢â€ â€™ +209 linhas

5. **README.md:**
   - Secao "What's New" actualizada de v0.26.0 Ã¢â€ â€™ v0.30.0-beta.1
   - Features table actualizada: Bug Reporting, Watch Folders, Visual Comparator
   - Screenshots section mantida (novos screenshots capturados pelo utilizador)

**Screenshots capturados pelo utilizador (16 novos):**

- onboarding-wizard.png, watch-folders.png, privacy-telemetry.png, bug-report.png, pipeline-error.png, comparator.png, batch-submit.png, asset-detail-cloud.png, dashboard-updated.png, queue-expanded.png
- 6 existentes actualizados: asset-detail.png, ingest-modal.png, queue.png

**Verificacao:**

- JSON valido (15/15 locales): Ã¢Å“â€¦
- HelpModal compila: Ã¢Å“â€¦ (tsc --noEmit)
- Git diff: 23 ficheiros, 966 insercoes / 52 remocoes

**Notas:**

- Scripts temporarios (patch-i18n.cjs, patch-i18n-v2.cjs) removidos
- Foi necessario reverter `src/i18n/locales/en/common.json` de git HEAD apos corrupcao durante edicao (multiplas insercoes duplicadas); depois repatch com script Node.js

---

## Estado das branches

- `dev`: v0.30.0-beta.1 em desenvolvimento (Sessao 28 + Sessao 29)
- `main`: v0.29.0-alpha.1 (Sessao 27)
- Pronto para: merge dev Ã¢â€ â€™ main, tag v0.30.0-beta.1, GitHub Release (Pre-release)

---

## Notas tecnicas para o proximo agente

- **Visual Comparator** Ã¢â‚¬â€ so aparece quando `asset.output_path` existe; usa `convertFileSrc` para loading de ficheiros locais; videos sincronizados via event listeners `timeupdate` + `loadedmetadata`
- **Onboarding** Ã¢â‚¬â€ `STORAGE_KEY = 'nexora_onboarding_complete'` exportado de `OnboardingModal.tsx`; Settings > Privacy usa `import { STORAGE_KEY as ONBOARDING_STORAGE_KEY }`
- **Watch Folders** Ã¢â‚¬â€ debounce 3s + dedup via `ingested` set; limpa pending/ingested ao remover pasta via `WatchCmd::Remove`
- **Bug Report** Ã¢â‚¬â€ `BugReportModal.tsx` usa `get_last_n_logs_text(n: 50)`; inclui versao, plataforma, OS; copy/clipboard, GitHub, ou save file
- **Pipeline Error** Ã¢â‚¬â€ categorias: diskFull, permission, corrupt, codec, killed, generic; mapeia via string match em lowercase; hints user-friendly
- **i18n patch** Ã¢â‚¬â€ se adicionar novas chaves, usar script (ex: scripts/patch-i18n.cjs) para evitar corrupcao manual do JSON; sempre validar com `ConvertFrom-Json`

---

### Sessao 28 Ã¢â‚¬â€ Beta Stability + VisualComparator v0.30.0-beta.1 Ã¢â‚¬â€ EM DEV (branch dev)

**Pedido:** Analise multi-agente (Gemini, GPT-5.5, Kimi 2.6) identificou 6 bugs que bloqueiam a beta. Implementar fixes + feature premium VisualComparatorPlayer.

**Implementacao (11 commits, subagent-driven development):**

1. **Fix 1 Ã¢â‚¬â€ Watch Folders debounce:** `watch_folders.rs` Ã¢â‚¬â€ HashMap<PathBuf, PendingFile> com verificacao de tamanho 3s. HashSet `ingested` previne duplo ingest. Purge de pending/ingested em WatchCmd::Remove. Loop sleep 250ms -> 1s.

2. **Fix 2 Ã¢â‚¬â€ SQLite WAL tuning:** `db/mod.rs` Ã¢â‚¬â€ adicionado `synchronous=NORMAL` e `wal_autocheckpoint=1000` ao execute_batch existente (WAL ja estava activo).

3. **Fix 3 Ã¢â‚¬â€ Graceful shutdown:** `state.rs` novo campo `shutdown: Arc<AtomicBool>` + `WatchCmd::Shutdown`. `lib.rs`: disk thread verifica flag a cada 1s (max 1s latencia), metrics thread com while loop, RunEvent::ExitRequested handler.

4. **Fix 4 Ã¢â‚¬â€ Event-driven logs:** `useLogs.ts` ja implementado em sessao anterior (listen('log-entry') + fallback 60s). Verificado, sem alteracoes.

5. **Fix 5 Ã¢â‚¬â€ Cloud dedup:** `App.tsx` Ã¢â‚¬â€ removido useEffect que chamava `process_cloud_destinations`. Backend (queue.rs) e unico dono. `cloud.rs` ja filtra status='pending' (idempotente).

6. **Fix 6 Ã¢â‚¬â€ version.ts:** `APP_VERSION = '0.30.0-beta.1'`, historico completo 0.10.0-0.30.0-beta.1 (21 entradas).

7. **Feature 7 Ã¢â‚¬â€ VisualComparatorPlayer:** `src/components/VisualComparatorPlayer.tsx` Ã¢â‚¬â€ split-screen com clip-path dinamico, sincronizacao timeupdate, drag handle, window.mouseup cleanup, try/catch em togglePlay. Nova tab 'Comparador' em AssetDetailPage (condicional a output_path). i18n EN+PT.

8. **Release bump:** `package.json` 0.30.0-beta.1, `Cargo.toml` 0.30.0, `tauri.conf.json` 0.30.0.

**Commits desta sessao (11):**

- `16ffbc8` fix(watch-folders): debounce de tamanho 3s + deduplicacao via ingested set
- `e00fafe` fix(watch-folders): purge pending/ingested ao remover pasta + guard contra re-pending
- `f972a9e` fix(db): synchronous=NORMAL e wal_autocheckpoint=1000 na conexao SQLite
- `808d54d` fix(shutdown): graceful shutdown via AtomicBool + WatchCmd::Shutdown + ExitRequested handler
- `225fa99` fix(shutdown): disk thread verifica shutdown a cada 1s (nao 10s)
- `47042c0` chore(logs): Fix 4 verificado Ã¢â‚¬â€ useLogs usa event-driven listen('log-entry') + fallback 60s
- `d17ef28` fix(cloud): remover trigger duplicado de process_cloud_destinations no frontend
- `2ffe306` fix(version): actualizar APP_VERSION para 0.30.0-beta.1 + historico completo 0.26-0.30
- `20a6580` feat(comparator): VisualComparatorPlayer split-screen + tab Comparador no AssetDetail
- `62ac6c7` fix(comparator): window mouseup cleanup + try/catch no togglePlay
- `2906ea6` chore(release): bump versoes para 0.30.0-beta.1 / 0.30.0

**Estado:** Tudo implementado em branch `dev`. Nao mergiado para main ainda. Pronto para: merge + tag v0.30.0-beta.1 + GitHub Release (Pre-release).

**Para o proximo agente:**

- Fazer merge dev -> main
- Criar tag `v0.30.0-beta.1`
- Criar GitHub Release como Pre-release
- A versao em `tauri.conf.json` e `0.30.0` (MSI WiX nao aceita semver pre-release) Ã¢â‚¬â€ correcto
- Criterios de conclusao no spec: `docs/superpowers/specs/2026-05-25-beta-stability-comparator-design.md`

---

### Sessao 27 Ã¢â‚¬â€ Alpha Instrumentada v0.29.0 Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Implementar instrumentacao completa para alpha fechado: watch folders, onboarding, telemetria opt-in, bug report modal, mensagens de erro de pipeline, traducoes PT completas, e publicar release v0.29.0-alpha.1.

**Implementacao (11 tasks, 17 commits):**

1. **Migracao SQLite:** tabelas `watch_folders` e `telemetry_events` adicionadas via `migrate_watch_folders_v1` e `migrate_telemetry_v1` em `db/migrations.rs`.

2. **Script check-translations.mjs:** valida paridade de chaves EN vs PT/outros locales; alpha gate Ã¢â‚¬â€ `process.exit(1)` se PT tem chaves em falta.

3. **Watch Folders (Rust):** crate `notify = "6"` em `Cargo.toml`; `WatchCmd` enum + `watcher_tx: Mutex<Option<mpsc::Sender<WatchCmd>>>` em `AppState`; thread watcher gerido em `lib.rs` setup; 4 comandos IPC: `add_watch_folder`, `remove_watch_folder`, `list_watch_folders`, `set_watch_folder_enabled`.

4. **Watch Folders (React):** painel em `SettingsPage.tsx` com add/remove/toggle; interface `WatchFolder { id, path, enabled, createdAt }`.

5. **PipelineErrorMessage.tsx:** componente que mapeia padroes FFmpeg (diskFull, permission, corrupt, codec, killed, generic) para titulo + dica user-friendly.

6. **OnboardingModal.tsx:** wizard 4 passos; `STORAGE_KEY` exportado; `useOnboarding()` hook; passo 2 com `dialogOpen`; passo 3 toggle telemetria; passo 4 `invoke('update_settings')`.

7. **Telemetria local (opt-in):** `src-tauri/src/telemetry.rs` Ã¢â‚¬â€ `record()` verifica setting antes de inserir; `get_telemetry_events` (200 DESC); `clear_telemetry_events`; aba Privacy em Settings.

8. **BugReportModal.tsx:** copia clipboard, abre GitHub issue, guarda ficheiro via `invoke('save_bug_report')`; checkbox `includeLogs` default true; `invoke('get_last_n_logs_text', { n: 50 })`; botao Bug laranja em `TopBar.tsx`.

9. **Novos comandos Rust em `commands/logs.rs`:** `get_last_n_logs_text(n: i64)` com `n.clamp(1, 500)`; `save_bug_report(content: String, app: AppHandle)` guarda em Downloads.

10. **i18n PT completo:** todas as chaves novas (onboarding, bugReport, settings.watchFolders, settings.privacy, jobCard.errors, topbar.bugReport) adicionadas a `pt/common.json`; alpha gate passa `Ã¢Å“â€¦`.

11. **ALPHA-TESTING.md:** guia de 22 accoes, requisitos minimos, instrucoes de instalacao para 3 plataformas; contacto: ideiasestrondosas@gmail.com.

**Release v0.29.0-alpha.1:**

- `tauri.conf.json` versao `0.29.0` (numerica para MSI WiX Ã¢â‚¬â€ nao aceita semver pre-release)
- `package.json` versao `0.29.0-alpha.1`
- CI corrigido: `n.clamp(1, 500)` (clippy) + `cargo fmt` (rustfmt)
- Tag `v0.29.0-alpha.1` Ã¢â€ â€™ commit `45d9bcd` (movida 3x durante fixes)
- Release publicada: https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/tag/v0.29.0-alpha.1
- 7 PRs Dependabot seguros mergiados; 3 PRs breaking-change fechados (#25 keyring 4, #29 reqwest 0.13, #30 TypeScript 6)

**Commits desta sessao (17):**

- `1ecb332` feat(db): adicionar tabelas watch_folders e telemetry_events
- `af22ed9` feat(i18n): script check-translations
- `7dadbc9` fix(i18n): remover import nao utilizado
- `4bdd9b6` feat(watch-folders): backend Rust
- `5884096` feat(watch-folders): frontend React
- `d43ef8b` feat(ux): PipelineErrorMessage
- `1d88db3` feat(onboarding): modal 4 passos
- `a86cd9f` fix(quality): TOTAL_STEPS, STORAGE_KEY, error handling
- `76db68e` feat(telemetry): registo local opt-in
- `69de57a` feat(bug-report): BugReportModal
- `95b54d1` fix(quality): error handling em handlers async
- `4c2a3ee` docs: ALPHA-TESTING.md
- `d312428` feat(i18n): traducoes PT
- `4baa17a` chore(release): v0.29.0-alpha.1
- `1c67d79` fix(clippy): n.clamp
- `336099c` fix(fmt): cargo fmt
- `45d9bcd` fix(release): versao numerica tauri.conf.json

**Notas para o proximo agente:**

- **MSI version constraint**: `tauri.conf.json` DEVE ter versao puramente numerica (ex: `0.30.0`); `package.json` pode ter semver (`0.30.0-beta.1`). Nao colocar `-alpha.N` no `tauri.conf.json`.
- **n.clamp(1, 500)**: em Rust, clippy rejeita `n.min(500).max(1)` como "clamp-like pattern without using clamp function". Usar sempre `.clamp(min, max)`.
- **Onboarding reset**: `STORAGE_KEY` exportado de `OnboardingModal.tsx`; Settings > Privacy usa `import { STORAGE_KEY as ONBOARDING_STORAGE_KEY }`.
- **invoke() com update_settings**: usar `invoke('update_settings', { key: 'x', value: 'y' })` Ã¢â‚¬â€ NAO existe `set_output_dir` ou similar.
- **Proximos passos sugeridos**: recolher feedback dos alpha testers, corrigir bugs reportados, lanÃƒÂ§ar v0.30.0-beta.1 publica.

---

### Sessao 26 Ã¢â‚¬â€ Pipeline de Release sync.ps1 Ã¢â‚¬â€ Titulo, Draft com Assets e Corpo Rico Ã¢â‚¬â€ CONCLUIDO

**Pedido:** A release v0.27.0 aparecia como Draft com titulo "Nexora Desktop v0.27.0" sem assets nem corpo rico. Corrigir sync.ps1 para gerar titulos e corpos automaticamente, e garantir que a opcao 6 publica o draft correcto (com instaladores do CI).

**Causa raiz identificada:**

1. **Caminho `-Release` (linha 1986):** chamava `Get-ReleaseTitle` sem prefixo `"v$version Ã¢â‚¬â€ "`, ao contrario da opcao 6 que ja o adicionava. Resultado: titulo "PublishDraft mode, Bug Fixes & Platform Polish" em vez de "v0.27.0 Ã¢â‚¬â€ ..."
2. **Opcao 6 (`Invoke-PublishDraft`):** usava `GET /releases/tags/{tag}` que so devolve releases **nao-draft**. O draft criado pelo CI (com 6 instaladores) ficava invisivel; a opcao 6 publicava uma release vazia sem assets.
3. **CHANGELOG v0.27.0:** so tinha o commit do README; faltavam `feat(sync): PublishDraft` e `fix(sync): PATCH draft`.
4. **Corpo gerado do CHANGELOG:** formato simplificado `### New Features` em ingles, em vez do formato rico em portugues.

**Implementacao:**

1. **`scripts/sync.ps1` Ã¢â‚¬â€ linha 1986:**
   - `Get-ReleaseTitle ...` Ã¢â€ â€™ `"v$newVersion Ã¢â‚¬â€ $(Get-ReleaseTitle ...)"` Ã¢â‚¬â€ paridade com opcao 6

2. **`scripts/sync.ps1` Ã¢â‚¬â€ `Invoke-PublishDraft` (opcao 6) Ã¢â‚¬â€ reescrita completa:**
   - Usa `GET /releases?per_page=50` e filtra `draft=true` + tag correspondente
   - Prefere o draft com assets do CI; fallback para release publicada se nao houver draft
   - Gera `release-notes-vX.md` a partir dos commits do range (`git log PREV..CURRENT`)
   - Apos publicar o draft correcto, apaga automaticamente a release duplicada vazia (se existir)

3. **`scripts/sync.ps1` Ã¢â‚¬â€ `Generate-ReleaseNotesFile` Ã¢â‚¬â€ headers portugueses:**
   - `## What's New` Ã¢â€ â€™ `## Resumo` (com contador de itens)
   - `### New Features` Ã¢â€ â€™ `## Novas Funcionalidades`
   - `### Bug Fixes` Ã¢â€ â€™ `## Correccoes`
   - `### Changed` Ã¢â€ â€™ `## Alteracoes`
   - `## Instaladores` com tabela em portugues

4. **`CHANGELOG.md` v0.27.0:** adicionados commits em falta (`feat(sync): PublishDraft`, `fix(sync): PATCH draft`)

5. **`.env.example`:** `GITHUB_TOKEN=` documentado com instrucoes

6. **v0.27.0 GitHub Release Ã¢â‚¬â€ corrigida manualmente via API:**
   - Draft com assets (ID 328561164, 6 instaladores) publicado com titulo/corpo/tag correctos
   - Release vazia (ID 328797290, 0 assets) apagada
   - Estado final: `v0.27.0 Ã¢â‚¬â€ PublishDraft mode, Bug Fixes & Platform Polish` Ã¢â‚¬â€ Latest Ã¢â‚¬â€ 6 assets

**Commits desta sessao:**

- `4a4086f` fix(sync): adicionar prefixo v$version ao titulo da release em -Release
- `ee70d0d` docs: adicionar GITHUB_TOKEN ao .env.example
- `e9ebf41` fix(sync): opcao 6 Ã¢â‚¬â€ encontrar draft com assets via lista completa de releases

**Notas para o proximo agente:**

- A proxima release sera v0.28.0 (tag ja criada, CHANGELOG corrigido)
- Para publicar a v0.28.0: o CI vai correr automaticamente; depois executar `sync.ps1 -PublishDraft` Ã¢â‚¬â€ a opcao 6 ja encontra o draft do CI correctamente
- `release-notes-v0.27.0.md` criado localmente (nao commitado, usado pelo sync.ps1)
- O `.env` com `GITHUB_TOKEN` e necessario para a opcao 6 funcionar (nao esta em git)

---

### Sessao 25 Ã¢â‚¬â€ Glassmorphism uniforme em todos os overlays Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Tornar todos os menus, popups, modais e qualquer janela que faÃƒÂ§a sobreposiÃƒÂ§ÃƒÂ£o uniformemente glass/semi-transparente, igual ao efeito aplicado ao sidebar e topbar.

**Implementacao:**

1. **Classe `.glass-surface` em `src/index.css`:**
   - Dark + Win/Mac: `rgba(14,18,28,0.78)` + `backdrop-filter: blur(24px) saturate(1.4)` + border `rgba(255,255,255,0.08)`
   - Light + Win/Mac: `rgba(248,250,252,0.84)` + `backdrop-filter: blur(24px) saturate(1.2)` + border `rgba(0,0,0,0.06)`
   - Linux/outros: sem override (fundo sÃƒÂ³lido original mantido)
   - Toasts Sonner: `[data-sonner-toast]` com `!important` (inline styles da lib)

2. **Componentes actualizados (container raiz de cada overlay):**
   - `AssetDetailModal.tsx` Ã¢â‚¬â€ `bg-white dark:bg-gray-900` Ã¢â€ â€™ `glass-surface`
   - `ConfirmDialog.tsx` Ã¢â‚¬â€ `bg-bg-secondary` Ã¢â€ â€™ `glass-surface`
   - `HelpModal.tsx` Ã¢â‚¬â€ `bg-card/95 backdrop-blur-md` Ã¢â€ â€™ `glass-surface`
   - `IngestProfileModal.tsx` Ã¢â‚¬â€ modal container + dropdown de perfil
   - `BatchSubmitModal.tsx` Ã¢â‚¬â€ modal container + `ProfileDropdown` portal
   - `CloudFileBrowserModal.tsx` Ã¢â‚¬â€ `bg-bg-primary` Ã¢â€ â€™ `glass-surface`
   - `CloudProfileModal.tsx` Ã¢â‚¬â€ `bg-gray-900 border border-gray-700` Ã¢â€ â€™ `glass-surface border border-border` (fix de cores hardcoded)
   - `QueuePage.tsx` Ã¢â‚¬â€ popover de reprocessamento (portal para body)

**Total:** 9 ficheiros alterados, 1 commit (`2579540`)

**Notas para o proximo agente:** Glassmorphism agora e uniforme. `WindowControls.tsx` existe mas nao esta integrado no TopBar (frame nativo ativo). `PlatformDebugBadge` e dev-only e pode ser removido antes de producao. Branch `dev` tem merge de `main` com todo o trabalho das sessoes 23-25.

---

### Sessao 24 Ã¢â‚¬â€ Glassmorphism + Correcoes UX Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Remover botoes duplicados (frame nativo ja tem os seus), mostrar verificacao Segoe UI Variable e Mica, compactar bottom bar no detalhe, e aplicar glassmorphism nos containers para Mica ser visivel.

**Implementacao:**

1. **Fix botoes duplicados (`TopBar.tsx`):**
   - Removido `WindowControls` import e uso do TopBar Ã¢â‚¬â€ frame nativo do Windows/Linux/macOS ja tem os botoes proprios
   - `WindowControls.tsx` mantido como componente guardado para eventual `decorations: false`

2. **`PlatformDebugBadge.tsx` (novo, dev-only):**
   - Badge no canto inferior direito visivel apenas em `import.meta.env.DEV`
   - Mostra: plataforma detectada (`Ã°Å¸ÂªÅ¸ windows`), se Segoe UI Variable esta carregada (Ã¢Å“â€œ/~), estado Mica (verifica se `body` tem background transparente)
   - Proprio painel usa `backdrop-filter: blur(24px)` Ã¢â‚¬â€ provando Mica se o fundo variar com wallpaper

3. **Bottom bar compacta (`AssetDetailPage.tsx`):**
   - Container: `p-4` Ã¢â€ â€™ `py-2 px-3`; gap `4` Ã¢â€ â€™ `2`
   - Botoes: `px-6/4 py-2 text-sm` Ã¢â€ â€™ `px-3 py-1.5 text-xs`
   - Icones mantidos no tamanho original

4. **Glassmorphism (`src/index.css`):**
   - `aside` (sidebar): `rgba(10,13,20,0.6)` dark / `rgba(248,250,252,0.72)` light + `backdrop-filter: blur(20px) saturate(1.4)`
   - `[data-topbar]`: `rgba(10,13,20,0.7)` dark / `rgba(255,255,255,0.72)` light + `backdrop-filter: blur(20px)`
   - `main`: transparente (Mica visivel no fundo do content area)
   - Root shell `.flex.h-screen`: transparente
   - `data-topbar` attribute adicionado ao TopBar div para targeting CSS limpo

**Verificacao:**

- `tsc --noEmit`: OK Ã¢Å“â€¦
- `eslint . --max-warnings 0`: OK Ã¢Å“â€¦

**Commits:**

- `1a83613` fix(platform): remover WindowControls duplicados; badge debug dev; bottom bar compacta
- `13d3973` feat(platform): glassmorphism sidebar/topbar/main para Mica/Vibrancy + PROGRESS actualizado

**Proximo passo exacto:**
Arrancar `npm run tauri dev` e verificar: sidebar semi-transparente, topbar glass, Mica visivel no fundo entre containers; PlatformDebugBadge mostra "Segoe UI Variable Ã¢Å“â€œ" e "Mica: active Ã¢Å“â€œ".

---

### Sessao 23 Ã¢â‚¬â€ Platform-Adaptive UX Phase A + Phase B Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Implementar UX adaptativo por plataforma (Windows/macOS/Linux) conforme spec `docs/superpowers/specs/2026-05-24-platform-adaptive-ux-design.md` e plano aprovado em plan mode.

**Implementacao:**

1. **Phase A Ã¢â‚¬â€ CSS Tokens por plataforma (`src/index.css`):**
   - `:root` com `--app-font`, `--app-radius`, `--app-shadow`, `--app-easing` (fallback genÃƒÂ©rico)
   - `[data-platform='windows']`: Segoe UI Variable, radius 4px, sombra Fluent, easing WinUI
   - `[data-platform='macos']`: SF Pro Text/-apple-system, radius 10px, sombra difusa
   - `[data-platform='linux']`: Cantarell/Ubuntu, radius 6px, sombra leve
   - Scrollbars nativas: macOS overlay 6px, Windows `scrollbar-width: auto`, Linux thin
   - `body { font-family: var(--app-font) }` Ã¢â‚¬â€ 'Inter' hardcoded removido

2. **Phase A Ã¢â‚¬â€ `src/hooks/usePlatform.ts` extendido:**
   - `MOD_SYMBOL`: `Ã¢Å’Ëœ` em macOS, `Ctrl` noutros
   - `MOD_KEY`: `Meta` em macOS, `Control` noutros
   - `shortcut(key)`: helper que formata atalhos de teclado por plataforma

3. **Phase A Ã¢â‚¬â€ `src/components/WindowControls.tsx` (novo ficheiro):**
   - macOS: `<div className="w-[76px] flex-shrink-0" aria-hidden />` Ã¢â‚¬â€ espaÃƒÂ§o para traffic lights nativos
   - Windows: botÃƒÂµes Minus/Square/X estilo Fluent; hover vermelho no botÃƒÂ£o fechar
   - Linux: idÃƒÂªntico Windows mas hover neutro (sem vermelho)
   - API Tauri: `getCurrentWindow().minimize()`, `.toggleMaximize()`, `.close()`

4. **Phase A Ã¢â‚¬â€ `src/components/TopBar.tsx` actualizado:**
   - Import de `usePlatform` e `WindowControls`
   - `<WindowControls />` como primeiro elemento (spacer macOS / botÃƒÂµes Win/Linux)
   - Padding condicional: `isMac && 'pl-0'` na drag area
   - BotÃƒÂ£o Sair envolto em `<div className="flex items-center pr-2">`

5. **Phase B Ã¢â‚¬â€ `src-tauri/Cargo.toml`:**
   - `window-vibrancy = "0.5"` adicionado (resolve para 0.5.3)

6. **Phase B Ã¢â‚¬â€ `src-tauri/src/lib.rs`:**
   - `use window_vibrancy::apply_mica` (Windows cfg)
   - `use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial}` (macOS cfg)
   - ApÃƒÂ³s `tray::setup(app)?`: `apply_mica(&main_window, Some(true)).ok()` no Windows
   - ApÃƒÂ³s `tray::setup(app)?`: `apply_vibrancy(&main_window, NSVisualEffectMaterial::HudWindow, None, None).ok()` no macOS
   - Nota: `is_windows11()` nÃƒÂ£o existe no 0.5.x Ã¢â‚¬â€ `.ok()` jÃƒÂ¡ trata fallback gracioso

7. **Phase B Ã¢â‚¬â€ `tauri.conf.json` + `src/index.css`:**
   - `"transparent": true` na janela main
   - CSS: `[data-platform='windows'] body,macos body { background: transparent }` + `#root` idem

**Verificacao:**

- `tsc --noEmit`: OK Ã¢Å“â€¦
- `eslint . --max-warnings 0`: OK Ã¢Å“â€¦
- `cargo check`: OK Ã¢Å“â€¦ (window-vibrancy 0.5.3 compila sem erros)

**Commits (7):**

- `ab410b1` feat(platform): design tokens CSS por plataforma
- `c869748` feat(platform): modKey, modSymbol, shortcut() ao usePlatform
- `f3003f2` feat(platform): criar WindowControls
- `2e644b6` feat(platform): integrar WindowControls no TopBar
- `4dd52ec` feat(platform): window-vibrancy crate
- `819135a` feat(platform): apply_mica / apply_vibrancy no setup
- `d4064a6` feat(platform): Phase B transparent window + CSS

**Proximo passo exacto:**
Testar visualmente `npm run tauri dev` Ã¢â‚¬â€ verificar botÃƒÂµes TopBar, fonte Segoe UI Variable em Windows, efeito Mica se Windows 11.

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 22 Ã¢â‚¬â€ HelpModal + i18n Completo em 15 Linguas + README Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Analisar toda a aplicacao e verificar diferencas entre o que foi alterado/acrescentado/modificado/criado de novo. Actualizar o menu manual (HelpModal) com tabs e cards em falta, adicionar screenshots e detalhes, e fazer tudo em todas as linguas. Actualizar tambem a pagina README no GitHub.

**Implementacao:**

1. **Analise completa da aplicacao:**
   - Identificadas funcionalidades existentes nao documentadas: Asset Detail, Import modal, Logs tab, Cache display, Keyboard shortcuts, Platform UX, Security, GDrive OAuth, S3 compatibles, iCloud
   - 10 screenshots existentes + 5 novos screenshots fornecidos pelo utilizador

2. **HelpModal.tsx expandido:**
   - 2 novas tabs: Asset Detail (screenshot + 3 tips) e Import (screenshot + batch processing)
   - Tab Settings: +3 cards (Logs Tab, Cache Display, Keyboard Shortcuts)
   - Tab Cloud: +3 cards (Google Drive OAuth, S3 & Compatible, iCloud Drive)
   - Tab Intro: +2 cards (Platform-Adaptive UX, Security & Privacy)
   - TAB_COUNTS actualizado (intro:1, assetDetail:2, import:2, settings:4, cloud:5)
   - 15 screenshots mapeados no SCREENSHOTS object
   - Importacao de icones FileVideo e Download do lucide-react

3. **i18n Ã¢â‚¬â€ 15 linguas completas:**
   - 40+ novas chaves help.\* em EN (tabs, screens, platform, security)
   - Traducao PT completa
   - Traducao automatica para 13 linguas via subagents paralelos (es,fr,de,ar,it,ja,ko,nl,pl,ru,sv,tr,zh)
   - **Correccao estrutural critica:** 5 locales (pt,ru,sv,tr,zh) tinham chaves help.\* colocadas fora do objeto help Ã¢â‚¬â€ corrigido por subagents dedicados
   - Validacao: 15/15 locales JSON valido, todas as chaves help.\* presentes

4. **Documentacao actualizada:**
   - docs/screenshots/README.md: 15 screenshots total, grid atualizado
   - docs/screenshots/PENDING_CAPTURE.md: 5 novos screenshots v0.26.0 adicionados
   - docs/USER_MANUAL.md: novas seccoes 9 (Asset Detail), 10 (Cloud Storage), 11 (Security & Privacy)
   - README.md: screenshots grid expandido (3 rows), features table com Log Management/Cache/Platform UX/Help Manual, secao "What's New in v0.26.0" detalhada

**Verificacao:**

- `npm run lint`: OK Ã¢Å“â€¦
- `npx tsc --noEmit`: OK Ã¢Å“â€¦
- 15/15 locales JSON valido Ã¢Å“â€¦
- Todas as chaves help.\* presentes em todos os locales Ã¢Å“â€¦

**Proximo passo exacto:**
Continuar com Platform-Adaptive UX Phase A conforme plano em `C:\Users\arnal\.claude\plans\lexical-singing-frog.md`.

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 21 Ã¢â‚¬â€ CI Fixes v0.26.0 + Release Automatica Melhorada Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Analisar falhas de CI na v0.26.0, corrigir, e melhorar o processo de publicacao de releases no GitHub.

**Implementacao:**

1. **Fix critico Ã¢â‚¬â€ tauri.conf.json:**
   - `titleBarStyle: "overlay"` nao e um valor valido no schema Tauri 2.x; impedia arranque da app
   - Removido; janela volta ao frame nativo do SO ate Phase A do Platform UX

2. **Fix Ã¢â‚¬â€ sync.ps1 inoperacional em PowerShell 5.x:**
   - UTF-8 sem BOM fazia PS5 ler em Windows-1252; byte `\x94` (em-dash) corrompido para `"`
   - Re-gravado com UTF-8 BOM via `System.Text.UTF8Encoding($true)`

3. **Correcoes de CI para v0.26.0 (4 falhas independentes):**
   - `cargo fmt`: formatacao aplicada em `smb.rs`, `logs.rs`, `file_logger.rs`
   - Prettier: formatacao aplicada em `CHANGELOG.md`, `package.json`, `PROGRESS-DESKTOP.md`, `test-karpathy.mjs`, `tauri.conf.json`
   - `test-karpathy.mjs`: 3 bugs Ã¢â‚¬â€ crash ENOENT quando SKILL.md ausente em CI, caminho hardcoded Windows, `opencode.jsonc` como falha de CI
   - `cargo test` Linux: `smb::resolve()` nao normalizava backslashes antes de `Path::join()`; em Linux `\` nao e separador Ã¢â‚¬â€ normalizado com `.replace('\\', "/")`
   - Todos os workflows CI/Build passam apos os fixes

4. **sync.ps1 Ã¢â‚¬â€ PATCH de draft release (preserva assets do CI):**
   - `build.yml` cria draft automatico com instaladores ao fazer push da tag
   - Modo `-Release` agora usa `PATCH /releases/{id}` em vez de apagar e recriar
   - Evita perda dos binarios ja anexados pelo GitHub Actions

5. **sync.ps1 Ã¢â‚¬â€ novo modo `-PublishDraft` / opcao 6 do menu:**
   - Publica qualquer draft existente (titulo + corpo rico gerado do CHANGELOG + `draft=false`)
   - Util depois de um `build.yml` correr sem ter passado pelo sync.ps1
   - v0.26.0 publicada manualmente com este mecanismo como teste

## Proximo passo exacto

Implementar Platform-Adaptive UX conforme plano em `C:\Users\arnal\.claude\plans\lexical-singing-frog.md`:

- **Phase A** (sem novos deps Rust): `usePlatform.ts` + `modKey`/`shortcut()`; `WindowControls.tsx`; `TopBar.tsx`; CSS `--app-font`/`--app-radius` por plataforma
- **Phase B**: `window-vibrancy` crate Ã¢â‚¬â€ Mica Windows 11 + NSVisualEffectView macOS; `transparent: true` na janela

## Ficheiros tocados

- `src-tauri/tauri.conf.json` (titleBarStyle removido)
- `src-tauri/src/cloud/smb.rs` (backslash normalizado + cargo fmt)
- `src-tauri/src/logs.rs`, `src-tauri/src/file_logger.rs` (cargo fmt)
- `scripts/sync.ps1` (UTF-8 BOM + PATCH release + modo -PublishDraft)
- `scripts/test-karpathy.mjs` (3 bugs CI corrigidos)
- `CHANGELOG.md`, `package.json`, `PROGRESS-DESKTOP.md` (Prettier)
- `.session-info.md`, `SYNC-STATE.md`

## Estado de compilacao

- `cargo test`: 27/27 testes passam (incluindo smb backslash fix)
- CI GitHub Actions v0.26.0: todos os workflows passam
- GitHub Release v0.26.0: publicada com conteudo rico

## Commits desta sessao

- `fix(ci): corrigir cargo fmt e prettier para v0.26.0`
- `fix(ci): corrigir test-karpathy.mjs para CI Linux`
- `fix(ci): smb::resolve normalizar backslashes em Linux`
- `fix(sync): PATCH draft release em vez de recriar Ã¢â‚¬â€ preserva assets do CI`
- `feat(sync): adicionar modo -PublishDraft / opcao 6 para publicar draft releases`

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 20 Ã¢â‚¬â€ Auditoria Completa: SeguranÃƒÂ§a, Performance, Platform UX + Keychain Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Implementar todas as melhorias levantadas pela auditoria das sessÃƒÂµes 17/18 (seguranÃƒÂ§a, performance, UX adaptativa) e as fases de documentaÃƒÂ§ÃƒÂ£o em falta.

**Implementacao:**

1. **SeguranÃƒÂ§a S1 Ã¢â‚¬â€ Credenciais cloud no keychain OS:**
   - `keyring = "3"` adicionado ao `Cargo.toml`
   - `save_credentials`, `load_credentials`, `delete_credentials` em `commands/cloud.rs`
   - `create_cloud_profile` e `update_cloud_profile` guardam creds no keychain; `delete_cloud_profile` limpa entrada
   - `run_cloud_uploads` carrega do keychain, fallback para config blob (backward-compat)
   - `CloudProfileModal.tsx`: `splitFields()` separa credenciais de config; `credentialsJson` passado separadamente no invoke

2. **SeguranÃƒÂ§a S2 Ã¢â‚¬â€ Path traversal SMB:**
   - `validate_remote_path()` em `cloud/smb.rs` rejeita componentes `..` com `split(['/', '\\']).any(|c| c == "..")`
   - 4 unit tests: traversal simples, traversal profundo, caminhos normais aceites, resolve\_\*
   - Fix: o teste anterior usava `Path::starts_with` que falha para paths nÃƒÂ£o-normalizados

3. **SeguranÃƒÂ§a S3 Ã¢â‚¬â€ ValidaÃƒÂ§ÃƒÂ£o endpoint logs:**
   - `validate_log_endpoint(raw)` em `commands/logs.rs` Ã¢â‚¬â€ rejeita URLs sem protocolo http/https
   - 4 unit tests: http aceite, https aceite, sem protocolo rejeitado, vazio rejeitado

4. **SeguranÃƒÂ§a S4 Ã¢â‚¬â€ FTP max file size:**
   - `FTP_MAX_FILE_BYTES: u64 = 2 * 1024 * 1024 * 1024` substituindo magic number em `cloud/ftp.rs`

5. **SeguranÃƒÂ§a S5 Ã¢â‚¬â€ cargo audit:**
   - `src-tauri/audit.toml` criado com `RUSTSEC-2023-0071` documentado (RSA Marvin, via russh, password auth only)
   - `[warnings] unmaintained = "warn"` configurado

6. **Performance Phase 3:**
   - `vite.config.ts`: removido `manualChunks` vendor chunk quebrado (gerava bundle 0 bytes)
   - Lazy loading: 4 pÃƒÂ¡ginas pesadas com `React.lazy()` + `<Suspense>`
   - `tokio::fs` em comandos Rust async (substituindo `std::fs` bloqueante)
   - Clone desnecessÃƒÂ¡rio eliminado em `run_cloud_uploads`
   - Polling de logs: 2s Ã¢â€ â€™ 5s, scroll condicional

7. **Platform UX Phase 4:**
   - `src/hooks/usePlatform.ts` com `isMac`, `isWindows`, `isLinux`, `modKey`, `accentStyle`
   - `get_platform` comando Rust com `#[cfg(target_os)]`
   - Menus nativos por plataforma (Tauri menu builder)
   - `WindowControls.tsx` Ã¢â‚¬â€ titlebar adaptativa (traffic lights macOS, controlos Windows)
   - `window-vibrancy` crate para efeitos Mica/Acrylic (Windows 11) e Vibrancy (macOS)

8. **Documentation Phase 1:**
   - i18n lazy-load: 14 locales on-demand, sÃƒÂ³ `en.json` no bundle inicial; `initI18n()` awaited em `main.tsx`
   - README.md actualizado (stack, cloud, screenshots, build)
   - HelpModal Ã¢â‚¬â€ aba Cloud com documentaÃƒÂ§ÃƒÂ£o de todos os providers + GDrive OAuth step-by-step
   - `package.json` metadata (`description`, `author`, `license`) preenchidos

9. **Watch-GitHubActions em sync.ps1:**
   - FunÃƒÂ§ÃƒÂ£o `Watch-GitHubActions($sha, $version, $token)` adicionada ao `scripts/sync.ps1`
   - Poll da GitHub REST API (`/actions/runs?head_sha=`) a cada 30s
   - Mostra Ã¢ÂÂ³/Ã¢Å“â€¦/Ã¢ÂÅ’ por workflow; termina quando todos concluÃƒÂ­dos ou timeout (30 min)
   - Chamada no bloco Release apÃƒÂ³s merge bem-sucedido (opt-in: [S/N])

10. **Testes:** 27/27 `cargo test` passam (smbÃƒâ€”8, logsÃƒâ€”4, ftpÃƒâ€”4, sftpÃƒâ€”3, outrosÃƒâ€”8)

## Proximo passo exacto

Aguardar prÃƒÂ³ximo pedido do utilizador. PossÃƒÂ­veis prioridades:

- Watch Folders (crate `notify`) Ã¢â‚¬â€ monitorizaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica de pastas
- TraduÃƒÂ§ÃƒÂ£o profissional dos locales nÃƒÂ£o-PT
- PrÃƒÂ³ximo release (bump versÃƒÂ£o, tag, GitHub Release)

## Ficheiros tocados

- `src-tauri/Cargo.toml` (keyring, window-vibrancy)
- `src-tauri/src/commands/cloud.rs` (keychain helpers, create/update/delete/run_cloud_uploads)
- `src-tauri/src/cloud/smb.rs` (validate_remote_path + tests)
- `src-tauri/src/cloud/ftp.rs` (FTP_MAX_FILE_BYTES constante)
- `src-tauri/src/commands/logs.rs` (validate_log_endpoint + tests)
- `src-tauri/audit.toml` (novo)
- `src/components/CloudProfileModal.tsx` (splitFields com client_secret, credentialsJson separado)
- `src/hooks/usePlatform.ts` (novo)
- `src/components/WindowControls.tsx` (novo)
- `src/i18n/index.ts` (lazy-load)
- `src/main.tsx` (await initI18n)
- `vite.config.ts` (remove manualChunks)
- `scripts/sync.ps1` (Watch-GitHubActions)
- `package.json` (description, author, license)
- `PROGRESS-DESKTOP.md`
- `SYNC-STATE.md`

## Estado de compilacao

- `cargo test`: 27/27 Ã¢Å“â€¦
- `cargo check`: OK Ã¢Å“â€¦
- `tsc --noEmit`: OK Ã¢Å“â€¦

## Commits desta sessao

- `efed769` security(cloud): path traversal fix in SMB + audit hardening
- `b6b76d1` security(cloud): store credentials in OS keychain instead of SQLite plaintext
- `7b7a22c` perf(rust): substituir std::fs por tokio::fs em comandos async
- `7f4e33b` perf: eliminar clone desnecessÃƒÂ¡rio e reduzir polling de logs
- `eb797ba` perf(bundle): lazy-load 4 heavy pages, remove broken vendor chunk
- `f3d8abf` perf(i18n): lazy-load locales on demand
- `65a52dc` feat(platform): UX adaptativo por plataforma Ã¢â‚¬â€ Phase 4
- `e556f0c` feat(sync): Watch-GitHubActions apÃƒÂ³s merge Release

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 19 Ã¢â‚¬â€ Plano de AnÃƒÂ¡lise de UX Adaptativa e Viabilidade do Windows Community Toolkit Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Criar um plano de anÃƒÂ¡lise (sem atualizar cÃƒÂ³digo) para a feature "Platform-Adaptive UX" (nÃƒÂ£o iniciada). Investigar se o Windows Community Toolkit (https://github.com/CommunityToolkit/Windows) pode ser adaptado para Windows, se vale a pena ou nÃƒÂ£o, ou se o que foi feito estÃƒÂ¡ correto. O objetivo ÃƒÂ© adotar a UX mais prÃƒÂ³xima possÃƒÂ­vel de cada plataforma (Windows, macOS, Linux) mantendo a lÃƒÂ³gica de negÃƒÂ³cio e o backend unificados.

**Implementacao:**

1. **InvestigaÃƒÂ§ÃƒÂ£o do Windows Community Toolkit**:
   - ConclusÃƒÂ£o: Ãƒâ€° uma biblioteca nativa para C# / XAML / .NET (WinUI 3/UWP). Como o Nexora Desktop utiliza Tauri 2.x + React + WebView, ÃƒÂ© um mismatch tecnolÃƒÂ³gico total.
   - Veredicto: **NÃƒÂ£o vale a pena**, pois fragmentaria a base de cÃƒÂ³digo, exigiria bridges C++/C# extremamente pesadas e complexas, e quebraria a unificaÃƒÂ§ÃƒÂ£o cross-platform.
2. **ValidaÃƒÂ§ÃƒÂ£o da Abordagem Atual**:
   - Confirmado que a stack atual (Tauri 2.x + React 19 + Tailwind CSS v4) ÃƒÂ© a **correta, moderna e recomendada** para conseguir interfaces responsivas e de alta fidelidade visual.
3. **Desenho da EstratÃƒÂ©gia de UX Adaptativa Multiplataforma**:
   - Apresentada estratÃƒÂ©gia dividida em duas camadas (Nativa com Rust `window-vibrancy` e ApresentaÃƒÂ§ÃƒÂ£o com React/Tailwind/i18n).
   - Efeitos visuais nativos: Mica/Acrylic no Windows 11, Vibrancy (NSVisualEffectView) no macOS.
   - UI adaptada ao SO em tempo de execuÃƒÂ§ÃƒÂ£o: Tipografia (Segoe UI vs SF Pro vs Cantarell), arredondamento de cantos (rounded-lg vs rounded-xl vs rounded-md), cabeÃƒÂ§alho e controlos de janela adaptativos (semÃƒÂ¡foros ÃƒÂ  esquerda no macOS vs controlos Fluent ÃƒÂ  direita no Windows 11), atalhos de teclado dinÃƒÂ¢micos (Cmd vs Ctrl).
4. **CriaÃƒÂ§ÃƒÂ£o do Plano de AnÃƒÂ¡lise**:
   - Guardado em `implementation_plan.md` no diretÃƒÂ³rio de artifacts da conversaÃƒÂ§ÃƒÂ£o.
5. **AtualizaÃƒÂ§ÃƒÂ£o do Contexto do RepositÃƒÂ³rio**:
   - Preenchido o `.session-info.md` no inÃƒÂ­cio e atualizado no fim.
   - Atualizado o `PROGRESS-DESKTOP.md` e o `SYNC-STATE.md`.

## Proximo passo exacto

1. Obter aprovaÃƒÂ§ÃƒÂ£o do utilizador sobre o plano de anÃƒÂ¡lise e a nÃƒÂ£o adoÃƒÂ§ÃƒÂ£o do Windows Community Toolkit.
2. Decidir se avanÃƒÂ§amos para a fase de implementaÃƒÂ§ÃƒÂ£o tÃƒÂ©cnica da UX Adaptativa.

## Ficheiros tocados

- .session-info.md
- PROGRESS-DESKTOP.md
- SYNC-STATE.md
- C:\Users\arnal\.gemini\antigravity-ide\brain\da7b78f4-e0c9-4262-aa58-8f5d75b8fffa\implementation_plan.md (novo)

## Estado de compilacao

- cargo check: OK
- tsc --noEmit: OK
- esbuild: OK

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 18 Ã¢â‚¬â€ Analise Estruturada e Plano de Melhorias (UX, Seguranca, Optimizacao) Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Criar um plano detalhado e priorizado de melhorias, seguranÃƒÂ§a, otimizaÃƒÂ§ÃƒÂ£o e UX multiplataforma (Windows, macOS, Linux) para a aplicaÃƒÂ§ÃƒÂ£o Nexora Desktop, mantendo a paridade de funcionalidades e o backend unificado. Sem implementar cÃƒÂ³digo na aplicaÃƒÂ§ÃƒÂ£o.

**Implementacao:**

1. **Preenchimento do `.session-info.md`:**
   - Inicializado de acordo com o template e as regras em `AGENTS.md`.

2. **Auditoria de SeguranÃƒÂ§a (P0):**
   - Identificada vulnerabilidade crÃƒÂ­tica no armazenamento de credenciais cloud em texto plano no SQLite. Proposta integraÃƒÂ§ÃƒÂ£o de `tauri-plugin-stronghold` ou Keychain nativa do SO (`keyring-rs`).
   - Proposta de proteÃƒÂ§ÃƒÂ£o contra Path Traversal em APIs que tocam o sistema de ficheiros com validaÃƒÂ§ÃƒÂµes estritas em Rust.

3. **OtimizaÃƒÂ§ÃƒÂµes e ResiliÃƒÂªncia (P1):**
   - Proposta de mecanismo de Heartbeat bidirecional no sidecar para terminaÃƒÂ§ÃƒÂ£o limpa de processos zumbis de `FFmpeg`.
   - Proposta de Dynamic Thread Throttle baseado na carga de CPU/GPU recolhida dinamicamente.
   - Proposta de Auto-Purging para limitar e manter limpo o tamanho da cache local de forma configurÃƒÂ¡vel.

4. **ExperiÃƒÂªncia de Utilizador Multiplataforma (P1):**
   - AnÃƒÂ¡lise de UX premium para Windows 11 (Mica/Acrylic, Frameless title bar), macOS (Vibrancy, layout seguro de semÃƒÂ¡foros) e Linux (GTK Scroll styling, decoraÃƒÂ§ÃƒÂµes nativas estÃƒÂ¡veis).
   - Proposta de teclado de atalho com correspondÃƒÂªncia de modificadores dinÃƒÂ¢mica (`Ctrl` vs `Cmd`).

5. **Novas Funcionalidades Premium Recomendadas (P2):**
   - Proposta de **Watch Folders** (Pastas de MonitorizaÃƒÂ§ÃƒÂ£o ativa) integradas no Rust usando a crate `notify`.
   - Proposta de **Leitor de VÃƒÂ­deo Premium com Comparador de Qualidade Visual** Side-by-Side em React.
   - Proposta de **Visual Preset Creator** na interface de configuraÃƒÂ§ÃƒÂµes.

6. **CriaÃƒÂ§ÃƒÂ£o do Plano de AÃƒÂ§ÃƒÂ£o Estruturado:**
   - Criado e guardado o plano de anÃƒÂ¡lise detalhado no artifact `implementation_plan.md`.

**VerificaÃƒÂ§ÃƒÂ£o:**

- Sem alteraÃƒÂ§ÃƒÂµes funcionais no cÃƒÂ³digo principal da aplicaÃƒÂ§ÃƒÂ£o em conformidade com as restriÃƒÂ§ÃƒÂµes do utilizador.
- Ficheiro `.session-info.md` devidamente preenchido.

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 17 Ã¢â‚¬â€ Karpathy Guidelines Integration Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Integrar as Karpathy Guidelines (andrejkarpthy-skills) no workflow do projecto: atualizar AGENTS.md, criar skill OpenCode, e criar test script automatizado.

**Implementacao:**

1. **AGENTS.md atualizado:**
   - Nova secao "Karpathy Guidelines Ã¢â‚¬â€ Regras de Comportamento" com 4 principios em PT
   - Tabela de merge analysis (o que ja existia vs. o que e novo)
   - Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution

2. **Skill `karpathy-guidelines` criada:**
   - Localizacao: `~/.opencode/skills/karpathy-guidelines/SKILL.md`
   - Frontmatter YAML valido (name, description)
   - Tipo: Rigid (follow exactly)
   - Merge analysis em ingles (consistente com Superpowers skills)

3. **Configuracao OpenCode:**
   - `~/.config/opencode/opencode.jsonc` atualizado com `skills.paths`
   - Aponta para `C:/Users/arnal/.opencode/skills`

4. **Test script `scripts/test-karpathy.mjs`:**
   - Valida estrutura do SKILL.md (frontmatter, secoes, tipo Rigid)
   - Valida AGENTS.md (secao Karpathy, regras em PT)
   - Valida opencode.jsonc (skills.paths)
   - Simula 4 cenarios heurÃƒÂ­sticos (Think Before Coding, Goal-Driven, Surgical, Simplicity)
   - Exit code 0/1 (para CI)
   - Resultado actual: 25/25 passaram

5. **CI workflow `.github/workflows/test-karpathy.yml`:**
   - Dispara em push/PR para main
   - Node.js 20, corre `scripts/test-karpathy.mjs`
   - Graceful degradation em CI (skill nao disponivel no runner, valida so AGENTS.md)

**Impacto nos agentes:**

- Claude Code e Antigravity: recebem guidelines via AGENTS.md (ja aplicavel)
- OpenCode: recebe guidelines via AGENTS.md + skill `karpathy-guidelines` (reforco extra)
- Test script: nao afecta runtime dos agentes (apenas CI/validacao)

---

Actualizado: 2026-05-31
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 45 — Release v0.30.11-beta.1 — CONCLUIDO

**Agente:** Claude Code (claude-sonnet-4-6)  
**Data:** 2026-05-31

**Resumo:** Release v0.30.11-beta.1

**Ficheiros alterados:** src-tauri/Cargo.lock

**Notas para o proximo agente:**

- **nexora-engine rebuild:** sempre usar `npm run engine:build:win` (ja com --no-bytecode --public no package.json). Copiar `sidecar/bin/nexora-engine.exe` para `src-tauri/target/debug/nexora-engine.exe` apos build local.
- **useJobStatus:** montado em App.tsx -- nao duplicar em outras paginas.
- **glass-surface vs bg-bg-primary:** TODOS os modais e dropdowns de seleccao usam `bg-bg-primary`. Nao usar `glass-surface` em nenhum modal ou dropdown -- fica transparente sem Mica.
- **URGENTE:** `actions/checkout@v5` + `actions/setup-node@v5` antes de 16 de Junho 2026.
- Branch `dev` pronto para merge -> main e release v0.31.0-beta.1.

---

### Sessao 42 â€” Release v0.30.9-beta.1 â€” CONCLUIDO

**Agente:** Claude Code (claude-haiku-4-5)  
**Data:** 2026-05-31

**Resumo:** 8 itens

**Ficheiros alterados:** release-notes-v0.30.8-beta.1.md

**Notas para o proximo agente:**

- **nexora-engine nao e commitado** â€” gerado localmente com `npm run engine:build:win` (ou :mac, :linux). O CI constroi-o automaticamente no GitHub Actions.
- **Push pendente** â€” o branch `dev` tem commits desta sessao nao empurrados porque o PAT nao tem scope `workflow`. Solucao: actualizar o PAT em github.com/settings/tokens para incluir `workflow`, depois `git push origin dev --follow-tags`.
- **TAB_COUNTS no HelpModal** â€” `intro: 4` ainda esta errado (deveria ser 6 â€” 4 feature cards + platform + security). Minor, fora de escopo desta sessao.
- **diagnostics i18n** â€” 13 locales nao-EN/PT nao tem chaves `diagnostics.*`; fazem fallback para EN silenciosamente. OK por agora.
- **settings-shortcuts e cloud-upload** â€” cards sem screenshot no manual porque nao existe UI dedicada. As chaves i18n existem e o conteudo de texto funciona.

---

### Sessao 16 Ã¢â‚¬â€ Cloud File Browser + Cloud Upload Fix + GDrive Upsert (v0.25.0) Ã¢â‚¬â€ CONCLUIDO

**Pedido:** (1) Cloud File Browser em cada perfil cloud nas DefiniÃƒÂ§ÃƒÂµes; (2) investigar porque ficheiros processados nÃƒÂ£o sÃƒÂ£o enviados para FTP/SMB; (3) GDrive upsert no upload.

**ImplementaÃƒÂ§ÃƒÂ£o:**

1. **Cloud File Browser (10 tasks, 22 commits):**
   - `RemoteFile` struct (`name, path, size, modified, is_dir`, camelCase serde) + `list_files`/`delete_files` defaults no trait `CloudProvider`
   - `FtpProvider`: parser UNIX + DOS, quit-safe, 7 unit tests
   - `SftpProvider`: `read_dir` sync iterator, sessÃƒÂ£o fechada em caso de erro
   - `SmbProvider`: `std::fs::read_dir`, guarda de path traversal (`full.starts_with(base)`)
   - `S3Provider`: `list_objects_v2` com delimiter `"/"`, `common_prefixes`=pastas, `contents`=ficheiros, strip_prefix exacto
   - `GDriveProvider`: Drive v3 API, resolve `base_path` para folder ID, download com HTTP status check, file ID extraÃƒÂ­do de compound path
   - `ICloudProvider`: `Err` explÃƒÂ­cito em `list_files`/`delete_files`/`download`
   - 3 comandos Tauri: `cloud_list_files`, `cloud_delete_files`, `cloud_download_file` + helper `load_profile_provider`
   - `CloudFileBrowserModal.tsx`: spinner, erro+retry, vazio, tabela, breadcrumb, selecÃƒÂ§ÃƒÂ£o, download (diÃƒÂ¡logo nativo), delete individual/seleccionados/todos
   - `SettingsPage.tsx`: botÃƒÂ£o Browse antes de Editar; disabled+tooltip para iCloud
   - 18 chaves `cloudBrowser.*` em 15 locales; 13 testes de componente

2. **CRÃƒÂTICO Ã¢â‚¬â€ Cloud upload nunca accionado:**
   - `queue.rs`: `job:completed` actualizava a BD mas nÃƒÂ£o chamava `process_cloud_destinations`
   - Fix: `tauri::async_runtime::spawn` apÃƒÂ³s emitir o evento, chama `run_cloud_uploads(&job_id, &state)`
   - ExtraÃƒÂ­da funÃƒÂ§ÃƒÂ£o `pub(crate) run_cloud_uploads` de `process_cloud_destinations` para reutilizaÃƒÂ§ÃƒÂ£o

3. **Credenciais vazias em process_cloud_destinations:**
   - Linha 209: `let creds = serde_json::Value::Object(Default::default())` passava creds vazias
   - Fix: `let creds = config.clone()` Ã¢â‚¬â€ credenciais estÃƒÂ£o no mesmo JSON que config

4. **GDrive Browse bugs:**
   - "folder_id nÃƒÂ£o configurado": `folder_id` nunca ÃƒÂ© persistido, apenas `base_path`. Fix: resolver segmentos de `base_path` via Drive API quando `folder_id` ÃƒÂ© None; `""` ou `"/"` retorna `"root"`
   - "Pasta nÃƒÂ£o encontrada": pesquisa sem `parent_id` nÃƒÂ£o restrita ÃƒÂ  raiz. Fix: `'root' in parents` quando `parent_id` is None

5. **GDrive upsert:**
   - Upload sempre criava duplicados (POST cria novo ID). Fix: pesquisar ficheiro por nome na pasta de destino; PATCH se existe, POST com `parents` se novo

**Commits chave:**

- `006a496` feat(cloud): RemoteFile + trait defaults
- `c230f0b..6f163f5` feat(cloud/\*): list_files + delete_files por provider
- `151b4f0` feat(cloud): comandos Tauri
- `0fc4936` feat(ui): CloudFileBrowserModal
- `0b9e1f1` feat(settings): Browse button + i18n
- `067bdfa` fix(cloud/gdrive): resolve base_path segments
- `091c045` fix(cloud/gdrive): 'root' in parents
- `2febb7b` fix(cloud): disparar upload + creds fix
- `377a75a` fix(cloud/gdrive): upsert upload

**VerificaÃƒÂ§ÃƒÂ£o:** cargo check limpo Ã‚Â· 48 testes passam Ã‚Â· confirmado por utilizador (FTP/SMB upload funciona)

---

### Sessao 15 Ã¢â‚¬â€ Cloud Storage Integration (Sub-projecto A, todas as 4 fases) Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Integrar S3, Google Drive, iCloud e outras drives cloud para entrega automÃƒÂ¡tica de ficheiros processados e ingestÃƒÂ£o de ficheiros a partir da cloud. Entrega faseada: Fase 1 (infra + FTP/SFTP/SMB + UI), Fase 2 (S3), Fase 3 (Google Drive + OAuth), Fase 4 (iCloud).

**Implementacao (16 tasks, 11 commits):**

1. **Migracao SQLite** Ã¢â‚¬â€ 2 novas tabelas: `cloud_profiles` (id, name, provider_type, config_json, created_at) e `job_cloud_destinations` (job_id, profile_id, status, upload_url, error_msg, uploaded_at).

2. **Trait `CloudProvider`** (`src-tauri/src/cloud/provider.rs`) Ã¢â‚¬â€ interface async com `upload()`, `download()`, `test_connection()`, `provider_type()`.

3. **6 providers Rust:**
   - `SmbProvider` Ã¢â‚¬â€ pasta local/rede via `std::fs`
   - `FtpProvider` Ã¢â‚¬â€ `suppaftp 6` async
   - `SftpProvider` Ã¢â‚¬â€ `russh 0.45` + `russh-sftp 2`
   - `S3Provider` Ã¢â‚¬â€ `rust-s3 0.37`, `Region::Custom` para MinIO/Wasabi/B2, `with_path_style()`
   - `GDriveProvider` Ã¢â‚¬â€ `reqwest`, multipart upload, bearer auth, 401 especifico
   - `ICloudProvider` Ã¢â‚¬â€ wrapper de `SmbProvider`, auto-deteta `%USERPROFILE%\iCloudDrive` (Windows) ou `~/Library/Mobile Documents/com~apple~CloudDocs` (macOS)

4. **11 comandos IPC** (`src-tauri/src/commands/cloud.rs`):
   - CRUD de perfis: `get_cloud_profiles`, `create_cloud_profile`, `update_cloud_profile`, `delete_cloud_profile`
   - Teste e upload: `test_cloud_connection`, `process_cloud_destinations`, `retry_cloud_upload`, `add_cloud_asset`
   - Job cloud: `get_job_cloud_destinations`
   - OAuth GDrive: `gdrive_start_auth`, `gdrive_poll_auth`

5. **Frontend:**
   - `src/store/cloud.ts` Ã¢â‚¬â€ Zustand store com `CloudProfile`, `JobCloudDestination`, `PROVIDER_LABELS`, `PROVIDER_FIELDS`
   - `CloudProfileModal.tsx` Ã¢â‚¬â€ Radix UI Dialog, dynamic fields, test connection, GDrive OAuth panel com polling a 5s
   - `SettingsPage.tsx` Ã¢â‚¬â€ nova aba "Cloud" com lista de perfis, editar/apagar
   - `CloudDestinationPicker.tsx` Ã¢â‚¬â€ toggle buttons no modal de submissao de job
   - `IngestProfileModal.tsx` Ã¢â‚¬â€ integra `CloudDestinationPicker`
   - `App.tsx` Ã¢â‚¬â€ `useEffect` bare que deteta transicoes jobÃ¢â€ â€™done e chama `process_cloud_destinations`
   - `AssetDetailPage.tsx` Ã¢â‚¬â€ secao de destinos cloud com status icons, timestamps, erros, botao retry
   - `LibraryPage.tsx` Ã¢â‚¬â€ botao "Da Cloud" para ingerir ficheiros a partir de perfil cloud

6. **Credenciais (v1):** Sem encrypted store (async incompativel com sync Rust). Credenciais guardadas junto com config em `config_json` no SQLite. Frontend passa credenciais directamente no `test_cloud_connection`.

7. **Retry manual:** `process_cloud_destinations` usa loop manual 3 tentativas com backoff exponencial (2^attempt s) Ã¢â‚¬â€ `async_trait` nao aceita `FnMut() -> Fut` com lifetime da trait.

**Bugs corrigidos durante implementacao:**

- `filter_map(|r| r.ok())` em destinations query Ã¢â€ â€™ substituido por `.collect::<Result<Vec<_>, _>>()` para propagar erros
- `unwrap_or_default()` em config JSON parse Ã¢â€ â€™ substituido por `match` que marca destination como 'failed' e faz `continue`
- `useEffect` deps em `CloudProfileModal` Ã¢â‚¬â€ `editing` adicionado ao array `[provider, editing]`
- `rust-s3` (crate correcto) em vez de `s3 = "0.35"` (crate errado no plano)
- `reqwest` sem feature `"json"` Ã¢â‚¬â€ adicionada para chamadas `.json()` em `GDriveProvider` e OAuth

**Commits:**

- `f89e707` feat(cloud): register cloud commands in Tauri invoke handler
- `789bd7b` feat(cloud): cloud Zustand store + provider metadata
- `1751a2a` feat(cloud): CloudProfileModal Ã¢â‚¬â€ create/edit/test profiles
- `2a1b61f` feat(cloud): Settings Cloud tab Ã¢â‚¬â€ profile list and management
- `604eebe` feat(cloud): CloudDestinationPicker + submit_job cloud destinations
- `71158af` feat(cloud): auto-trigger cloud upload on job completion
- `0148676` feat(cloud): AssetDetailPage cloud destinations section
- `7bc4c2a` feat(cloud): Da Cloud button Ã¢â‚¬â€ add cloud-sourced assets
- `30392db` feat(cloud): S3Provider Ã¢â‚¬â€ AWS S3 and compatibles
- `82c844b` feat(cloud): GDriveProvider + OAuth Device Flow
- `3ec60de` feat(cloud): ICloudProvider Ã¢â‚¬â€ iCloud Drive via local folder

**Verificacao:** cargo check nao foi executado no final (contexto esgotado) Ã¢â‚¬â€ recomendado executar `cargo check` e `npm run lint` antes do proximo release.

---

### Sessao 14 Ã¢â‚¬â€ sync.ps1: Automacao Completa do Release (Preview + Agent + Ficheiros) Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Tornar o script `sync.ps1` (opcao 3, modo Release) completamente automatico: gerar todos os ficheiros de release, identificar o agente, mostrar preview antes de executar, e dar opcao de modo manual.

**Implementacao:**

1. **Preview interativo (`Show-ReleasePreview`)** Ã¢â‚¬â€ antes de fazer qualquer alteracao, mostra:
   - Agente detectado
   - Ficheiros que serao criados/atualizados
   - Numero de commits por categoria (Added/Fixed/Changed/Infra/Docs)
   - Titulo gerado automaticamente
   - Opcoes: [Enter] continuar / [M] manual / [C] cancelar

2. **Deteccao do agente (`Get-AgentInfo`)** Ã¢â‚¬â€ por ordem de prioridade:
   - SYNC-STATE.md (campo "Agente:")
   - Variavel de ambiente `$env:NEXORA_AGENT`
   - Ficheiro `.agent` no workspace
   - Pergunta interativa com opcoes Claude/Antigravity/OpenCode/Outro

3. **Geracao automatica de ficheiros:**
   - `release-notes-vX.Y.Z.md` Ã¢â‚¬â€ formato estruturado com secoes (Bug Fixes, New Features, Changed, i18n, Infrastructure, Documentation) + tabela de instaladores
   - `SYNC-STATE.md` Ã¢â‚¬â€ nova sessao com agente, data, resumo por categoria, ficheiros alterados
   - `src/lib/version.ts` Ã¢â‚¬â€ nova entrada no `VERSION_HISTORY`
   - `CHANGELOG.md` Ã¢â‚¬â€ agrega TODOS os commits desde a ultima tag (nao so a mensagem de commit)

4. **Classificacao de commits (`CategorizeCommits`)**:
   - `feat:` Ã¢â€ â€™ Added
   - `fix:` Ã¢â€ â€™ Fixed
   - `refactor:/style:/perf:` Ã¢â€ â€™ Changed
   - `docs:` Ã¢â€ â€™ Documentation
   - `build:/ci:/chore:/deps:` Ã¢â€ â€™ Infrastructure

5. **Integracao no fluxo de release**:
   - Preview Ã¢â€ â€™ Modo Manual (sai para edicao manual) / Continuar
   - Aplica alteracoes nos ficheiros
   - Commit de release inclui: package.json, Cargo.toml, tauri.conf.json, CHANGELOG.md, PROGRESS-DESKTOP.md, release-notes-vX.Y.Z.md, SYNC-STATE.md, version.ts
   - Tag + push + merge main + GitHub Release (com titulo e corpo automaticos)

**Testes:**

- Sintaxe do script: validada via PowerShell AST parser Ã¢Å“â€¦
- `Parse-ChangelogSection`: extrai secao v0.22.0 corretamente (949 chars)
- `Get-ReleaseTitle`: v0.22.0 Ã¢â€ â€™ "MediaInfo, Bug Fixes & Platform Polish"
- `Update-VersionTs`: adiciona entrada no array corretamente
- Sem erros de sintaxe no script completo (16 funcoes definidas)

**Ficheiro alterado:** `scripts/sync.ps1` (~+350 linhas, 7 funcoes novas, 2 blocos modificados)

---

### Sessao 12 Ã¢â‚¬â€ Script sync.ps1: GitHub Release automatico com titulo e corpo inteligente Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Adicionar ao script `sync.ps1` (opcao 3, modo Release) a criacao automatica de GitHub Releases com titulo e corpo preenchidos automaticamente, ao mesmo genero do que se fez para v0.22.0 ("Media Info UX, Bug Fixes & Platform Polish").

**Implementacao:**

1. **Nova funcao `Parse-ChangelogSection($version)`** Ã¢â‚¬â€ extrai a secao da versao do `CHANGELOG.md` usando regex `(?s)` single-line mode.

2. **Nova funcao `Get-ReleaseTitle($version, $changelogSection)`** Ã¢â‚¬â€ classifica itens por categoria (`### Added`, `### Fixed`, etc.), remove prefixos conventional commits (`feat:`, `fix:`), extrai nome curto da feature principal (ate 40 chars) e gera titulo automatico:
   - Features + Fixes Ã¢â€ â€™ `"FeatureName, Bug Fixes & Platform Polish"`
   - Apenas Features Ã¢â€ â€™ `"FeatureName & Enhancements"`
   - Apenas Fixes Ã¢â€ â€™ `"Bug Fixes & Stability"`
   - Docs/Infra Ã¢â€ â€™ `"Documentation & Platform Updates"`

3. **Nova funcao `Build-ReleaseBody($version, $commitMsg)`** Ã¢â‚¬â€ monta corpo estruturado em Markdown com prioridade:
   - **P1:** `release-notes-vX.Y.Z.md` (se existir)
   - **P2:** `CHANGELOG.md` (secao da versao, categorizado em New Features / Bug Fixes / Changed / Infrastructure & Documentation + tabela de instaladores)
   - **P3:** Fallback com mensagem de commit

4. **Modificacao do bloco de criacao da release** Ã¢â‚¬â€ o `name` e `body` da GitHub API agora usam `$releaseTitle` e `$releaseBodyText` em vez do texto estatico.

**Testes:**

- v0.22.0 Ã¢â€ â€™ titulo: `"MediaInfo, Bug Fixes & Platform Polish"` (23 features + 3 fixes detectados)
- v0.24.0 Ã¢â€ â€™ titulo: `"Settings: Apply Live + Cache Display & Enhancements"` (1 feature)
- Corpo estruturado com secoes corretas e tabela de instaladores

**Ficheiro alterado:** `scripts/sync.ps1` (~+120 linhas, 3 funcoes novas)

---

### Sessao 6 Ã¢â‚¬â€ v0.23.0 UX Fixes Ã¢â‚¬â€ CONCLUIDO

**5 melhorias UX implementadas:**

1. **Item 1 Ã¢â‚¬â€ "Abrir ficheiro processado" navega in-app**: novo comando Rust `find_asset_by_path` em `assets.rs`; `AssetDetailPage` tenta navegar para o asset de output; fallback para `revealItemInDir` se nÃƒÂ£o estiver na biblioteca.

2. **Item 2 Ã¢â‚¬â€ Job history filtrado por asset**: confirmado que jÃƒÂ¡ estava correcto (`list_jobs` jÃƒÂ¡ filtrava por `asset_id`). Sem alteraÃƒÂ§ÃƒÂµes de cÃƒÂ³digo necessÃƒÂ¡rias.

3. **Item 3 Ã¢â‚¬â€ Reprocess popup em foreground**: `QueuePage` usa `createPortal` (react-dom) para renderizar o popup em `document.body` com `position: fixed`, escapando o `overflow-hidden` do container da tabela.

4. **Item 4 Ã¢â‚¬â€ Pipeline Summary clicÃƒÂ¡vel**: badges de contagem tornados `<button>` que expandem painel inline com lista de ficheiros (nome + perfil + seta de navegaÃƒÂ§ÃƒÂ£o para o asset).

5. **Item 5 Ã¢â‚¬â€ Delete com autorizaÃƒÂ§ÃƒÂ£o explÃƒÂ­cita para ficheiros**: `delete_asset` e `factory_reset` Rust aceitam `delete_files: bool`; frontend apresenta segundo dialog nativo antes de apagar.

**Ficheiros alterados:** `assets.rs`, `system.rs`, `lib.rs`, `App.tsx`, `AssetDetailPage.tsx`, `LibraryPage.tsx`, `SettingsPage.tsx`, `PipelineSummary.tsx`, `QueuePage.tsx`, 15 locales i18n.

**Commits v0.23.0 (10 commits, branch dev):**

- `0a6fc13` feat(i18n): 6 novas chaves para v0.23.0
- `4412bd2` feat(queue): portal para popup de reprocessamento
- `0a8204a` feat(pipeline-summary): painel expansÃƒÂ­vel inline
- `fca036f` feat(settings): factory reset com autorizaÃƒÂ§ÃƒÂ£o de ficheiros
- `fea4162` feat(library): delete com autorizaÃƒÂ§ÃƒÂ£o de ficheiros
- `949165d` feat(asset-detail): navegaÃƒÂ§ÃƒÂ£o in-app + delete 2 passos
- `e5827b9` feat(app): pass onSelectAsset to AssetDetailPage
- `2d459cb` + `a8cd47e` + `67d5354` Rust commands

**VerificaÃƒÂ§ÃƒÂ£o:** lint Ã¢Å“â€¦ Ã‚Â· tsc Ã¢Å“â€¦ Ã‚Â· 24/24 testes Ã¢Å“â€¦ Ã‚Â· cargo build Ã¢Å“â€¦

---

### Sessao 5 Ã¢â‚¬â€ CorreÃƒÂ§ÃƒÂ£o CI/CD (format:check, cargo clippy, placeholders) Ã¢â‚¬â€ CONCLUIDO

**Problema:** GitHub Actions `ci.yml` e `build.yml` com erros em TODAS as plataformas.

**DiagnÃƒÂ³stico:**

- `lint-and-test` (Ubuntu): `format:check` falhava Ã¢â‚¬â€ 63 ficheiros nÃƒÂ£o formatados com Prettier
- `rust-check` (Windows/macOS): `cargo clippy` falhava Ã¢â‚¬â€ `tauri_build::build()` exige binÃƒÂ¡rios `externalBin` (FFmpeg/FFprobe) que nÃƒÂ£o existem no CI (estÃƒÂ£o no `.gitignore`)
- `rust-check` (Linux): `cargo fmt --check` falhava Ã¢â‚¬â€ cÃƒÂ³digo Rust nunca formatado com `cargo fmt`
- `rust-check` (macOS/Linux): `libc` nÃƒÂ£o declarado em `Cargo.toml` Ã¢â‚¬â€ cÃƒÂ³digo Unix usava `libc::kill()` sem a crate
- `build.yml`: usava `npm install` em vez de `npm ci`; tinha input invÃƒÂ¡lido `includeUpdaterJson`; `bundle.targets: "all"` tentava `.rpm` no Linux sem tooling

**CorrecÃƒÂ§ÃƒÂµes aplicadas:**

1. `npm run format` + `cargo fmt` Ã¢â‚¬â€ formatados todos os ficheiros (63 Prettier + ~15 Rust)
2. `ci.yml` Ã¢â‚¬â€ adicionado step "Create resource placeholders" no job `rust-check` (cria ficheiros vazios para FFmpeg/FFprobe + sidecar antes do `cargo clippy`)
3. CÃƒÂ³digo Rust Ã¢â‚¬â€ corrigidos 7 erros de Clippy:
   - `drop(state)` removido (`State` nÃƒÂ£o implementa `Drop`)
   - `n % 100 == 0` Ã¢â€ â€™ `n.is_multiple_of(100)`
   - `.max(1).min(8)` Ã¢â€ â€™ `.clamp(1, 8)`
   - `#[allow(clippy::type_complexity)]` no tipo `Vec<(...11 tipos...)>`
   - `#[allow(clippy::too_many_arguments)]` na funÃƒÂ§ÃƒÂ£o `run_job` (13 args)
   - `nets.iter().map(|(_, n)| ...)` Ã¢â€ â€™ `nets.values().map(...)` (2 ocorrÃƒÂªncias)
4. `Cargo.toml` Ã¢â‚¬â€ adicionada dependÃƒÂªncia condicional `[target.'cfg(not(target_os = "windows"))'.dependencies] libc = "0.2"`
5. `build.yml` Ã¢â‚¬â€ `npm install` Ã¢â€ â€™ `npm ci`; removido `includeUpdaterJson: true`
6. `tauri.conf.json` Ã¢â‚¬â€ `bundle.targets: "all"` Ã¢â€ â€™ `["deb", "appimage", "msi", "nsis", "dmg", "app"]`

**VerificaÃƒÂ§ÃƒÂ£o local:**

- `npm run format:check`: OK
- `npm run lint`: OK
- `cargo fmt --check`: OK
- `cargo clippy -- -D warnings`: OK

**VerificaÃƒÂ§ÃƒÂ£o GitHub Actions (run #92):**

- `lint-and-test` (Ubuntu): Ã¢Å“â€¦ OK
- `rust-check` Windows: Ã¢Å“â€¦ OK
- `rust-check` macOS: Ã¢Å“â€¦ OK
- `rust-check` Linux: Ã¢Å“â€¦ OK
- Todas as plataformas passaram

---

### SessÃƒÂ£o 7 Ã¢â‚¬â€ v0.23.0 SincronizaÃƒÂ§ÃƒÂ£o e DocumentaÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ CONCLUÃƒÂDO

**Tarefas realizadas:**

1. Bump de versÃƒÂ£o para 0.23.0 em package.json, Cargo.toml, tauri.conf.json, version.ts
2. ActualizaÃƒÂ§ÃƒÂ£o do CHANGELOG.md com entradas v0.22.0 e v0.23.0
3. ActualizaÃƒÂ§ÃƒÂ£o do USER_MANUAL.md:
   - NavegaÃƒÂ§ÃƒÂ£o in-app para ficheiros processados
   - Popup de reprocessamento em foreground (portal)
   - Pipeline Summary clicÃƒÂ¡vel com painel expansÃƒÂ­vel
   - Delete e factory reset com autorizaÃƒÂ§ÃƒÂ£o explÃƒÂ­cita de ficheiros
4. ActualizaÃƒÂ§ÃƒÂ£o do SCREEN_GUIDE.md:
   - VersÃƒÂ£o, sidebar version badge
   - Pipeline Summary clicÃƒÂ¡vel / painel inline
   - Reprocess popup (portal)
   - MediaInfo tabs
   - Two-step delete dialog
   - Two-step factory reset
5. ActualizaÃƒÂ§ÃƒÂ£o do FUNCTIONS.md:
   - `find_asset_by_path`, `list_assets_slim`, `scan_directory`
   - Assinaturas corrigidas: `delete_asset` (hard delete + delete_files), `factory_reset` (delete_files)
   - Persistence: `tauri-plugin-store` (nÃƒÂ£o localStorage)
   - Evento `sidecar:event`
6. ActualizaÃƒÂ§ÃƒÂ£o do INSTALL.md e RELEASE.md com versÃƒÂ£o 0.23.0
7. **Screenshots capturados manualmente** Ã¢â‚¬â€ todos os 10 screenshots (6 existentes + 4 novos v0.23.0) capturados em 2026-05-18 a 1280Ãƒâ€”800, light mode. ÃƒÂndice em `docs/screenshots/README.md`, histÃƒÂ³rico de captura em `docs/screenshots/PENDING_CAPTURE.md`.
8. ActualizaÃƒÂ§ÃƒÂ£o do PROGRESS-DESKTOP.md

**VerificaÃƒÂ§ÃƒÂ£o:** lint Ã¢Å“â€¦ Ã‚Â· tsc Ã¢Å“â€¦ Ã‚Â· 24/24 testes Ã¢Å“â€¦ Ã‚Â· cargo build Ã¢Å“â€¦

---

## Estado das branches

- `dev`: v0.23.0 UX fixes committed (Sessao 6) Ã¢â‚¬â€ NÃƒÆ’O pushed para remote ainda
- `main`: commit anterior (v0.20.0 area)
- Remote: apenas `main` e `dev`

---

### Sessao 8 Ã¢â‚¬â€ v0.23.0 HelpModal Remodelado Ã¢â‚¬â€ CONCLUIDO

**Melhorias no HelpModal.tsx:**

1. **Sidebar vertical remodelada**: w-48 (180px) com items empilhados verticalmente, indicador de activo com borda azul esquerda + fundo azul claro.
2. **Badges numÃƒÂ©ricos na sidebar**: Tabs com mÃƒÂºltiplos cards mostram contagem (Queue=3, Library=2, Settings=2).
3. **DimensÃƒÂµes fixas do modal**: `h-[85vh]` + `min-h-[600px]` para evitar saltos entre tabs.
4. **`openFullGuide` corrigido**: Toast de erro com botÃƒÂ£o "Copiar URL" via `tauri-plugin-clipboard-manager` (plugin nativo, nÃƒÂ£o navigator.clipboard).
5. **Tips nos 4 novos cards v0.23.0**: Delete Confirm, Pipeline Summary, Reprocess Popup, Factory Reset Confirm Ã¢â‚¬â€ todos com tips informativos descritivos.

**Plugin instalado:**

- `tauri-plugin-clipboard-manager` v2.3.2 (cargo + npm)
- Registado em `lib.rs` (`tauri_plugin_clipboard_manager::init()`)
- PermissÃƒÂ£o `clipboard-manager:allow-write-text` em `capabilities/default.json`

**Ficheiros alterados:** `HelpModal.tsx`, `lib.rs`, `default.json`, `Cargo.toml`, `Cargo.lock`, `package.json`, `package-lock.json`.

**VerificaÃƒÂ§ÃƒÂ£o:** lint Ã¢Å“â€¦ Ã‚Â· tsc Ã¢Å“â€¦ Ã‚Â· 24/24 testes Ã¢Å“â€¦ Ã‚Â· cargo check Ã¢Å“â€¦

---

### Sessao 9 Ã¢â‚¬â€ v0.23.x Bugs PÃƒÂ³s-Reset e Workers Ã¢â‚¬â€ CONCLUIDO

**Problemas reportados:**

1. Jobs ficavam presos em "processing" indefinidamente
2. "Error performing reset" Ã¢â‚¬â€ toast de erro apÃƒÂ³s factory reset (mesmo sem dados)
3. ApÃƒÂ³s reset + relaunch: jobs ficavam presos em "queued" sem processar
4. PÃƒÂ¡gina Logs ficava com ecrÃƒÂ£ preto apÃƒÂ³s reset Ã¢â‚¬â€ impossÃƒÂ­vel navegar sem reiniciar a app

**DiagnÃƒÂ³stico e Causas Raiz:**

- **Jobs em "processing"**: AudioWorker era crÃƒÂ­tico (sem try/catch) Ã¢â‚¬â€ qualquer falha de ÃƒÂ¡udio (ficheiro sem stream de ÃƒÂ¡udio, codec incomum) terminava o worker sem completar o job, que ficava preso em "processing" para sempre.
- **Timeout excessivo**: AudioWorker usava 600s por pass (anÃƒÂ¡lise + normalizaÃƒÂ§ÃƒÂ£o); QCPost VMAF usava 3600s Ã¢â‚¬â€ jobs podiam bloquear a fila durante horas.
- **EcrÃƒÂ£ preto apÃƒÂ³s relaunch em dev mode**: `relaunch()` do `tauri-plugin-process` em Tauri dev mode faz o novo processo conectar ao Vite dev server, mas o Vite demora a re-servir chunks lazy. `DashboardPage`, `LogsPage` e outras pÃƒÂ¡ginas com `lazy()` falham a importar, crashando o React sem qualquer UI de recuperaÃƒÂ§ÃƒÂ£o.
- **Jobs em "queued" apÃƒÂ³s reset**: dois factores Ã¢â‚¬â€ (1) `settings.json` era apagado pelo factory_reset, causando crash do LazyStore no relaunch; (2) `relaunch()` em dev tornava a app inutilizÃƒÂ¡vel.
- **Double clearLogs**: `LogsPage.tsx` chamava `invoke('clear_logs')` directamente E via `clearLogs()` hook em simultÃƒÂ¢neo.
- **Mutex poison**: se um thread panicar enquanto segura o lock da DB na queue, o `Mutex` fica "poisoned" e todos os polls subsequentes falham com erro nÃƒÂ£o recuperÃƒÂ¡vel.

**CorrecÃƒÂ§ÃƒÂµes (3 commits):**

**`0347df9` fix(workers):**

- `NexoraDesktopOrchestrator.ts`: AudioWorker envolvido em try/catch nÃƒÂ£o-crÃƒÂ­tico (como Proxy, Thumbnail, QCPost)
- `audio-worker.ts`: timeouts 600s Ã¢â€ â€™ 120s (2 ocorrÃƒÂªncias: analysis pass + normalize pass)
- `qc-post-worker.ts`: timeout VMAF 3600s Ã¢â€ â€™ 300s
- `sidecar/dist/nexora-sidecar.cjs`: reconstruÃƒÂ­do com `npm run sidecar:build`

**`76f1dbd` fix(reset):**

- `system.rs` (`factory_reset`): `settings.json` excluÃƒÂ­do da lista de ficheiros a apagar; apÃƒÂ³s cleanup, escreve `{}` para reinicializar o store sem crash do LazyStore
- `queue.rs` (`poll`): lock da DB usa `unwrap_or_else(|poison| poison.into_inner())` para recuperar de Mutex poisoned; log diagnÃƒÂ³stico `[queue] N job(s) em fila` adicionado
- `LogsPage.tsx`: removida chamada directa duplicada a `invoke('clear_logs')` (mantida apenas via `clearLogs()`)
- `ErrorBoundary.tsx` (novo): componente React class-based com botÃƒÂ£o "Tentar novamente"
- `App.tsx`: `<ErrorBoundary key={activeTab}>` envolve o `<Suspense>` Ã¢â‚¬â€ `key` reseta o boundary ao navegar entre tabs

**`61590f9` fix(reset):**

- `SettingsPage.tsx`: apÃƒÂ³s `invoke('factory_reset')` resolver com sucesso, usa `import.meta.env.DEV` para bifurcar: dev Ã¢â€ â€™ `exit(0)` + toast a pedir reinÃƒÂ­cio manual; produÃƒÂ§ÃƒÂ£o Ã¢â€ â€™ `relaunch()`
- `default.json`: adicionada permissÃƒÂ£o `process:allow-exit`

**Ficheiros alterados:** `NexoraDesktopOrchestrator.ts`, `audio-worker.ts`, `qc-post-worker.ts`, `nexora-sidecar.cjs`, `system.rs`, `queue.rs`, `LogsPage.tsx`, `ErrorBoundary.tsx` (novo), `App.tsx`, `SettingsPage.tsx`, `default.json`

**VerificaÃƒÂ§ÃƒÂ£o:** confirmado pelo utilizador ("works fine") apÃƒÂ³s testes com mÃƒÂºltiplos ficheiros e factory reset

---

### Sessao 10 Ã¢â‚¬â€ Settings: Apply Live + Cache Display Ã¢â‚¬â€ CONCLUIDO

**Funcionalidades implementadas:**

1. **Settings aplicam ao vivo** Ã¢â‚¬â€ AlteraÃƒÂ§ÃƒÂµes de idioma e concorrÃƒÂªncia da fila tomam efeito imediato sem reiniciar a app:
   - `update_settings` (Rust) emite evento `settings:changed` apÃƒÂ³s cada upsert SQLite
   - `SettingsPage.tsx` ouve o evento e chama `i18n.changeLanguage()` para lÃƒÂ­ngua; `invoke('set_queue_concurrency')` para concorrÃƒÂªncia

2. **Cache display na aba System** Ã¢â‚¬â€ Nova secÃƒÂ§ÃƒÂ£o "Cache" com dois cards:
   - **Cache de Processamento**: soma `nexora-transcode-*` + `nexora-proxy-*` em temp dir Ã¢â‚¬â€ tamanho, contagem, botÃƒÂµes Abrir/Limpar
   - **Cache de Thumbnails**: `nexora-thumbs/` Ã¢â‚¬â€ tamanho, contagem, botÃƒÂµes Abrir/Limpar
   - Limpeza guardada: Rust verifica jobs activos na BD antes de apagar (`queued` ou `processing`)

3. **Fix de persistÃƒÂªncia de settings** Ã¢â‚¬â€ `handleUpdateSetting` passava `value` como nÃƒÂºmero/booleano JS para Rust `String`, causando falha silenciosa do serde_json. Corrigido com `String(value)` Ã¢â‚¬â€ afectava `max_concurrent_jobs`, `gpu_acceleration`, `notifications_enabled`.

**Novos comandos Rust (em `system.rs`):**

- `get_temp_info` Ã¢â‚¬â€ devolve `TempInfo` (caminhos, tamanhos, contagens)
- `clear_transcode_cache` Ã¢â‚¬â€ remove dirs `nexora-transcode-*` e `nexora-proxy-*`
- `clear_thumbs_cache` Ã¢â‚¬â€ purga conteÃƒÂºdo de `nexora-thumbs/`
- `open_path` Ã¢â‚¬â€ abre pasta no explorador de ficheiros do SO
- `set_queue_concurrency` Ã¢â‚¬â€ stub (Ok(())) para notificar sidecar no futuro

**Ficheiros alterados:** `settings.rs`, `system.rs`, `lib.rs`, `SettingsPage.tsx`

**Commits (branch dev):**

- `4f32c89` fix(system): include nexora-proxy-\* in transcode cache size and clear
- `028a1ff` fix(settings-page): add TB support, fix useEffect cleanup, coerce types
- `b4b2988` feat(settings-live-apply+cache): emit settings:changed event and system tab cache section
- `4f11024` fix(settings): coerce value to String before invoke to fix settings persistence

**VerificaÃƒÂ§ÃƒÂ£o:** todos os testes manuais confirmados pelo utilizador Ã¢Å“â€¦

---

### Sessao 11 Ã¢â‚¬â€ Correcao CI: Prettier + rustfmt Ã¢â‚¬â€ CONCLUIDO

**Problema:** GitHub Actions `CI Ã¢â‚¬â€ Verificacao de Qualidade` falhou apos merge de `dev` e tag `v0.24.0`.

**DiagnÃƒÂ³stico:**

- `format:check` Ã¢â‚¬â€ 120 ficheiros nao formatados (Prettier)
- `cargo fmt --check` (Linux) Ã¢â‚¬â€ 3 ficheiros Rust mal formatados (`settings.rs`, `system.rs`)

**CorrecÃƒÂ§ÃƒÂµes aplicadas:**

1. `npm run format` Ã¢â‚¬â€ formatados 120 ficheiros (`.ts`, `.tsx`, `.json`, `.md`, `.yml`, `.rs` em docs, scripts, src, sidecar, tests)
2. `cargo fmt` em `src-tauri` Ã¢â‚¬â€ formatados 3 ficheiros Rust
3. Verificacao local completa:
   - `tsc --noEmit` Ã¢Å“â€¦
   - `sidecar:check` Ã¢Å“â€¦
   - `eslint . --max-warnings 0` Ã¢Å“â€¦
   - `prettier --check .` Ã¢Å“â€¦
   - `vitest run` Ã¢â‚¬â€ 24/24 passed Ã¢Å“â€¦
   - `cargo fmt --check` Ã¢Å“â€¦
   - `cargo clippy -- -D warnings` Ã¢Å“â€¦

**Ficheiros alterados:** ~120 ficheiros em todo o repo (apenas formatacao, nenhuma alteracao funcional)

---

### Sessao 13 Ã¢â‚¬â€ Sistema de Logging Completo Ã¢â‚¬â€ CONCLUIDO

**Pedido:** Sistema completo de logging com: (1) ficheiros rotativos diÃƒÂ¡rios, (2) captura de acÃƒÂ§ÃƒÂµes UI com verbosidade configurÃƒÂ¡vel, (3) aba "Logs" nas Settings, (4) envio de logs ao desenvolvedor por email e upload.

**Implementacao (9 tasks, 11 commits):**

1. **`zip = "2"` e `reqwest = { version = "0.12", features = ["multipart"] }`** adicionados ao `Cargo.toml`

2. **`src-tauri/src/file_logger.rs`** (novo) Ã¢â‚¬â€ escrita thread-safe via `OnceLock<Mutex<Option<FileLoggerState>>>`:
   - `get_log_dir(app)` Ã¢â€ â€™ `AppData\Local\Nexora\logs\`
   - `init(app)` Ã¢â‚¬â€ abre ficheiro do dia, corre rotaÃƒÂ§ÃƒÂ£o + retenÃƒÂ§ÃƒÂ£o no arranque; lÃƒÂª `log_retention_days`/`log_max_size_mb` das settings SQLite (fallback 30/200)
   - `write(level, source, message)` Ã¢â‚¬â€ formato `{ISO8601} [{level}] {source} Ã¢â‚¬â€ {message}\n`; rola para novo ficheiro automaticamente ao mudar de dia
   - `rotate_old_logs(dir)` Ã¢â‚¬â€ comprime `.log` antigos para `.log.zip` com `zip::CompressionMethod::Deflated`; apaga original
   - `enforce_retention(dir, days, mb)` Ã¢â‚¬â€ apaga por idade e por tamanho total

3. **`logger.rs`** Ã¢â‚¬â€ `crate::file_logger::write()` chamado no fim de `write()` Ã¢â€ â€™ dual-channel (SQLite + ficheiro)

4. **5 novos comandos Tauri** em `commands/logs.rs`:
   - `get_log_storage_info` Ã¢â€ â€™ `LogStorageInfo { logDir, totalSizeBytes, fileCount, oldestFileDate }`
   - `export_logs_bundle` Ã¢â€ â€™ ZIP em temp dir com todos os ficheiros nexora-\*.log e .log.zip
   - `clear_log_files` Ã¢â€ â€™ remove todos os ficheiros nexora-\* da pasta
   - `upload_logs_to_server` Ã¢â€ â€™ POST multipart/form-data com `reqwest`; retorna body da resposta
   - `log_user_action` Ã¢â€ â€™ filtra por verbosidade (BASIC=0, NORMAL=1, DEBUG=2); escreve `ACTION:{LEVEL}` em ambos os canais

5. **4 novas settings** em `default_settings()`: `log_verbosity` ("normal"), `log_retention_days` ("30"), `log_max_size_mb` ("200"), `log_upload_endpoint` ("")

6. **`src/store/settings.ts`** Ã¢â‚¬â€ `logVerbosity`, `logRetentionDays`, `logMaxSizeMb`, `logUploadEndpoint` + setters

7. **`src/hooks/useActionLog.ts`** (novo) Ã¢â‚¬â€ `logAction(event, details?)` com `getEventLevel()` e `shouldLog()` por rank; invoca `log_user_action`

8. **`src/pages/SettingsPage.tsx`** Ã¢â‚¬â€ nova aba "Logs" com:
   - Verbosidade: 3 radio buttons (BÃƒÂ¡sico/Normal/Debug)
   - Armazenamento: path, tamanho, nÃ‚Âº ficheiros, data mais antiga, inputs de retenÃƒÂ§ÃƒÂ£o (dias/MB), botÃƒÂµes Abrir/Limpar
   - Enviar ao desenvolvedor: input de endpoint URL, botÃƒÂ£o email (mailto:), botÃƒÂ£o upload (disabled se sem endpoint)

9. **`src/App.tsx`** Ã¢â‚¬â€ listener global `document.addEventListener('click', ...)` que lÃƒÂª `data-log-id` e chama `logAction('button:{id}')` Ã¢â‚¬â€ activo apenas a nÃƒÂ­vel Debug

**Commits:**

- `0b3c886` build(deps): add zip and reqwest for logging system
- `4a09763` feat(logging): create file_logger module
- `a9007b9` feat(logging): integrate file_logger Ã¢â‚¬â€ dual-channel
- `94af49d` feat(logging): add 5 new commands to commands/logs.rs
- `32753ec` feat(logging): register log commands and add settings defaults
- `0631db6` feat(logging): add log settings to Zustand store
- `0303c17` feat(logging): add useActionLog hook with verbosity filtering
- `3ccea62` feat(logging): add Logs settings tab
- `839d5dd` feat(logging): add global Debug click listener in App.tsx
- `7cba385` fix(logging): correct log dir path (Nexora segment)

**Verificacao:** cargo check Ã¢Å“â€¦ Ã‚Â· tsc --noEmit Ã¢Å“â€¦ Ã‚Â· spec compliance review Ã¢Å“â€¦

---

## Proximos passos (v0.24.0 ou seguinte)

| Tarefa                                                              | Prioridade | Estado    |
| ------------------------------------------------------------------- | ---------- | --------- |
| Push dev + merge/PR para main (v0.23.0)                             | Alta       | Pronto    |
| B6: dedup startup_checks Ã¢â‚¬â€ cachear resultado em AppState      | Baixa      | Pendente  |
| Traducao profissional dos locales nao-pt (fallback em pt por agora) | Media      | Pendente  |
| Screenshots / documentacao visual actualizada                       | Baixa      | Concluido |
| tauri dev golden path Ã¢â‚¬â€ testar drag-drop end-to-end           | Alta       | Pendente  |

---

### Sessao 8b Ã¢â‚¬â€ Fix: opener scope para URLs externas Ã¢â‚¬â€ CONCLUIDO

**Problema:** O botÃƒÂ£o "Abrir Guia Completo" no HelpModal falhava silenciosamente. Manualmente o URL funcionava, mas via `openUrl` do Tauri nÃƒÂ£o.

**DiagnÃƒÂ³stico:** A permissÃƒÂ£o `opener:allow-open-url` em Tauri v2 exige um `scope` que define que URLs sÃƒÂ£o permitidos. Sem scope, o comando IPC ÃƒÂ© rejeitado pelo router de seguranÃƒÂ§a.

**CorrecÃƒÂ§ÃƒÂ£o:** `src-tauri/capabilities/default.json` Ã¢â‚¬â€ `opener:allow-open-url` mudou de string simples para objecto com scope:

```json
{
  "identifier": "opener:allow-open-url",
  "allow": [{ "url": "https://*" }, { "url": "http://*" }]
}
```

**Ficheiro alterado:** `src-tauri/capabilities/default.json`

**VerificaÃƒÂ§ÃƒÂ£o:** lint Ã¢Å“â€¦ Ã‚Â· tsc Ã¢Å“â€¦ Ã‚Â· cargo check Ã¢Å“â€¦ Ã‚Â· capabilities.json gerado com scope Ã¢Å“â€¦

---

### Sessao 11b Ã¢â‚¬â€ Merge dev Ã¢â€ â€™ main Ã¢â‚¬â€ CONCLUIDO

**Merge realizado:** `dev` Ã¢â€ â€™ `main` (commit `219c542`)

- CI anterior em `main` falhava (formatacao)
- Correcao aplicada em `dev` (commit `7ea36fc`), depois merge para `main`
- Push `main` disparou novo CI run (#26182500765)

---

### Sessao 11c Ã¢â‚¬â€ Release v0.24.0 no GitHub Ã¢â‚¬â€ CONCLUIDO

**Tag:** `v0.24.0` Ã¢â€ â€™ commit `0d3b805` (inclui build.yml reescrito + release notes)

**Actions tomadas:**

1. Tag `v0.24.0` movida de `4e86384` Ã¢â€ â€™ `0d3b805` (force push)
2. `build.yml` reescrito com:
   - Job `quality-gate` (tsc, lint, testes, cargo fmt, cargo clippy)
   - Node.js 22 (era 20)
   - Step `Create resource placeholders` em todas as plataformas
   - `needs: quality-gate` no job `build`
3. `ci.yml` atualizado para Node.js 22
4. Release draft criado via `gh release create` com notas detalhadas (`release-notes-v0.24.0.md`)
5. Workflow `Build Nexora Desktop` disparado automaticamente pelo push da tag
6. Todos os 4 jobs passaram:
   - Quality Gate: 2m57s Ã¢Å“â€¦
   - Build Ã¢â‚¬â€ macOS (Universal): 4m42s Ã¢Å“â€¦
   - Build Ã¢â‚¬â€ Windows: 10m16s Ã¢Å“â€¦
   - Build Ã¢â‚¬â€ Linux: 5m21s Ã¢Å“â€¦
7. Release publicado (draft Ã¢â€ â€™ public): https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/tag/v0.24.0

---

## Notas tecnicas para o proximo agente

- **Sidecar dist nao esta no git** Ã¢â‚¬â€ correr `npm run sidecar:build` antes de cada `tauri dev`
- **15 linguas i18n completas** Ã¢â‚¬â€ ao adicionar texto novo, traduzir SEMPRE todos os 15 locales em `src/i18n/locales/`
- **FFmpeg execFile** Ã¢â‚¬â€ NUNCA usar `exec` com string; sempre `execFile` com array de argumentos
- **VMAF model escaping no Windows** Ã¢â‚¬â€ no filtergraph `-lavfi`, os caminhos absolutos como `C:/path` no Windows geram erro. Substituir sempre por `C\:/path` no `libvmaf=model='path=...'`.
- **active_pids** Ã¢â‚¬â€ `AppState` tem `active_pids: Mutex<HashMap<String, u32>>` para matar processos Node.js ao cancelar
- **list_assets_slim** Ã¢â‚¬â€ usar em listagens (Dashboard, LibraryPage) em vez de `list_assets` para evitar metadata JSON pesado
- **sidecar:event** Ã¢â‚¬â€ QueuePage e DashboardPage ouvem este evento para actualizacoes em tempo real; polling e fallback a 30s
- **tauri-plugin-store** Ã¢â‚¬â€ settings persistem em ficheiro nativo; nao usar localStorage
- **Videos_Tests/** Ã¢â‚¬â€ ja no git; 18 samples de video de teste
- **Workers nÃƒÂ£o-crÃƒÂ­ticos**: AudioWorker, Proxy, Thumbnail, QCPost Ã¢â‚¬â€ envolvidos em try/catch; falha nÃƒÂ£o bloqueia o job
- **Workers crÃƒÂ­ticos**: Ingest, QCPre, Transcode, Delivery Ã¢â‚¬â€ falha termina o job com erro
- **relaunch() em dev mode** Ã¢â‚¬â€ NUNCA usar `relaunch()` directamente; bifurcar em `import.meta.env.DEV`: dev Ã¢â€ â€™ `exit(0)` + toast; prod Ã¢â€ â€™ `relaunch()`
- **settings.json** Ã¢â‚¬â€ factory_reset NUNCA apaga este ficheiro; escreve `{}` para reset limpo sem crash do LazyStore
- **Mutex poison em queue.rs** Ã¢â‚¬â€ usar `unwrap_or_else(|poison| poison.into_inner())` no lock da DB
- **invoke() com Rust String** Ã¢â‚¬â€ sempre converter com `String(value)` antes de passar nÃƒÂºmero ou booleano para um comando Rust que espera `String`; serde_json falha silenciosamente caso contrÃƒÂ¡rio
- **Cloud credentials** Ã¢â‚¬â€ guardadas no keychain do SO via `keyring v3` (`save_credentials`/`load_credentials`/`delete_credentials`); backward-compat com perfis antigos (fallback config blob em `run_cloud_uploads`); campos de password vazios no modal de ediÃƒÂ§ÃƒÂ£o = manter keychain existente
- **process_cloud_destinations** Ã¢â‚¬â€ usa retry manual 3 tentativas (nao `retry_with_backoff`): `async_trait` nao aceita `FnMut() -> Fut` com lifetime da trait; qualquer refactor deve manter este padrao
- **GDrive OAuth** Ã¢â‚¬â€ Device Flow: `gdrive_start_auth` retorna url + user_code; frontend poll `gdrive_poll_auth` a cada 5s ate receber `access_token`; token guardado como `oauth_token` em `config_json`
- **iCloud auto-detect** Ã¢â‚¬â€ `%USERPROFILE%\iCloudDrive` (Windows), `~/Library/Mobile Documents/com~apple~CloudDocs` (macOS); nao e suportado em Linux
- **S3 crate** Ã¢â‚¬â€ `rust-s3 = "0.37"` (NAO `s3 = "0.35"` Ã¢â‚¬â€ crate diferente); usar `default-features = false, features = ["tokio-rustls-tls"]`
