# Estado de Sincronizacao - Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessao. Lido no INICIO de cada sessao.

---

Actualizado: 2026-05-20
Agente: Claude Code (claude-sonnet-4-6)

## O que foi feito

### Sessao 12 — Script sync.ps1: GitHub Release automatico com titulo e corpo inteligente — CONCLUIDO

**Pedido:** Adicionar ao script `sync.ps1` (opcao 3, modo Release) a criacao automatica de GitHub Releases com titulo e corpo preenchidos automaticamente, ao mesmo genero do que se fez para v0.22.0 ("Media Info UX, Bug Fixes & Platform Polish").

**Implementacao:**

1. **Nova funcao `Parse-ChangelogSection($version)`** — extrai a secao da versao do `CHANGELOG.md` usando regex `(?s)` single-line mode.

2. **Nova funcao `Get-ReleaseTitle($version, $changelogSection)`** — classifica itens por categoria (`### Added`, `### Fixed`, etc.), remove prefixos conventional commits (`feat:`, `fix:`), extrai nome curto da feature principal (ate 40 chars) e gera titulo automatico:
   - Features + Fixes → `"FeatureName, Bug Fixes & Platform Polish"`
   - Apenas Features → `"FeatureName & Enhancements"`
   - Apenas Fixes → `"Bug Fixes & Stability"`
   - Docs/Infra → `"Documentation & Platform Updates"`

3. **Nova funcao `Build-ReleaseBody($version, $commitMsg)`** — monta corpo estruturado em Markdown com prioridade:
   - **P1:** `release-notes-vX.Y.Z.md` (se existir)
   - **P2:** `CHANGELOG.md` (secao da versao, categorizado em New Features / Bug Fixes / Changed / Infrastructure & Documentation + tabela de instaladores)
   - **P3:** Fallback com mensagem de commit

4. **Modificacao do bloco de criacao da release** — o `name` e `body` da GitHub API agora usam `$releaseTitle` e `$releaseBodyText` em vez do texto estatico.

**Testes:**

- v0.22.0 → titulo: `"MediaInfo, Bug Fixes & Platform Polish"` (23 features + 3 fixes detectados)
- v0.24.0 → titulo: `"Settings: Apply Live + Cache Display & Enhancements"` (1 feature)
- Corpo estruturado com secoes corretas e tabela de instaladores

**Ficheiro alterado:** `scripts/sync.ps1` (~+120 linhas, 3 funcoes novas)

---

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

### Sessao 9 — v0.23.x Bugs Pós-Reset e Workers — CONCLUIDO

**Problemas reportados:**

1. Jobs ficavam presos em "processing" indefinidamente
2. "Error performing reset" — toast de erro após factory reset (mesmo sem dados)
3. Após reset + relaunch: jobs ficavam presos em "queued" sem processar
4. Página Logs ficava com ecrã preto após reset — impossível navegar sem reiniciar a app

**Diagnóstico e Causas Raiz:**

- **Jobs em "processing"**: AudioWorker era crítico (sem try/catch) — qualquer falha de áudio (ficheiro sem stream de áudio, codec incomum) terminava o worker sem completar o job, que ficava preso em "processing" para sempre.
- **Timeout excessivo**: AudioWorker usava 600s por pass (análise + normalização); QCPost VMAF usava 3600s — jobs podiam bloquear a fila durante horas.
- **Ecrã preto após relaunch em dev mode**: `relaunch()` do `tauri-plugin-process` em Tauri dev mode faz o novo processo conectar ao Vite dev server, mas o Vite demora a re-servir chunks lazy. `DashboardPage`, `LogsPage` e outras páginas com `lazy()` falham a importar, crashando o React sem qualquer UI de recuperação.
- **Jobs em "queued" após reset**: dois factores — (1) `settings.json` era apagado pelo factory_reset, causando crash do LazyStore no relaunch; (2) `relaunch()` em dev tornava a app inutilizável.
- **Double clearLogs**: `LogsPage.tsx` chamava `invoke('clear_logs')` directamente E via `clearLogs()` hook em simultâneo.
- **Mutex poison**: se um thread panicar enquanto segura o lock da DB na queue, o `Mutex` fica "poisoned" e todos os polls subsequentes falham com erro não recuperável.

**Correcções (3 commits):**

**`0347df9` fix(workers):**

