# Estado de Sincronização — Nexora Desktop

> Handoff entre Claude Code e Google Antigravity.
> Actualizar no FIM de cada sessão. Lido no INÍCIO de cada sessão.

---

Actualizado: 2026-05-10
Agente: Claude Sonnet 4.6

## O que foi feito

### Prompt Desktop 5 — Bug fixes + Gap Analysis — Concluído

Todos os 7 passos do plano Claude Code executados e validados (`cargo check` + `sidecar:check` limpos):

**Passo 1 — A2 · sidecar.rs corrigido**
- Substituído: tentativa de executável nativo `binaries/nexora-sidecar-{OS}-{ARCH}` (não existia)
- Novo: `Command::new("node").arg(&script_path)` com env `NEXORA_DB_PATH`
- `resolve_script_path()`: fallback em 3 níveis (resource_dir → exe/../../../sidecar/dist → cwd)
- Pré-verifica `node --version` antes do spawn; warn gracioso se sidecar.js não encontrado

**Passo 2 — A1-A · drag-drop activado**
- `tauri.conf.json`: `"dragDropEnabled": false` na janela main
  (Tauri 2.x: desactivar intercepção nativa é obrigatório para HTML5/React onDrop no Windows)
- Capabilities: sem alteração — `drag-drop:default` não existe no ACL do Tauri 2

**Passo 3 — B1-A · comando list_profiles**
- Criado `src-tauri/src/commands/profiles.rs`
- 6 perfis embutidos em compile-time via `include_str!`
- Retorna `Vec<Profile>` com: `id`, `name`, `description`, `container` ("mp4"), `videoCodec`, `resolution`, `fps`, `vmafThreshold`
- Registado em `mod.rs` e `invoke_handler` em `lib.rs`

**Passo 4 — B3-A · react-hot-toast instalado**
- `react-hot-toast@2.6.0` — peer dep `react: ">=16"`, compatível com React 19.1
- Tipos bundled; 0 vulnerabilidades
- Uso: `import { Toaster, toast } from 'react-hot-toast'`

**Passo 5 — B5-A · comando get_stats**
- Adicionado a `system.rs`; retorna `AppStats` com `camelCase` serialization
- 4 queries SQLite: `totalAssets`, `jobsToday` (date atual UTC), `avgVmaf` (apenas scores preenchidos), `activeJobs` (queued + running)
- Disco: lê `app_data_dir()` como caminho de referência, reutiliza `disk_space_impl`; retorna `null` se falhar

**Passo 6 — B7-A · delete_asset + filtro list_assets**
- `delete_asset(id)`: soft delete via `UPDATE assets SET status = 'deleted', updated_at = now`; erro se ID não existir
- `list_assets` sem `status`: exclui automaticamente `status = 'deleted'`; chamada explícita com `status: "deleted"` mostra lixeira
- Registado no `invoke_handler`

**Passo 7 — B8 · delivery-worker.ts — output_dir por perfil**
- Cadeia de prioridade: `output_dir_{profile}` → `output_dir` global → `ctx.outputDir`
- `|| null` em ambas as lookups: strings vazias (default das settings) activam o fallback correctamente
- Exemplo: `update_settings("output_dir_broadcast-hd", "/exports/broadcast")` — sem schema extra

### Sessão anterior — Prompt Desktop 4 — também concluído

CI GitHub Actions v0.3.5: ✓ Windows · ✓ macOS Universal · ✓ Linux
(ver SYNC-STATE sessão anterior para detalhes)

---

---

### Sessão actual — Prompt Desktop 6 — Bug fixes críticos + Dev tooling

**Bug fixes que impediam a aplicação de arrancar:**

**Fix 1 — Sidecar ESM/CJS conflict**
- Sintoma: `ReferenceError: require is not defined in ES module scope` ao arrancar sidecar
- Causa: `package.json` tem `"type": "module"` → Node.js trata `.js` como ESM; esbuild gera CommonJS
- Fix: extensão mudada para `.cjs` em 3 locais: `package.json` (outfile), `sidecar.rs` (3 path candidates), `tauri.conf.json` (bundle resource)
- Verificação: `node sidecar/dist/nexora-sidecar.cjs` → `FATAL: NEXORA_DB_PATH não definido` ✅

**Fix 2 — Ecrã branco/preto (CSS boilerplate Vite)**
- Sintoma: app arranca mas mostra ecrã totalmente branco/preto, sem UI
- Causa 1: `src/index.css` tinha boilerplate Vite: `body { display: flex; place-items: center; }` + `background-color: #242424` que impediam o layout de funcionar
- Fix: reescrito `index.css` — apenas `@import "tailwindcss"`, vars de tema e `html,body,#root { height: 100%; margin: 0; }`
- Causa 2: `DashboardPage.tsx` — interface `AppStats` usava snake_case (`disk_free_gb`) mas Rust envia camelCase (`diskFreeBytes`) devido a `#[serde(rename_all = "camelCase")]` → `undefined.toFixed(1)` → TypeError → React crash
- Fix: interface corrigida; valores derivados computados como `diskFreeGb = (stats?.diskFreeBytes ?? 0) / 1024 ** 3`