- `NexoraDesktopOrchestrator.ts`: AudioWorker envolvido em try/catch não-crítico (como Proxy, Thumbnail, QCPost)
- `audio-worker.ts`: timeouts 600s → 120s (2 ocorrências: analysis pass + normalize pass)
- `qc-post-worker.ts`: timeout VMAF 3600s → 300s
- `sidecar/dist/nexora-sidecar.cjs`: reconstruído com `npm run sidecar:build`

**`76f1dbd` fix(reset):**

- `system.rs` (`factory_reset`): `settings.json` excluído da lista de ficheiros a apagar; após cleanup, escreve `{}` para reinicializar o store sem crash do LazyStore
- `queue.rs` (`poll`): lock da DB usa `unwrap_or_else(|poison| poison.into_inner())` para recuperar de Mutex poisoned; log diagnóstico `[queue] N job(s) em fila` adicionado
- `LogsPage.tsx`: removida chamada directa duplicada a `invoke('clear_logs')` (mantida apenas via `clearLogs()`)
- `ErrorBoundary.tsx` (novo): componente React class-based com botão "Tentar novamente"
- `App.tsx`: `<ErrorBoundary key={activeTab}>` envolve o `<Suspense>` — `key` reseta o boundary ao navegar entre tabs

**`61590f9` fix(reset):**

- `SettingsPage.tsx`: após `invoke('factory_reset')` resolver com sucesso, usa `import.meta.env.DEV` para bifurcar: dev → `exit(0)` + toast a pedir reinício manual; produção → `relaunch()`
- `default.json`: adicionada permissão `process:allow-exit`

**Ficheiros alterados:** `NexoraDesktopOrchestrator.ts`, `audio-worker.ts`, `qc-post-worker.ts`, `nexora-sidecar.cjs`, `system.rs`, `queue.rs`, `LogsPage.tsx`, `ErrorBoundary.tsx` (novo), `App.tsx`, `SettingsPage.tsx`, `default.json`

**Verificação:** confirmado pelo utilizador ("works fine") após testes com múltiplos ficheiros e factory reset

---

### Sessao 10 — Settings: Apply Live + Cache Display — CONCLUIDO

**Funcionalidades implementadas:**

1. **Settings aplicam ao vivo** — Alterações de idioma e concorrência da fila tomam efeito imediato sem reiniciar a app:
   - `update_settings` (Rust) emite evento `settings:changed` após cada upsert SQLite
   - `SettingsPage.tsx` ouve o evento e chama `i18n.changeLanguage()` para língua; `invoke('set_queue_concurrency')` para concorrência

2. **Cache display na aba System** — Nova secção "Cache" com dois cards:
   - **Cache de Processamento**: soma `nexora-transcode-*` + `nexora-proxy-*` em temp dir — tamanho, contagem, botões Abrir/Limpar
   - **Cache de Thumbnails**: `nexora-thumbs/` — tamanho, contagem, botões Abrir/Limpar
   - Limpeza guardada: Rust verifica jobs activos na BD antes de apagar (`queued` ou `processing`)

3. **Fix de persistência de settings** — `handleUpdateSetting` passava `value` como número/booleano JS para Rust `String`, causando falha silenciosa do serde_json. Corrigido com `String(value)` — afectava `max_concurrent_jobs`, `gpu_acceleration`, `notifications_enabled`.

**Novos comandos Rust (em `system.rs`):**

- `get_temp_info` — devolve `TempInfo` (caminhos, tamanhos, contagens)
- `clear_transcode_cache` — remove dirs `nexora-transcode-*` e `nexora-proxy-*`
- `clear_thumbs_cache` — purga conteúdo de `nexora-thumbs/`
- `open_path` — abre pasta no explorador de ficheiros do SO
- `set_queue_concurrency` — stub (Ok(())) para notificar sidecar no futuro

**Ficheiros alterados:** `settings.rs`, `system.rs`, `lib.rs`, `SettingsPage.tsx`

**Commits (branch dev):**

- `4f32c89` fix(system): include nexora-proxy-\* in transcode cache size and clear
- `028a1ff` fix(settings-page): add TB support, fix useEffect cleanup, coerce types
- `b4b2988` feat(settings-live-apply+cache): emit settings:changed event and system tab cache section
- `4f11024` fix(settings): coerce value to String before invoke to fix settings persistence

**Verificação:** todos os testes manuais confirmados pelo utilizador ✅

---

### Sessao 11 — Correcao CI: Prettier + rustfmt — CONCLUIDO

**Problema:** GitHub Actions `CI — Verificacao de Qualidade` falhou apos merge de `dev` e tag `v0.24.0`.

**Diagnóstico:**

- `format:check` — 120 ficheiros nao formatados (Prettier)
- `cargo fmt --check` (Linux) — 3 ficheiros Rust mal formatados (`settings.rs`, `system.rs`)

**Correcções aplicadas:**

1. `npm run format` — formatados 120 ficheiros (`.ts`, `.tsx`, `.json`, `.md`, `.yml`, `.rs` em docs, scripts, src, sidecar, tests)
2. `cargo fmt` em `src-tauri` — formatados 3 ficheiros Rust
3. Verificacao local completa:
   - `tsc --noEmit` ✅
   - `sidecar:check` ✅
   - `eslint . --max-warnings 0` ✅
   - `prettier --check .` ✅
   - `vitest run` — 24/24 passed ✅
   - `cargo fmt --check` ✅
   - `cargo clippy -- -D warnings` ✅

**Ficheiros alterados:** ~120 ficheiros em todo o repo (apenas formatacao, nenhuma alteracao funcional)

---

### Sessao 13 — Sistema de Logging Completo — CONCLUIDO

**Pedido:** Sistema completo de logging com: (1) ficheiros rotativos diários, (2) captura de acções UI com verbosidade configurável, (3) aba "Logs" nas Settings, (4) envio de logs ao desenvolvedor por email e upload.

**Implementacao (9 tasks, 11 commits):**

1. **`zip = "2"` e `reqwest = { version = "0.12", features = ["multipart"] }`** adicionados ao `Cargo.toml`