**Fix 3 — Erros TypeScript**
- `AssetDetailModal.tsx`: `job.audio_lufs` → `job.lufs` (campo correcto na interface Job)
- `HistoryPage.tsx`: `Download` removido de import lucide-react (não usado)
- `App.tsx`: chamada duplicada `getDiskSpace(outputDir)` (sem objecto) removida; mantida apenas `getDiskSpace({ path: outputDir })`
- `DashboardPage.tsx`: `job.progress * 100` para ProgressBar (DB armazena 0.0–1.0, componente espera 0–100)

**Dev tooling — scripts/06-run-dev.ps1 reescrito**
- Menu interactivo (opções 1-8 + 0 Sair) quando executado sem parâmetros
- Parâmetros: `-Dev`, `-Clean`, `-Full`, `-Nuclear`, `-Sidecar`, `-TypeCheck`, `-Test`, `-Info`
- Aliases curtos: `-h`/`--help` → `-Info`, `-d`, `-c`, `-f`, `-n`, `-s`, `-tc`, `-t`
- Combinações: `-Clean -Dev`, `-Sidecar -Dev`, `-Nuclear -Dev`, `-TypeCheck -Test`
- `-Nuclear`: remove node_modules + target + dist + gen + sidecar/dist, reinstala npm, reconstrói sidecar
- Funções prefixadas `nx` para evitar conflitos com PowerShell built-ins
- Testado: `-Info`, `-h`, `-Clean` ✅

## Estado de compilação (actualizado)

- `cargo check`: OK
- `npm run typecheck`: OK — 0 erros
- `npm run sidecar:check`: OK
- `npm test` (vitest): OK — 24 testes passam
- `node sidecar/dist/nexora-sidecar.cjs`: OK (sem erro ESM)
- CI GitHub Actions: v0.3.5 ✓ Windows · ✓ macOS · ✓ Linux

## Próximos passos

| Tarefa | Prioridade |
|---|---|
| Implementar **`get_changelog`** em `system.rs` (SettingsPage consome-o) | Média |
| Verificar `list_jobs` aceita filtro `asset_id` (AssetDetailModal passa-o) | Média |
| Teste end-to-end: ingest → processamento → histórico → detalhe | Alta |
| Auto-updater Tauri (ADR D009) | Baixa |

---

## Ficheiros criados/modificados (sessões anteriores)

```
src-tauri/src/commands/profiles.rs      (novo — list_profiles, 6 perfis embed)
src-tauri/src/commands/assets.rs        (delete_asset + filtro list_assets)
src-tauri/src/commands/system.rs        (get_stats + AppStats)
src-tauri/src/commands/mod.rs           (pub mod profiles)
src-tauri/src/lib.rs                    (list_profiles, get_stats, delete_asset)
src-tauri/src/sidecar.rs               (reescrito — node sidecar.cjs, 3-level path)
src-tauri/tauri.conf.json              (dragDropEnabled: false, bundle .cjs)
sidecar/workers/delivery-worker.ts     (output_dir_{profile} priority)
package.json                           (react-hot-toast; sidecar:build → .cjs)
```

## Ficheiros modificados (sessão actual — Prompt Desktop 6)

```
src/index.css                          (reescrito — removido boilerplate Vite)
src/pages/DashboardPage.tsx            (AppStats interface + derived GB values)
src/components/AssetDetailModal.tsx    (job.audio_lufs → job.lufs)
src/pages/HistoryPage.tsx              (removido import Download não usado)
src/App.tsx                            (removida chamada getDiskSpace duplicada)
scripts/06-run-dev.ps1                 (reescrito — menu interactivo + parâmetros)
```

## Notas técnicas para o próximo agente

- **sidecar .cjs**: extensão `.cjs` é obrigatória — `.js` com `"type":"module"` na raiz causa erro ESM
- **delete_asset**: soft delete — asset fica na DB com `status = 'deleted'`
- **AppStats**: serializada com `#[serde(rename_all = "camelCase")]` → frontend usa camelCase
- **ProgressBar**: espera valor 0–100; `job.progress` na DB é 0.0–1.0 → multiplicar por 100
- **list_profiles**: perfis embutidos compile-time — alterações em `sidecar/profiles/*.json` requerem `cargo build`
- **Versão**: `0.4.0` em `tauri.conf.json` e `package.json`