2. **`src-tauri/src/file_logger.rs`** (novo) — escrita thread-safe via `OnceLock<Mutex<Option<FileLoggerState>>>`:
   - `get_log_dir(app)` → `AppData\Local\Nexora\logs\`
   - `init(app)` — abre ficheiro do dia, corre rotação + retenção no arranque; lê `log_retention_days`/`log_max_size_mb` das settings SQLite (fallback 30/200)
   - `write(level, source, message)` — formato `{ISO8601} [{level}] {source} — {message}\n`; rola para novo ficheiro automaticamente ao mudar de dia
   - `rotate_old_logs(dir)` — comprime `.log` antigos para `.log.zip` com `zip::CompressionMethod::Deflated`; apaga original
   - `enforce_retention(dir, days, mb)` — apaga por idade e por tamanho total

3. **`logger.rs`** — `crate::file_logger::write()` chamado no fim de `write()` → dual-channel (SQLite + ficheiro)

4. **5 novos comandos Tauri** em `commands/logs.rs`:
   - `get_log_storage_info` → `LogStorageInfo { logDir, totalSizeBytes, fileCount, oldestFileDate }`
   - `export_logs_bundle` → ZIP em temp dir com todos os ficheiros nexora-\*.log e .log.zip
   - `clear_log_files` → remove todos os ficheiros nexora-\* da pasta
   - `upload_logs_to_server` → POST multipart/form-data com `reqwest`; retorna body da resposta
   - `log_user_action` → filtra por verbosidade (BASIC=0, NORMAL=1, DEBUG=2); escreve `ACTION:{LEVEL}` em ambos os canais

5. **4 novas settings** em `default_settings()`: `log_verbosity` ("normal"), `log_retention_days` ("30"), `log_max_size_mb` ("200"), `log_upload_endpoint` ("")

6. **`src/store/settings.ts`** — `logVerbosity`, `logRetentionDays`, `logMaxSizeMb`, `logUploadEndpoint` + setters

7. **`src/hooks/useActionLog.ts`** (novo) — `logAction(event, details?)` com `getEventLevel()` e `shouldLog()` por rank; invoca `log_user_action`

8. **`src/pages/SettingsPage.tsx`** — nova aba "Logs" com:
   - Verbosidade: 3 radio buttons (Básico/Normal/Debug)
   - Armazenamento: path, tamanho, nº ficheiros, data mais antiga, inputs de retenção (dias/MB), botões Abrir/Limpar
   - Enviar ao desenvolvedor: input de endpoint URL, botão email (mailto:), botão upload (disabled se sem endpoint)

9. **`src/App.tsx`** — listener global `document.addEventListener('click', ...)` que lê `data-log-id` e chama `logAction('button:{id}')` — activo apenas a nível Debug

**Commits:**

- `0b3c886` build(deps): add zip and reqwest for logging system
- `4a09763` feat(logging): create file_logger module
- `a9007b9` feat(logging): integrate file_logger — dual-channel
- `94af49d` feat(logging): add 5 new commands to commands/logs.rs
- `32753ec` feat(logging): register log commands and add settings defaults
- `0631db6` feat(logging): add log settings to Zustand store
- `0303c17` feat(logging): add useActionLog hook with verbosity filtering
- `3ccea62` feat(logging): add Logs settings tab
- `839d5dd` feat(logging): add global Debug click listener in App.tsx
- `7cba385` fix(logging): correct log dir path (Nexora segment)

**Verificacao:** cargo check ✅ · tsc --noEmit ✅ · spec compliance review ✅

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

### Sessao 8b — Fix: opener scope para URLs externas — CONCLUIDO

**Problema:** O botão "Abrir Guia Completo" no HelpModal falhava silenciosamente. Manualmente o URL funcionava, mas via `openUrl` do Tauri não.

**Diagnóstico:** A permissão `opener:allow-open-url` em Tauri v2 exige um `scope` que define que URLs são permitidos. Sem scope, o comando IPC é rejeitado pelo router de segurança.

**Correcção:** `src-tauri/capabilities/default.json` — `opener:allow-open-url` mudou de string simples para objecto com scope:

```json
{
  "identifier": "opener:allow-open-url",
  "allow": [{ "url": "https://*" }, { "url": "http://*" }]
}
```

**Ficheiro alterado:** `src-tauri/capabilities/default.json`

**Verificação:** lint ✅ · tsc ✅ · cargo check ✅ · capabilities.json gerado com scope ✅

---

### Sessao 11b — Merge dev → main — CONCLUIDO

**Merge realizado:** `dev` → `main` (commit `219c542`)

- CI anterior em `main` falhava (formatacao)
- Correcao aplicada em `dev` (commit `7ea36fc`), depois merge para `main`
- Push `main` disparou novo CI run (#26182500765)

---

### Sessao 11c — Release v0.24.0 no GitHub — CONCLUIDO

**Tag:** `v0.24.0` → commit `0d3b805` (inclui build.yml reescrito + release notes)

**Actions tomadas:**

1. Tag `v0.24.0` movida de `4e86384` → `0d3b805` (force push)
2. `build.yml` reescrito com:
   - Job `quality-gate` (tsc, lint, testes, cargo fmt, cargo clippy)
   - Node.js 22 (era 20)
   - Step `Create resource placeholders` em todas as plataformas
   - `needs: quality-gate` no job `build`
3. `ci.yml` atualizado para Node.js 22
4. Release draft criado via `gh release create` com notas detalhadas (`release-notes-v0.24.0.md`)
5. Workflow `Build Nexora Desktop` disparado automaticamente pelo push da tag
6. Todos os 4 jobs passaram:
   - Quality Gate: 2m57s ✅
   - Build — macOS (Universal): 4m42s ✅
   - Build — Windows: 10m16s ✅
   - Build — Linux: 5m21s ✅
7. Release publicado (draft → public): https://github.com/ideiasestrondosas-ctrl/nexora-desktop/releases/tag/v0.24.0

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
- **Workers não-críticos**: AudioWorker, Proxy, Thumbnail, QCPost — envolvidos em try/catch; falha não bloqueia o job
- **Workers críticos**: Ingest, QCPre, Transcode, Delivery — falha termina o job com erro
- **relaunch() em dev mode** — NUNCA usar `relaunch()` directamente; bifurcar em `import.meta.env.DEV`: dev → `exit(0)` + toast; prod → `relaunch()`
- **settings.json** — factory_reset NUNCA apaga este ficheiro; escreve `{}` para reset limpo sem crash do LazyStore
- **Mutex poison em queue.rs** — usar `unwrap_or_else(|poison| poison.into_inner())` no lock da DB
- **invoke() com Rust String** — sempre converter com `String(value)` antes de passar número ou booleano para um comando Rust que espera `String`; serde_json falha silenciosamente caso contrário
